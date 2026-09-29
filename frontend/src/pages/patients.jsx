import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Phone, MapPin, ChevronRight, History, CalendarPlus, Edit2, Trash2, MessageSquare, MoreVertical, Clock, AlertCircle } from "lucide-react";
import PageLayout from "../components/pagelayout.jsx";
import Button from "../components/button.jsx";
import Input, { Select, Textarea } from "../components/input.jsx";
import Badge from "../components/badge.jsx";
import Modal from "../components/modal.jsx";
import EmptyState from "../components/emptystate.jsx";
import Loader from "../components/loader.jsx";
import farmerService from "../services/farmer.service.js";
import dataService from "../services/dataService.js";
import { useSync } from "../hooks/useSync.js";
import { useToast } from "../hooks/useToast.js";
import ToastContainer from "../components/toast.jsx";
import { formatDate, fuzzyMatch } from "../utils/helpers.js";

const CATTLE_BREEDS = [
  "Gir", "Murrah Buffalo", "Sahiwal", "Kankrej", "Jersey Cross",
  "Holstein Cross", "Red Sindhi", "Tharparkar", "Jaffarabadi Buffalo", "Other"
];

const PURPOSE_LIST = ["Dairy", "Breeding", "Dual Purpose", "Draught"];

const EMPTY_FARMER_FORM = {
  name: "",
  mobile: "",
  cowsOwned: 1,
  village: "",
  notes: "",
};

const EMPTY_COW_FORM = {
  tagNumber: "",
  name: "",
  breed: "Gir",
  gender: "Female",
  purpose: "Dairy",
  age: "",
  lactationNumber: 1,
  color: "",
  notes: "",
};

export default function Patients() {
  const { toasts, toast, removeToast } = useToast();
  const { isOnline } = useSync();
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedFarmerId, setExpandedFarmerId] = useState(null);

  // Farmer Modal state
  const [farmerModal, setFarmerModal] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState(null);
  const [farmerForm, setFarmerForm] = useState(EMPTY_FARMER_FORM);
  const [farmerErrors, setFarmerErrors] = useState({});
  const [submittingFarmer, setSubmittingFarmer] = useState(false);

  // Farmer Profile / Detail Modal state
  const [profileFarmer, setProfileFarmer] = useState(null);

  // Add/Edit Cow Modal state
  const [cowModal, setCowModal] = useState(false);
  const [targetFarmerId, setTargetFarmerId] = useState(null);
  const [editingCow, setEditingCow] = useState(null);
  const [cowForm, setCowForm] = useState(EMPTY_COW_FORM);
  const [submittingCow, setSubmittingCow] = useState(false);

  // Quick Insemination Modal state from Farmer row
  const [quickAiModal, setQuickAiModal] = useState(false);
  const [selectedFarmerForAi, setSelectedFarmerForAi] = useState(null);
  const [aiForm, setAiForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    cowCount: 1,
    strawCode: "",
    notes: "",
  });
  const [submittingAi, setSubmittingAi] = useState(false);
  // Saved receipt after quick AI for WhatsApp send
  const [quickAiReceipt, setQuickAiReceipt] = useState(null); // { receiptNumber, whatsappLink }

  // Delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'farmer'|'cow', id, farmerId, name }

  // Mobile Action Sheet state for 3-dot trigger
  const [farmerActionMenu, setFarmerActionMenu] = useState(null);

  const loadFarmers = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const data = await dataService.getFarmers();
      setFarmers(data || []);
    } catch (err) {
      toast.error(err.message || "Failed to load farmers list.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const data = await dataService.getFarmers();
        if (!ignore) setFarmers(data || []);
      } catch (err) {
        if (!ignore) toast.error(err.message || "Failed to load farmers list.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    init();

    const handleSync = () => {
      loadFarmers();
    };
    window.addEventListener("vetassist:sync-completed", handleSync);

    return () => {
      ignore = true;
      window.removeEventListener("vetassist:sync-completed", handleSync);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredFarmers = useMemo(() => {
    return farmers.filter((f) =>
      fuzzyMatch(f, search, ["name", "mobile", "village", "notes"])
    );
  }, [farmers, search]);

  // Farmer Form Validation & Submit
  function openAddFarmer() {
    setEditingFarmer(null);
    setFarmerForm(EMPTY_FARMER_FORM);
    setFarmerErrors({});
    setFarmerModal(true);
  }

  function openEditFarmer(farmer) {
    if (!isOnline) {
      toast.warning("Editing existing farmer records requires an active internet connection.");
      return;
    }
    setEditingFarmer(farmer);
    setFarmerForm({
      name: farmer.name,
      mobile: farmer.mobile,
      cowsOwned: farmer.cowsOwned || (farmer.cows?.length || 0),
      village: farmer.village || "",
      notes: farmer.notes || "",
    });
    setFarmerErrors({});
    setFarmerModal(true);
  }

  function validateFarmer() {
    const errs = {};
    if (!farmerForm.name || !farmerForm.name.trim()) errs.name = "Farmer name is required.";
    const mob = (farmerForm.mobile || "").trim();
    if (!mob) {
      errs.mobile = "Mobile number is required for WhatsApp receipts.";
    } else {
      const cleaned = mob.replace(/[^0-9+]/g, "");
      if (cleaned.length < 10) {
        errs.mobile = "Please enter a valid 10-digit mobile number or full international format (+91...).";
      }
    }
    return errs;
  }

  async function handleSaveFarmer() {
    const errs = validateFarmer();
    if (Object.keys(errs).length) {
      setFarmerErrors(errs);
      return;
    }
    setSubmittingFarmer(true);

    try {
      let mob = farmerForm.mobile.trim();
      const cleaned = mob.replace(/[^0-9+]/g, "");
      if (!cleaned.startsWith("+") && cleaned.length === 10) {
        mob = `+91${cleaned}`;
      }
      const payload = { ...farmerForm, mobile: mob };

      if (editingFarmer) {
        if (!isOnline) {
          toast.error("Editing records requires an active internet connection.");
          return;
        }
        const updatedFarmer = await farmerService.update(editingFarmer.id, payload);
        setFarmers((prev) =>
          prev.map((f) => (f.id === editingFarmer.id ? { ...f, ...updatedFarmer } : f))
        );
        toast.success(`Farmer "${payload.name}" updated successfully.`);
      } else {
        const res = await dataService.createFarmer(payload);
        const newFarmer = res.data;
        setFarmers((prev) => [
          {
            ...newFarmer,
            cows: newFarmer.cows || [],
            inseminations: [],
            _count: { cows: 0, inseminations: 0 },
            syncStatus: res.isOffline ? "pending" : "synced",
          },
          ...prev,
        ]);
        if (res.isOffline) {
          toast.info("Saved on this phone. It will upload when you're online.");
        } else {
          toast.success(`Farmer "${payload.name}" registered successfully.`);
        }
      }
      setFarmerModal(false);
      loadFarmers();
    } catch (err) {
      toast.error(err.message || "Failed to save farmer record.");
    } finally {
      setSubmittingFarmer(false);
    }
  }

  // Cow Form Validation & Submit
  function openAddCow(farmerId) {
    if (!isOnline) {
      toast.warning("Registering individual tagged cows requires an active internet connection.");
      return;
    }
    setTargetFarmerId(farmerId);
    setEditingCow(null);
    setCowForm(EMPTY_COW_FORM);
    setCowModal(true);
  }

  function openEditCow(farmerId, cow) {
    if (!isOnline) {
      toast.warning("Editing cattle details requires an active internet connection.");
      return;
    }
    setTargetFarmerId(farmerId);
    setEditingCow(cow);
    setCowForm({
      tagNumber: cow.tagNumber || "",
      name: cow.name || "",
      breed: cow.breed || "Gir",
      gender: cow.gender || "Female",
      purpose: cow.purpose || "Dairy",
      age: cow.age || "",
      lactationNumber: cow.lactationNumber || 1,
      color: cow.color || "",
      notes: cow.notes || "",
    });
    setCowModal(true);
  }

  async function handleSaveCow() {
    setSubmittingCow(true);
    try {
      if (editingCow) {
        await farmerService.updateCow(targetFarmerId, editingCow.id, cowForm);
        toast.success("Cow details updated.");
      } else {
        await farmerService.addCow(targetFarmerId, cowForm);
        toast.success("New cow registered under farmer.");
      }
      setCowModal(false);
      await loadFarmers();
      if (profileFarmer && profileFarmer.id === targetFarmerId) {
        const refreshed = await farmerService.getById(targetFarmerId);
        setProfileFarmer(refreshed);
      }
    } catch (err) {
      toast.error(err.message || "Failed to save cow.");
    } finally {
      setSubmittingCow(false);
    }
  }

  // Deletion execution
  async function handleDeleteConfirm() {
    if (!deleteConfirm) return;
    if (!isOnline) {
      toast.error("Deleting records requires an active internet connection.");
      setDeleteConfirm(null);
      return;
    }
    try {
      if (deleteConfirm.type === "farmer") {
        await farmerService.delete(deleteConfirm.id);
        toast.success("Farmer record deleted.");
      } else if (deleteConfirm.type === "cow") {
        await farmerService.deleteCow(deleteConfirm.farmerId, deleteConfirm.id);
        toast.success("Cow record removed.");
      }
      setDeleteConfirm(null);
      await loadFarmers();
      if (profileFarmer && deleteConfirm.type === "cow") {
        const refreshed = await farmerService.getById(profileFarmer.id);
        setProfileFarmer(refreshed);
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete record.");
    }
  }

  // Quick Insemination Modal for this Farmer
  function openQuickAi(farmer) {
    setSelectedFarmerForAi(farmer);
    setAiForm({
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
      cowCount: 1,
      strawCode: "",
      notes: "",
    });
    setQuickAiReceipt(null);
    setQuickAiModal(true);
  }

  async function handleSaveQuickAi(shouldSendWhatsApp = true) {
    if (!selectedFarmerForAi) return;
    setSubmittingAi(true);
    try {
      const res = await dataService.createInsemination({
        farmerId: selectedFarmerForAi.clientId || selectedFarmerForAi.id,
        farmerClientId: selectedFarmerForAi.clientId || undefined,
        farmerName: selectedFarmerForAi.name,
        farmerMobile: selectedFarmerForAi.mobile,
        date: aiForm.date,
        time: aiForm.time,
        cowCount: aiForm.cowCount,
        strawCode: aiForm.strawCode,
        notes: aiForm.notes,
      });

      const savedRecord = res.data;
      const whatsappLink = res.whatsappLink;

      // Store receipt info for the fallback button
      setQuickAiReceipt({
        receiptNumber: savedRecord?.receiptNumber,
        whatsappLink,
        farmerMobile: selectedFarmerForAi.mobile,
        isOffline: res.isOffline,
      });

      if (res.isOffline) {
        toast.info("Saved on this phone. It will upload when you're online.");
      } else {
        toast.success(`Insemination saved! Receipt #${savedRecord?.receiptNumber}.`);
      }
      loadFarmers();

      if (shouldSendWhatsApp && whatsappLink) {
        window.location.href = whatsappLink;
      } else if (!shouldSendWhatsApp) {
        closeQuickAiModal();
      }
    } catch (err) {
      toast.error(err.message || "Failed to record insemination.");
    } finally {
      setSubmittingAi(false);
    }
  }

  function closeQuickAiModal() {
    setQuickAiModal(false);
    setQuickAiReceipt(null);
  }

  async function openFarmerProfile(farmer) {
    try {
      const full = await farmerService.getById(farmer.id);
      setProfileFarmer(full);
    } catch {
      setProfileFarmer(farmer);
    }
  }

  return (
    <PageLayout
      title="Farmers & Cattle Directory"
      subtitle="Farmer-first client records. Expand any farmer to view individual cows and insemination history."
      actions={
        <Button variant="primary" onClick={openAddFarmer}>
          <Plus size={16} /> Register New Farmer
        </Button>
      }
    >
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Search and stats bar */}
      <div
        className="patients-toolbar"
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--color-surface)",
          padding: "0.875rem 1.25rem",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="patients-search-box" style={{ position: "relative", minWidth: 280, flex: 1, maxWidth: 440 }}>
          <Search size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)" }} />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: "2.35rem", width: "100%", fontSize: "16px" }}
            placeholder="Search by farmer name, mobile number, or village..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.875rem", color: "var(--color-text-secondary)", alignItems: "center" }}>
          <Badge variant="primary">{filteredFarmers.length} Farmers</Badge>
          <Badge variant="neutral">
            {filteredFarmers.reduce((sum, f) => sum + (f.cowsOwned || (f.cows?.length || 0)), 0)} Cows Owned
          </Badge>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
          <Loader size="lg" />
        </div>
      ) : filteredFarmers.length === 0 ? (
        <EmptyState
          title={search ? "No matching farmers found" : "No farmers registered yet"}
          text={search ? `No farmers match "${search}". Try searching by village or phone number.` : "Register your first dairy farmer client to begin recording artificial inseminations."}
          emoji="👨‍🌾"
          action={
            <Button variant="primary" onClick={openAddFarmer}>
              <Plus size={16} /> Register Farmer
            </Button>
          }
        />
      ) : (
        <>
          <div className="table-wrapper desktop-only" style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", background: "var(--color-surface)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ width: 40 }}></th>
                <th style={{ textAlign: "left", padding: "0.875rem 1rem" }}>Farmer Name</th>
                <th style={{ textAlign: "left", padding: "0.875rem 1rem" }}>Mobile Number</th>
                <th style={{ textAlign: "left", padding: "0.875rem 1rem" }}>Village / Location</th>
                <th style={{ textAlign: "center", padding: "0.875rem 1rem" }}>Cows Owned</th>
                <th style={{ textAlign: "center", padding: "0.875rem 1rem" }}>Registered Cows</th>
                <th style={{ textAlign: "right", padding: "0.875rem 1rem" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
              {filteredFarmers.map((f, idx) => {
                const isExpanded = expandedFarmerId === f.id;
                const cowCount = f.cows?.length || 0;
                const totalOwned = Math.max(f.cowsOwned || 0, cowCount);

                return (
                  <motion.tr
                    key={f.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.22, delay: Math.min(idx * 0.02, 0.2) }}
                    style={{
                      borderBottom: "1px solid var(--color-border-light)",
                      background: isExpanded ? "var(--color-primary-alpha)" : undefined,
                    }}
                    className="farmer-table-row"
                  >
                    <td colSpan={7} style={{ padding: 0 }}>
                      <div className="farmer-row-card" style={{ display: "flex", alignItems: "center", width: "100%", padding: "0.875rem 1rem" }}>
                        {/* Expand toggle */}
                        <div className="farmer-col-toggle" style={{ width: 32 }}>
                          <button
                            type="button"
                            onClick={() => setExpandedFarmerId(isExpanded ? null : f.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", minWidth: 36, minHeight: 36 }}
                            title={isExpanded ? "Collapse cows" : "Expand registered cows"}
                          >
                            <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronRight size={18} />
                            </motion.div>
                          </button>
                        </div>

                        {/* Farmer Name */}
                        <div className="farmer-col-name" style={{ flex: 2, minWidth: 150 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => openFarmerProfile(f)}
                              style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: "var(--color-text)", fontWeight: 700, fontSize: "0.9375rem" }}
                              className="link-hover"
                            >
                              {f.name}
                            </button>
                            {f.syncStatus === "pending" && (
                              <span className="badge-pending" title="Saved locally on this device. Waiting to upload when online.">
                                <Clock size={11} /> Pending
                              </span>
                            )}
                            {f.syncStatus === "failed" && (
                              <span className="badge-failed" title={f.syncError || "Sync failed"}>
                                <AlertCircle size={11} /> Failed
                              </span>
                            )}
                          </div>
                          {f.notes && (
                            <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                              {f.notes}
                            </p>
                          )}
                        </div>

                        {/* Mobile Number */}
                        <div className="farmer-col-mobile" style={{ flex: 1.5, minWidth: 130 }}>
                          <a href={`tel:${f.mobile}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", color: "var(--color-primary)", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem", minHeight: 44 }}>
                            <Phone size={13} /> {f.mobile}
                          </a>
                        </div>

                        {/* Village */}
                        <div className="farmer-col-village" style={{ flex: 1.5, minWidth: 120, fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                          {f.village ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                              <MapPin size={13} /> {f.village}
                            </span>
                          ) : (
                            <span style={{ opacity: 0.5 }}>—</span>
                          )}
                        </div>

                        {/* Cows Owned */}
                        <div className="farmer-col-cows" style={{ width: 100, textAlign: "center" }}>
                          <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--color-text)" }}>
                            {totalOwned}
                          </span>
                        </div>

                        {/* Registered Individual Cows Badge */}
                        <div className="farmer-col-tags" style={{ width: 130, textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => setExpandedFarmerId(isExpanded ? null : f.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, minHeight: 44, display: "inline-flex", alignItems: "center" }}
                          >
                            <Badge variant={cowCount > 0 ? "success" : "neutral"}>
                              {cowCount} tagged cows
                            </Badge>
                          </button>
                        </div>

                        {/* Action buttons */}
                        <div className="farmer-col-actions" style={{ width: 220, display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openQuickAi(f)}
                            title="Record Insemination for this farmer"
                          >
                            <CalendarPlus size={14} /> New AI
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openFarmerProfile(f)}
                            title="View History & Cows"
                          >
                            <History size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditFarmer(f)}
                            title={!isOnline ? "Editing requires internet connection" : "Edit Farmer"}
                            disabled={!isOnline}
                            style={{ opacity: !isOnline ? 0.45 : 1 }}
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm({ type: "farmer", id: f.id, name: f.name })}
                            title={!isOnline ? "Deleting requires internet connection" : "Delete Farmer"}
                            disabled={!isOnline}
                            style={{ color: "var(--color-danger)", opacity: !isOnline ? 0.45 : 1 }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>

                      {/* Expandable cows sub-table */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            style={{ overflow: "hidden" }}
                          >
                            <div className="farmer-cows-expand" style={{ background: "var(--color-bg-secondary)", padding: "1rem 1.5rem 1.25rem 3.5rem", borderTop: "1px dashed var(--color-border)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                                <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Registered Cattle under {f.name} ({f.cows?.length || 0})
                                </span>
                                <Button size="sm" variant="outline" onClick={() => openAddCow(f.id)}>
                                  <Plus size={13} /> Add Tagged Cow
                                </Button>
                              </div>

                              {(!f.cows || f.cows.length === 0) ? (
                                <div style={{ padding: "1rem", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "0.85rem", background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-light)" }}>
                                  No individual cows registered yet for {f.name}. Farmer owns {f.cowsOwned || 0} cows total.
                                  <button onClick={() => openAddCow(f.id)} style={{ marginLeft: "0.5rem", color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                                    + Add ear-tagged cow
                                  </button>
                                </div>
                              ) : (
                                <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--color-border-light)" }}>
                                  <table className="farmer-cows-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", background: "var(--color-surface)" }}>
                                    <thead>
                                      <tr style={{ background: "var(--color-border-light)", color: "var(--color-text-secondary)", textAlign: "left" }}>
                                        <th style={{ padding: "0.5rem 0.75rem" }}>Tag #</th>
                                        <th style={{ padding: "0.5rem 0.75rem" }}>Name</th>
                                        <th style={{ padding: "0.5rem 0.75rem" }}>Breed</th>
                                        <th style={{ padding: "0.5rem 0.75rem" }}>Purpose</th>
                                        <th style={{ padding: "0.5rem 0.75rem" }}>Lactation #</th>
                                        <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {f.cows.map((cow) => (
                                        <tr key={cow.id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                                          <td style={{ padding: "0.5rem 0.75rem", fontWeight: 700, color: "var(--color-primary)" }}>
                                            {cow.tagNumber || "No Tag"}
                                          </td>
                                          <td style={{ padding: "0.5rem 0.75rem" }}>{cow.name || "—"}</td>
                                          <td style={{ padding: "0.5rem 0.75rem" }}>
                                            <Badge variant="primary">{cow.breed}</Badge>
                                          </td>
                                          <td style={{ padding: "0.5rem 0.75rem" }}>{cow.purpose || "Dairy"}</td>
                                          <td style={{ padding: "0.5rem 0.75rem" }}>{cow.lactationNumber || 1}</td>
                                          <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>
                                            <button
                                              type="button"
                                              onClick={() => openEditCow(f.id, cow)}
                                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", marginRight: "0.5rem" }}
                                              title="Edit Cow"
                                            >
                                              <Edit2 size={13} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setDeleteConfirm({ type: "cow", id: cow.id, farmerId: f.id, name: cow.tagNumber || cow.name || "this cow" })}
                                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-danger)" }}
                                              title="Delete Cow"
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>
                  </motion.tr>
                );
              })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Mobile Compact List View (≤440px) */}
        <div className="mobile-compact-list mobile-only">
          {filteredFarmers.map((f) => {
            const cowCount = f.cows?.length || 0;
            const totalOwned = Math.max(f.cowsOwned || 0, cowCount);
            return (
              <div key={f.id} className="compact-record-row">
                <div
                  className="compact-record-main"
                  onClick={() => openFarmerProfile(f)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") openFarmerProfile(f); }}
                >
                  <div className="compact-record-title" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span>{f.name}</span>
                    {f.syncStatus === "pending" && (
                      <span className="badge-pending" style={{ fontSize: "0.65rem", padding: "1px 5px" }}>
                        <Clock size={9} /> Pending
                      </span>
                    )}
                    {f.syncStatus === "failed" && (
                      <span className="badge-failed" style={{ fontSize: "0.65rem", padding: "1px 5px" }}>
                        <AlertCircle size={9} /> Failed
                      </span>
                    )}
                  </div>
                  <div className="compact-record-sub">
                    <Phone size={11} style={{ flexShrink: 0 }} />
                    <span>{f.mobile}</span>
                    {f.village && <span>· {f.village}</span>}
                  </div>
                </div>
                <div className="compact-record-right">
                  <span className="compact-record-count">
                    {totalOwned} {totalOwned === 1 ? "cow" : "cows"}
                  </span>
                  <button
                    type="button"
                    className="compact-more-btn"
                    onClick={() => setFarmerActionMenu(f)}
                    aria-label={`Actions for ${f.name}`}
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}

      {/* Add / Edit Farmer Modal */}
      {farmerModal && (
        <Modal
          title={editingFarmer ? "Edit Farmer Profile" : "Register New Farmer"}
          onClose={() => setFarmerModal(false)}
          footer={
            <div style={{ display: "flex", gap: "0.75rem", width: "100%", justifyContent: "flex-end" }}>
              <Button variant="outline" type="button" onClick={() => setFarmerModal(false)} style={{ minHeight: 44, flex: 1 }}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" form="farmer-modal-form" disabled={submittingFarmer} style={{ minHeight: 44, flex: 1 }}>
                {submittingFarmer ? "Saving..." : (editingFarmer ? "Save Changes" : "Register Farmer")}
              </Button>
            </div>
          }
        >
          <form id="farmer-modal-form" onSubmit={(e) => { e.preventDefault(); handleSaveFarmer(); }} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Input
              label="Farmer Full Name *"
              placeholder="e.g. Ramesh Patel"
              value={farmerForm.name}
              onChange={(e) => setFarmerForm({ ...farmerForm, name: e.target.value })}
              error={farmerErrors.name}
              autoFocus
            />

            <Input
              label="Mobile Number (WhatsApp) *"
              type="tel"
              inputMode="tel"
              placeholder="e.g. +91 98765 43210 or 10-digit number"
              value={farmerForm.mobile}
              onChange={(e) => setFarmerForm({ ...farmerForm, mobile: e.target.value })}
              error={farmerErrors.mobile}
              helperText="E.164 format. 10-digit Indian numbers will automatically be prefixed with +91."
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="form-grid">
              <Input
                label="Number of Cows Owned"
                type="number"
                inputMode="numeric"
                min="0"
                value={farmerForm.cowsOwned}
                onChange={(e) => setFarmerForm({ ...farmerForm, cowsOwned: e.target.value })}
                helperText="Estimated herd size"
              />
              <Input
                label="Village / Farm Address"
                placeholder="e.g. Mogri Village, Anand"
                value={farmerForm.village}
                onChange={(e) => setFarmerForm({ ...farmerForm, village: e.target.value })}
              />
            </div>

            <Textarea
              label="Notes / Special Instructions"
              placeholder="e.g. Prefers Gir bull semen; milking schedule 6 AM / 6 PM"
              value={farmerForm.notes}
              onChange={(e) => setFarmerForm({ ...farmerForm, notes: e.target.value })}
              rows={3}
            />
          </form>
        </Modal>
      )}

      {/* Add / Edit Cow Modal */}
      {cowModal && (
        <Modal
          title={editingCow ? "Edit Cattle Record" : "Add Individual Cow to Farmer"}
          onClose={() => setCowModal(false)}
          footer={
            <div style={{ display: "flex", gap: "0.75rem", width: "100%", justifyContent: "flex-end" }}>
              <Button variant="outline" type="button" onClick={() => setCowModal(false)} style={{ minHeight: 44, flex: 1 }}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" form="cow-modal-form" disabled={submittingCow} style={{ minHeight: 44, flex: 1 }}>
                {submittingCow ? "Saving..." : (editingCow ? "Update Cow" : "Add Cow")}
              </Button>
            </div>
          }
        >
          <form id="cow-modal-form" onSubmit={(e) => { e.preventDefault(); handleSaveCow(); }} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <Input
                label="Ear Tag Number"
                placeholder="e.g. ET-1001"
                value={cowForm.tagNumber}
                onChange={(e) => setCowForm({ ...cowForm, tagNumber: e.target.value })}
                helperText="Optional official RFID/plastic ear tag"
              />
              <Input
                label="Cow Name / ID"
                placeholder="e.g. Ganga"
                value={cowForm.name}
                onChange={(e) => setCowForm({ ...cowForm, name: e.target.value })}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <Select
                label="Breed"
                value={cowForm.breed}
                onChange={(e) => setCowForm({ ...cowForm, breed: e.target.value })}
                options={CATTLE_BREEDS.map((b) => ({ value: b, label: b }))}
              />
              <Select
                label="Purpose"
                value={cowForm.purpose}
                onChange={(e) => setCowForm({ ...cowForm, purpose: e.target.value })}
                options={PURPOSE_LIST.map((p) => ({ value: p, label: p }))}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <Input
                label="Age (Years)"
                type="number"
                min="1"
                max="25"
                placeholder="e.g. 4"
                value={cowForm.age}
                onChange={(e) => setCowForm({ ...cowForm, age: e.target.value })}
              />
              <Input
                label="Lactation Number"
                type="number"
                min="1"
                max="15"
                value={cowForm.lactationNumber}
                onChange={(e) => setCowForm({ ...cowForm, lactationNumber: e.target.value })}
              />
            </div>

            <Input
              label="Color / Markings"
              placeholder="e.g. Reddish brown with white forehead star"
              value={cowForm.color}
              onChange={(e) => setCowForm({ ...cowForm, color: e.target.value })}
            />

            <Textarea
              label="Medical & Reproductive Notes"
              placeholder="e.g. Easy calver, previous calf delivered March 2025"
              value={cowForm.notes}
              onChange={(e) => setCowForm({ ...cowForm, notes: e.target.value })}
              rows={2}
            />

          </form>
        </Modal>
      )}

      {/* Quick Insemination Modal */}
      {quickAiModal && selectedFarmerForAi && (
        <Modal
          title={`New Insemination for ${selectedFarmerForAi.name}`}
          onClose={closeQuickAiModal}
          footer={
            quickAiReceipt ? (
              <div style={{ display: "flex", gap: "0.75rem", width: "100%", justifyContent: "flex-end" }}>
                <a
                  href={quickAiReceipt.whatsappLink}
                  target="_top"
                  className="btn btn-primary"
                  style={{
                    background: "#25D366",
                    borderColor: "#1ebe5d",
                    color: "#ffffff",
                    minHeight: 44,
                    flex: 2,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  <MessageSquare size={16} /> Open WhatsApp
                </a>
                <Button variant="outline" onClick={closeQuickAiModal} style={{ minHeight: 44, flex: 1 }}>
                  Done
                </Button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem", width: "100%", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Button variant="outline" type="button" onClick={closeQuickAiModal} style={{ minHeight: 44, flex: "1 1 calc(30% - 0.5rem)" }}>
                  Cancel
                </Button>
                <Button variant="secondary" type="button" onClick={() => handleSaveQuickAi(false)} disabled={submittingAi} style={{ minHeight: 44, flex: "1 1 calc(30% - 0.5rem)" }}>
                  Save Only
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  form="quick-ai-form"
                  disabled={submittingAi}
                  style={{
                    background: "#25D366",
                    borderColor: "#1ebe5d",
                    color: "#ffffff",
                    minHeight: 44,
                    flex: "1 1 100%",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    fontWeight: 700,
                  }}
                >
                  <MessageSquare size={16} />
                  <span>{submittingAi ? "Saving..." : "Save & Send on WhatsApp"}</span>
                </Button>
              </div>
            )
          }
        >
          {quickAiReceipt ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "0.5rem 0" }}>
              <div style={{ padding: "1rem", borderRadius: "var(--radius-md)", background: quickAiReceipt.isOffline ? "#fef3c7" : "#dcfce7", color: quickAiReceipt.isOffline ? "#92400e" : "#166534", border: `1px solid ${quickAiReceipt.isOffline ? "#fde68a" : "#bbf7d0"}`, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.95rem" }}>
                  <span>{quickAiReceipt.isOffline ? "💾" : "✅"}</span>
                  <span>
                    {quickAiReceipt.isOffline
                      ? `Insemination Saved on Phone! (Ref #${quickAiReceipt.receiptNumber})`
                      : `Insemination Saved! Receipt #${quickAiReceipt.receiptNumber}`}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", lineHeight: 1.45 }}>
                  {quickAiReceipt.isOffline ? (
                    <>
                      Saved to local database. It will automatically upload when internet signal returns.
                      WhatsApp message with temporary reference is ready for <strong>{quickAiReceipt.farmerMobile}</strong>.
                    </>
                  ) : (
                    <>
                      WhatsApp receipt has been prepared for <strong>{quickAiReceipt.farmerMobile}</strong>. If WhatsApp did not open automatically, tap the button below to deliver it directly.
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <form id="quick-ai-form" onSubmit={(e) => { e.preventDefault(); handleSaveQuickAi(true); }} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ padding: "0.75rem", borderRadius: "var(--radius-md)", background: "var(--color-bg-secondary)", fontSize: "0.875rem", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong>Farmer:</strong> {selectedFarmerForAi.name}
                </div>
                <div>
                  <strong>WhatsApp:</strong> {selectedFarmerForAi.mobile}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="form-grid">
                <Input
                  label="Date *"
                  type="date"
                  value={aiForm.date}
                  onChange={(e) => setAiForm({ ...aiForm, date: e.target.value })}
                />
                <Input
                  label="Time *"
                  type="time"
                  value={aiForm.time}
                  onChange={(e) => setAiForm({ ...aiForm, time: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="form-grid">
                <Input
                  label="Number of Cows Inseminated *"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={aiForm.cowCount}
                  onChange={(e) => setAiForm({ ...aiForm, cowCount: e.target.value })}
                />
                <Input
                  label="Semen / Bull Straw Code"
                  placeholder="e.g. Gir Bull #G-4402"
                  value={aiForm.strawCode}
                  onChange={(e) => setAiForm({ ...aiForm, strawCode: e.target.value })}
                />
              </div>

              <Textarea
                label="Visit Notes"
                placeholder="e.g. Peak estrus, clean cervix, advisory given for 60-day pregnancy check."
                value={aiForm.notes}
                onChange={(e) => setAiForm({ ...aiForm, notes: e.target.value })}
                rows={2}
              />

              <div style={{ padding: "0.75rem", borderRadius: "var(--radius-md)", background: "#dcfce7", color: "#166534", fontSize: "0.8125rem", display: "flex", gap: "0.5rem", alignItems: "center", border: "1px solid #bbf7d0" }}>
                <span>📱</span>
                <span>
                  <strong>One-Tap Delivery:</strong> Tap "Save & Send on WhatsApp" to save permanently and immediately open WhatsApp.
                </span>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Farmer Profile / Full Insemination History Modal */}
      {profileFarmer && (
        <Modal
          title={`Farmer Profile: ${profileFarmer.name}`}
          size="lg"
          onClose={() => setProfileFarmer(null)}
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
              <Button variant="outline" onClick={() => setProfileFarmer(null)} style={{ minHeight: 44, minWidth: 100 }}>
                Close
              </Button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Contact details card */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", padding: "1rem", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-md)" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Mobile Number</span>
                <p style={{ margin: "0.25rem 0 0", fontWeight: 700, fontSize: "1rem", color: "var(--color-primary)" }}>{profileFarmer.mobile}</p>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Village / Farm</span>
                <p style={{ margin: "0.25rem 0 0", fontWeight: 600 }}>{profileFarmer.village || "Not specified"}</p>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Total Cows</span>
                <p style={{ margin: "0.25rem 0 0", fontWeight: 800, fontSize: "1.1rem" }}>{profileFarmer.cowsOwned || 0}</p>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Registered Tagged Cows</span>
                <p style={{ margin: "0.25rem 0 0", fontWeight: 800, fontSize: "1.1rem" }}>{profileFarmer.cows?.length || 0}</p>
              </div>
            </div>

            {/* Insemination History section */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <History size={18} color="var(--color-primary)" /> Past Insemination History
                </h3>
                <Button size="sm" variant="primary" onClick={() => openQuickAi(profileFarmer)}>
                  <CalendarPlus size={14} /> New Insemination
                </Button>
              </div>

              {(!profileFarmer.inseminations || profileFarmer.inseminations.length === 0) ? (
                <div style={{ padding: "2rem", textAlign: "center", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
                  <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>No past insemination records for this farmer yet.</p>
                </div>
              ) : (
                <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ background: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border)", textAlign: "left" }}>
                        <th style={{ padding: "0.625rem 0.75rem" }}>Receipt #</th>
                        <th style={{ padding: "0.625rem 0.75rem" }}>Date &amp; Time</th>
                        <th style={{ padding: "0.625rem 0.75rem" }}>Cows Inseminated</th>
                        <th style={{ padding: "0.625rem 0.75rem" }}>Semen / Bull</th>
                        <th style={{ padding: "0.625rem 0.75rem" }}>WhatsApp Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profileFarmer.inseminations.map((rec) => (
                        <tr key={rec.id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                          <td style={{ padding: "0.625rem 0.75rem", fontWeight: 700, color: "var(--color-primary)" }}>{rec.receiptNumber}</td>
                          <td style={{ padding: "0.625rem 0.75rem" }}>{formatDate(rec.date)} at {rec.time}</td>
                          <td style={{ padding: "0.625rem 0.75rem", fontWeight: 700 }}>{rec.cowCount} cow{rec.cowCount > 1 ? "s" : ""}</td>
                          <td style={{ padding: "0.625rem 0.75rem" }}>{rec.strawCode || "—"}</td>
                          <td style={{ padding: "0.625rem 0.75rem" }}>
                            {rec.whatsappStatus === "sent" ? (
                              <Badge variant="success">Sent ✓</Badge>
                            ) : rec.whatsappStatus === "failed" ? (
                              <Badge variant="danger">Failed</Badge>
                            ) : (
                              <Badge variant="warning">{rec.whatsappStatus || "Pending"}</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          title="Confirm Deletion"
          onClose={() => setDeleteConfirm(null)}
          footer={
            <div style={{ display: "flex", gap: "0.75rem", width: "100%", justifyContent: "flex-end" }}>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} style={{ minHeight: 44, flex: 1 }}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteConfirm} style={{ minHeight: 44, flex: 1 }}>
                Delete Record
              </Button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ margin: 0, fontSize: "0.9375rem" }}>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
              {deleteConfirm.type === "farmer" && " This will also remove any linked cattle and past insemination records for this farmer."}
            </p>
          </div>
        </Modal>
      )}

      {/* Mobile Action Sheet Modal for 3-dot trigger */}
      {farmerActionMenu && (
        <Modal
          title={farmerActionMenu.name}
          onClose={() => setFarmerActionMenu(null)}
          footer={
            <Button variant="outline" onClick={() => setFarmerActionMenu(null)} style={{ width: "100%", minHeight: 44 }}>
              Close
            </Button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
              📱 {farmerActionMenu.mobile} {farmerActionMenu.village ? `· 📍 ${farmerActionMenu.village}` : ""}
            </div>
            <Button
              variant="primary"
              onClick={() => {
                const f = farmerActionMenu;
                setFarmerActionMenu(null);
                openQuickAi(f);
              }}
              style={{ minHeight: 48, justifyContent: "flex-start", gap: "0.75rem" }}
            >
              <CalendarPlus size={18} />
              <span>New Insemination Visit</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const f = farmerActionMenu;
                setFarmerActionMenu(null);
                openFarmerProfile(f);
              }}
              style={{ minHeight: 48, justifyContent: "flex-start", gap: "0.75rem" }}
            >
              <History size={18} />
              <span>View History &amp; Cattle</span>
            </Button>
            <Button
              variant="outline"
              disabled={!isOnline}
              onClick={() => {
                const f = farmerActionMenu;
                setFarmerActionMenu(null);
                openEditFarmer(f);
              }}
              style={{ minHeight: 48, justifyContent: "flex-start", gap: "0.75rem", opacity: !isOnline ? 0.5 : 1 }}
            >
              <Edit2 size={18} />
              <span>Edit Farmer Details {!isOnline ? "(Needs internet)" : ""}</span>
            </Button>
            <Button
              variant="ghost"
              disabled={!isOnline}
              onClick={() => {
                const f = farmerActionMenu;
                setFarmerActionMenu(null);
                setDeleteConfirm({ type: "farmer", id: f.id, name: f.name });
              }}
              style={{ minHeight: 48, justifyContent: "flex-start", gap: "0.75rem", color: "var(--color-danger)", opacity: !isOnline ? 0.5 : 1 }}
            >
              <Trash2 size={18} />
              <span>Delete Farmer {!isOnline ? "(Needs internet)" : ""}</span>
            </Button>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
}
