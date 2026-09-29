import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Printer,
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  MoreVertical,
  AlertCircle,
} from "lucide-react";
import PageLayout from "../components/pagelayout.jsx";
import Button from "../components/button.jsx";
import Input, { Textarea } from "../components/input.jsx";
import Modal from "../components/modal.jsx";
import EmptyState from "../components/emptystate.jsx";
import Loader from "../components/loader.jsx";
import inseminationService from "../services/insemination.service.js";
import settingsService from "../services/settings.service.js";
import dataService from "../services/dataService.js";
import { useSync } from "../hooks/useSync.js";
import { useAuth } from "../hooks/useAuth.js";
import { useToast } from "../hooks/useToast.js";
import ToastContainer from "../components/toast.jsx";
import { formatDate, formatTime, fuzzyMatch } from "../utils/helpers.js";

/**
 * Clean phone number specifically for wa.me deep links (digits only, e.g. 919270034619)
 */
function formatPhoneForWaMe(phone) {
  if (!phone) return "";
  let digits = String(phone).replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `91${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Format receipt text for WhatsApp delivery
 */
function buildReceiptText(record, clinic, fallbackDoctor) {
  const clinicName = clinic?.clinicName || "VetAssist Cattle AI Clinic";
  const doctor = record?.doctorName || fallbackDoctor || clinic?.doctorName || "Doctor";
  const doctorPhone = clinic?.user?.phone || clinic?.phone || "";
  const receiptNo = record?.receiptNumber || "AI-RECEIPT";
  const date = record?.date || "";
  const time = record?.time || "";
  const farmerName = record?.farmerName || record?.farmer?.name || "Farmer";
  const cowCount = record?.cowCount || 1;
  const strawCode = record?.strawCode;
  const notes = record?.notes;

  return (
`🐄 *${clinicName.toUpperCase()}*
*Artificial Insemination Receipt*
----------------------------------------
📄 *Receipt No:* ${receiptNo}
📅 *Date & Time:* ${date} at ${time}
🩺 *Attending Doctor:* ${doctor}
👨‍🌾 *Farmer Name:* ${farmerName}
🐂 *Cows Inseminated:* ${cowCount}
${strawCode ? `🧬 *Semen / Bull:* ${strawCode}\n` : ""}${notes ? `📝 *Notes:* ${notes}\n` : ""}----------------------------------------
✅ Record saved permanently in clinic database.
${doctorPhone ? `📞 Doctor / Clinic Contact: ${doctorPhone}\n` : ""}🙏 Thank you for trusting ${clinicName}!`
  );
}

/**
 * Generate guaranteed wa.me deep link
 */
function getWhatsAppDeepLink(record, clinic, fallbackDoctor) {
  const phone = formatPhoneForWaMe(record?.farmerMobile || record?.farmer?.mobile);
  const text = buildReceiptText(record, clinic, fallbackDoctor);
  if (phone) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Open WhatsApp pre-filled receipt in new window/tab
 */
function openWhatsAppReceipt(record, clinic, fallbackDoctor) {
  const link = getWhatsAppDeepLink(record, clinic, fallbackDoctor);
  // Use direct location assignment — iOS Safari blocks window.open in delayed/non-direct-tap contexts
  window.location.href = link;
}

export default function Inseminations() {
  const { user } = useAuth();
  const { isOnline } = useSync();
  const { toasts, toast, removeToast } = useToast();
  const location = useLocation();

  const [records, setRecords] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedFarmerId, setSelectedFarmerId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // New Insemination Modal
  const [modalOpen, setModalOpen] = useState(() => Boolean(location.state?.openNew));

  useEffect(() => {
    if (location.state?.openNew) {
      window.history.replaceState({}, document.title);
    }
    const handleCustom = () => setModalOpen(true);
    window.addEventListener("open-new-insemination", handleCustom);
    return () => window.removeEventListener("open-new-insemination", handleCustom);
  }, [location.state]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    farmerId: "",
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    cowCount: 1,
    cowTags: "",
    strawCode: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState({});

  // Saved record for WhatsApp send after insemination creation
  const [savedReceiptRecord, setSavedReceiptRecord] = useState(null);
  const [savedWhatsAppLink, setSavedWhatsAppLink] = useState(null);

  // Quick Inline Farmer Creation Modal
  const [newFarmerModal, setNewFarmerModal] = useState(false);
  const [newFarmerForm, setNewFarmerForm] = useState({ name: "", mobile: "", village: "", cowsOwned: 1 });
  const [submittingNewFarmer, setSubmittingNewFarmer] = useState(false);

  // Print Receipt Modal
  const [printRecord, setPrintRecord] = useState(null);

  // Mobile 3-dot action menu for records
  const [insemActionMenu, setInsemActionMenu] = useState(null);

  const loadData = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const [aiData, farmerData, clinicData] = await Promise.all([
        dataService.getInseminations(),
        dataService.getFarmers(),
        settingsService.getSettings().catch(() => null),
      ]);
      setRecords(aiData || []);
      setFarmers(farmerData || []);
      if (clinicData) setClinic(clinicData);
    } catch (err) {
      toast.error(err.message || "Failed to load insemination records.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const [aiData, farmerData, clinicData] = await Promise.all([
          dataService.getInseminations(),
          dataService.getFarmers(),
          settingsService.getSettings().catch(() => null),
        ]);
        if (!ignore) {
          setRecords(aiData || []);
          setFarmers(farmerData || []);
          if (clinicData) setClinic(clinicData);
        }
      } catch (err) {
        if (!ignore) toast.error(err.message || "Failed to load insemination records.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    init();

    const handleSync = () => {
      loadData();
    };
    window.addEventListener("vetassist:sync-completed", handleSync);

    return () => {
      ignore = true;
      window.removeEventListener("vetassist:sync-completed", handleSync);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => !selectedFarmerId || r.farmerId === selectedFarmerId)
      .filter((r) => !startDate || r.date >= startDate)
      .filter((r) => !endDate || r.date <= endDate)
      .filter((r) =>
        fuzzyMatch(r, search, [
          "receiptNumber",
          "farmerName",
          "farmerMobile",
          "strawCode",
          "notes",
          "cowTags",
        ])
      );
  }, [records, selectedFarmerId, startDate, endDate, search]);

  // attendingDoctor computed early so it can be used inside handlers
  const attendingDoctor = user?.name || clinic?.doctorName || "Doctor";

  function openCreateModal() {
    setForm({
      farmerId: farmers.length > 0 ? farmers[0].id : "",
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
      cowCount: 1,
      cowTags: "",
      strawCode: "",
      notes: "",
    });
    setFormErrors({});
    setSavedReceiptRecord(null);
    setSavedWhatsAppLink(null);
    setModalOpen(true);
  }

  function validate() {
    const errs = {};
    if (!form.farmerId) errs.farmerId = "Please select a farmer.";
    if (!form.date) errs.date = "Date is required.";
    if (!form.time) errs.time = "Time is required.";
    if (!form.cowCount || parseInt(form.cowCount, 10) < 1) {
      errs.cowCount = "Number of cows must be at least 1.";
    }
    return errs;
  }

  async function handleSave(shouldSendWhatsApp = true) {
    const errs = validate();
    if (Object.keys(errs).length) {
      setFormErrors(errs);
      return;
    }

    if (shouldSendWhatsApp && selectedFarmer) {
      const cleanPhone = formatPhoneForWaMe(selectedFarmer.mobile);
      if (!cleanPhone || cleanPhone.length < 10) {
        toast.error("Farmer does not have a valid mobile number (10+ digits required for WhatsApp).");
        return;
      }
    }

    setSubmitting(true);

    try {
      const res = await dataService.createInsemination(
        {
          farmerId: form.farmerId,
          farmerClientId: selectedFarmer?.clientId || undefined,
          farmerName: selectedFarmer?.name,
          farmerMobile: selectedFarmer?.mobile,
          date: form.date,
          time: form.time,
          cowCount: form.cowCount,
          cowTags: form.cowTags,
          strawCode: form.strawCode,
          notes: form.notes,
        },
        clinic,
        attendingDoctor
      );

      const savedRecord = res.data;
      const waLink = res.whatsappLink || getWhatsAppDeepLink(savedRecord, clinic, attendingDoctor);

      setSavedReceiptRecord(savedRecord);
      setSavedWhatsAppLink(waLink);

      if (res.isOffline) {
        toast.info("Saved on this phone. It will upload when you're online.");
      } else {
        toast.success(
          `Insemination saved! Receipt #${savedRecord?.receiptNumber || "Record"}.`
        );
      }

      await loadData();

      if (shouldSendWhatsApp && waLink) {
        window.location.href = waLink;
      } else if (!shouldSendWhatsApp) {
        closeSaveModal();
      }
    } catch (err) {
      toast.error(err.message || "Failed to record insemination.");
    } finally {
      setSubmitting(false);
    }
  }

  function closeSaveModal() {
    setModalOpen(false);
    setSavedReceiptRecord(null);
    setSavedWhatsAppLink(null);
  }

  // Quick create farmer inline from modal
  async function handleCreateInlineFarmer() {
    if (!newFarmerForm.name.trim() || !newFarmerForm.mobile.trim()) {
      toast.error("Farmer Name and Mobile Number are required.");
      return;
    }
    setSubmittingNewFarmer(true);
    try {
      const res = await dataService.createFarmer(newFarmerForm);
      const createdFarmer = res.data;
      if (res.isOffline) {
        toast.info("Farmer saved on this phone. It will upload when you're online.");
      } else {
        toast.success(`Farmer "${createdFarmer.name}" registered.`);
      }
      const updatedFarmers = await dataService.getFarmers();
      setFarmers(updatedFarmers || []);
      setForm((prev) => ({ ...prev, farmerId: createdFarmer.clientId || createdFarmer.id }));
      setNewFarmerModal(false);
      setNewFarmerForm({ name: "", mobile: "", village: "", cowsOwned: 1 });
    } catch (err) {
      toast.error(err.message || "Failed to register farmer.");
    } finally {
      setSubmittingNewFarmer(false);
    }
  }

  // Open WhatsApp pre-filled receipt for any existing record — direct user gesture, always works
  function handleSendWhatsApp(rec) {
    const cleanPhone = formatPhoneForWaMe(rec?.farmerMobile || rec?.farmer?.mobile);
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Farmer mobile number is invalid or missing.");
      return;
    }
    openWhatsAppReceipt(rec, clinic, attendingDoctor);
  }

  // Toggle "Marked as sent" status for manual record-keeping
  async function handleToggleSent(id) {
    if (!isOnline) {
      toast.warning("Status updates require an internet connection.");
      return;
    }
    try {
      const res = await inseminationService.toggleSent(id);
      toast.success(res.message || "Status updated.");
      await loadData();
    } catch (err) {
      toast.error(err.message || "Failed to update status.");
    }
  }

  function handlePrintReceipt() {
    window.print();
  }

  const selectedFarmer = farmers.find((f) => f.id === form.farmerId);

  return (
    <PageLayout
      title="Records"
      subtitle="Issue and track bovine inseminations with one-tap WhatsApp receipt delivery and PDF printing."
      actions={
        <Button variant="primary" onClick={openCreateModal}>
          <Plus size={16} /> New Insemination Visit
        </Button>
      }
    >
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Filter and Search Bar */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          alignItems: "center",
          background: "var(--color-surface)",
          padding: "1rem 1.25rem",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div style={{ position: "relative", minWidth: 240, flex: 1 }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "0.875rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-secondary)",
            }}
          />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: "2.35rem", width: "100%" }}
            placeholder="Search receipt #, farmer, notes, straw code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Farmer selector filter */}
        <div style={{ minWidth: 180 }}>
          <select
            className="select"
            value={selectedFarmerId}
            onChange={(e) => setSelectedFarmerId(e.target.value)}
          >
            <option value="">All Farmers ({farmers.length})</option>
            {farmers.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.mobile})
              </option>
            ))}
          </select>
        </div>

        {/* Date filters */}
        <div className="insem-date-filters" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <input
            type="date"
            className="input"
            style={{ padding: "0.45rem 0.65rem", fontSize: "16px", minHeight: "44px" }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Start Date"
          />
          <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>to</span>
          <input
            type="date"
            className="input"
            style={{ padding: "0.45rem 0.65rem", fontSize: "16px", minHeight: "44px" }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="End Date"
          />
        </div>

        {(search || selectedFarmerId || startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setSelectedFarmerId("");
              setStartDate("");
              setEndDate("");
            }}
          >
            Reset
          </Button>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
          <Loader size="lg" />
        </div>
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          title={records.length === 0 ? "No inseminations recorded yet" : "No matching records found"}
          text={
            records.length === 0
              ? "Record your first artificial insemination visit. An official receipt will be generated and sent directly to the farmer's WhatsApp."
              : "Try adjusting your search criteria or date filters."
          }
          emoji="💉"
          action={
            <Button variant="primary" onClick={openCreateModal}>
              <Plus size={16} /> Record Insemination
            </Button>
          }
        />
      ) : (
        <>
          <div
            className="table-wrapper desktop-only"
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
              background: "var(--color-surface)",
              overflow: "hidden",
              boxShadow: "var(--shadow-card)",
            }}
          >
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ textAlign: "left", padding: "0.875rem 1rem" }}>Receipt #</th>
                <th style={{ textAlign: "left", padding: "0.875rem 1rem" }}>Date & Time</th>
                <th style={{ textAlign: "left", padding: "0.875rem 1rem" }}>Farmer Details</th>
                <th style={{ textAlign: "center", padding: "0.875rem 1rem" }}>Cows</th>
                <th style={{ textAlign: "left", padding: "0.875rem 1rem" }}>Semen / Straw</th>
                <th style={{ textAlign: "center", padding: "0.875rem 1rem" }}>WhatsApp Receipt</th>
                <th style={{ textAlign: "right", padding: "0.875rem 1rem" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
              {filteredRecords.map((r, idx) => {
                const isSent = r.whatsappStatus === "sent";

                return (
                  <motion.tr
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.22, delay: Math.min(idx * 0.02, 0.2) }}
                    style={{ borderBottom: "1px solid var(--color-border-light)" }}
                    className="table-hover-row insem-table-row"
                  >
                    {/* Receipt Number */}
                    <td className="insem-col-receipt" style={{ padding: "0.875rem 1rem", fontWeight: 800, color: "var(--color-primary)", fontFamily: "monospace", fontSize: "0.9375rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span>{r.receiptNumber}</span>
                        {r.syncStatus === "pending" && (
                          <span className="badge-pending" title="Saved locally on phone. Waiting to upload when online.">
                            <Clock size={11} /> Pending
                          </span>
                        )}
                        {r.syncStatus === "failed" && (
                          <span className="badge-failed" title={r.syncError || "Sync failed"}>
                            <AlertCircle size={11} /> Failed
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Date and Time */}
                    <td className="insem-col-date" style={{ padding: "0.875rem 1rem", fontSize: "0.875rem" }}>
                      <div style={{ fontWeight: 600 }}>{formatDate(r.date)}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{formatTime(r.time)}</div>
                    </td>

                    {/* Farmer */}
                    <td className="insem-col-farmer" style={{ padding: "0.875rem 1rem" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--color-text)" }}>{r.farmerName}</div>
                      <div style={{ fontSize: "0.775rem", color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <Phone size={12} /> {r.farmerMobile}
                      </div>
                    </td>

                    {/* Cows Inseminated */}
                    <td className="insem-col-cows" style={{ padding: "0.875rem 1rem", textAlign: "center" }}>
                      <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--color-text)" }}>
                        {r.cowCount}
                      </span>
                      {r.cowTags && (
                        <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>
                          ({r.cowTags})
                        </div>
                      )}
                    </td>

                    {/* Semen / Bull */}
                    <td className="insem-col-semen" style={{ padding: "0.875rem 1rem", fontSize: "0.85rem" }}>
                      <div>{r.strawCode || "Standard Stock"}</div>
                      {r.notes && (
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.notes}
                        </div>
                      )}
                    </td>

                    {/* WhatsApp Receipt Action & Manual Status */}
                    <td className="insem-col-whatsapp" style={{ padding: "0.875rem 1rem", textAlign: "center", minWidth: 160 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}>
                        <motion.button
                          type="button"
                          className="btn btn-outline btn-sm insem-wa-btn"
                          whileHover={{ scale: 1.04, boxShadow: "0 4px 12px rgba(37, 211, 102, 0.35)" }}
                          whileTap={{ scale: 0.97 }}
                          style={{
                            background: "#25D366",
                            color: "#ffffff",
                            borderColor: "#1ebe5d",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            fontWeight: 600,
                            padding: "0.35rem 0.75rem",
                            fontSize: "0.8125rem",
                            borderRadius: "var(--radius-md)",
                            cursor: "pointer",
                            minHeight: "44px",
                          }}
                          onClick={() => handleSendWhatsApp(r)}
                          title="Open WhatsApp with pre-filled receipt"
                        >
                          <MessageSquare size={15} />
                          <span>Send Receipt</span>
                        </motion.button>

                        <button
                          type="button"
                          onClick={() => handleToggleSent(r.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "0.25rem 0.5rem",
                            fontSize: "0.75rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            minHeight: "36px",
                          }}
                          title="Click to toggle marked as sent"
                        >
                          {isSent ? (
                            <span style={{ color: "#16a34a", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                              <CheckCircle2 size={12} /> Sent ✓
                            </span>
                          ) : (
                            <span style={{ color: "var(--color-text-secondary)", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                              <Clock size={12} /> Mark as sent
                            </span>
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Actions: View & Print Receipt */}
                    <td className="insem-col-actions" style={{ padding: "0.875rem 1rem", textAlign: "right" }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setPrintRecord(r)}
                        title="View & Print Official Receipt"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                      >
                        <Printer size={13} />
                        <span>Receipt</span>
                      </Button>
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
          {filteredRecords.map((r) => (
            <div key={r.id} className="compact-record-row">
              <div
                className="compact-record-main"
                onClick={() => setPrintRecord(r)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") setPrintRecord(r); }}
              >
                <div className="compact-record-title">{r.farmerName}</div>
                <div className="compact-record-sub" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.25rem" }}>
                  <span>{formatDate(r.date)}</span>
                  <span>·</span>
                  <span>{formatTime(r.time)}</span>
                  <span>·</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{r.receiptNumber}</span>
                  {r.syncStatus === "pending" && (
                    <span className="badge-pending" style={{ fontSize: "0.65rem", padding: "1px 5px", marginLeft: "0.2rem" }}>
                      <Clock size={9} /> Pending
                    </span>
                  )}
                  {r.syncStatus === "failed" && (
                    <span className="badge-failed" style={{ fontSize: "0.65rem", padding: "1px 5px", marginLeft: "0.2rem" }} title={r.syncError}>
                      <AlertCircle size={9} /> Failed
                    </span>
                  )}
                </div>
              </div>
              <div className="compact-record-right">
                <span className="compact-record-count">
                  {r.cowCount} {r.cowCount > 1 ? "cows" : "cow"}
                </span>
                <button
                  type="button"
                  className="compact-wa-btn"
                  onClick={() => handleSendWhatsApp(r)}
                  title="Send Receipt on WhatsApp"
                  aria-label="Send Receipt on WhatsApp"
                >
                  <MessageSquare size={16} />
                </button>
                <button
                  type="button"
                  className="compact-more-btn"
                  onClick={() => setInsemActionMenu(r)}
                  title="More options"
                  aria-label="More options"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {/* New Insemination Modal */}
      {modalOpen && (
        <Modal
          title={savedReceiptRecord ? "Insemination Saved" : "Record Insemination Visit"}
          onClose={closeSaveModal}
          footer={
            savedReceiptRecord ? (
              <div style={{ display: "flex", gap: "0.75rem", width: "100%", justifyContent: "flex-end" }}>
                <Button variant="outline" onClick={closeSaveModal}>
                  Done
                </Button>
                {savedWhatsAppLink && (
                  <a
                    href={savedWhatsAppLink}
                    target="_top"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{
                      background: "#25D366",
                      borderColor: "#1ebe5d",
                      color: "#fff",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontWeight: 600,
                    }}
                  >
                    <MessageSquare size={16} /> Open WhatsApp
                  </a>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", gap: "0.75rem", width: "100%", justifyContent: "flex-end", flexWrap: "wrap" }}>
                <Button variant="outline" onClick={closeSaveModal}>
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={submitting}
                >
                  Save Only
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  form="insem-modal-form"
                  disabled={submitting}
                  style={{
                    background: "#25D366",
                    borderColor: "#1ebe5d",
                    color: "#ffffff",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <MessageSquare size={16} />
                  <span>{submitting ? "Saving..." : "Save & Send on WhatsApp"}</span>
                </Button>
              </div>
            )
          }
        >
          {savedReceiptRecord ? (
            <div style={{ padding: "1.25rem", borderRadius: "var(--radius-md)", background: savedReceiptRecord.syncStatus === "pending" ? "#fef3c7" : "#dcfce7", color: savedReceiptRecord.syncStatus === "pending" ? "#92400e" : "#166534", border: `1px solid ${savedReceiptRecord.syncStatus === "pending" ? "#fde68a" : "#bbf7d0"}`, display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "1rem" }}>
                <span>{savedReceiptRecord.syncStatus === "pending" ? "💾" : "✅"}</span>
                <span>
                  {savedReceiptRecord.syncStatus === "pending"
                    ? `Insemination saved on phone! (Ref #${savedReceiptRecord.receiptNumber})`
                    : `Insemination saved! Receipt #${savedReceiptRecord.receiptNumber}`}
                </span>
              </div>
              <div style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>
                {savedReceiptRecord.syncStatus === "pending" ? (
                  <>
                    The record is saved securely on this device and will automatically upload once an internet connection is established. An official permanent receipt number will be issued after synchronization. If WhatsApp did not open automatically, tap below to send the receipt now.
                  </>
                ) : (
                  <>
                    The record has been permanently saved to the clinic database. If WhatsApp did not open automatically, tap the button below to send the receipt now.
                  </>
                )}
              </div>
              {savedWhatsAppLink && (
                <div style={{ marginTop: "0.5rem" }}>
                  <a
                    href={savedWhatsAppLink}
                    target="_top"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{
                      background: "#25D366",
                      borderColor: "#1ebe5d",
                      color: "#fff",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontWeight: 700,
                      width: "100%",
                      justifyContent: "center",
                      padding: "0.75rem",
                    }}
                  >
                    <MessageSquare size={18} /> Open WhatsApp to Send Receipt
                  </a>
                </div>
              )}
            </div>
          ) : (
            <form
              id="insem-modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSave(true);
              }}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {/* Farmer Selector */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
                  <label style={{ fontSize: "0.875rem", fontWeight: 600 }}>Select Farmer *</label>
                  <button
                    type="button"
                    onClick={() => setNewFarmerModal(true)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", fontWeight: 600, fontSize: "0.8125rem" }}
                  >
                    + Add New Farmer
                  </button>
                </div>

                <select
                  className={`select ${formErrors.farmerId ? "input-error" : ""}`}
                  value={form.farmerId}
                  onChange={(e) => setForm({ ...form, farmerId: e.target.value })}
                >
                  <option value="">-- Choose registered farmer --</option>
                  {farmers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} — {f.mobile} {f.village ? `(${f.village})` : ""}
                    </option>
                  ))}
                </select>
                {formErrors.farmerId && (
                  <span className="input-helper-text" style={{ color: "var(--color-danger)" }}>
                    {formErrors.farmerId}
                  </span>
                )}
                {farmers.length === 0 && (
                  <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", background: "#fff3cd", border: "1px solid #ffeeba", borderRadius: "var(--radius-sm)", fontSize: "0.8125rem", color: "#856404" }}>
                    ⚠️ No farmers are registered yet. Please click <strong>+ Add New Farmer</strong> above to register a farmer first.
                  </div>
                )}

                {selectedFarmer && (
                  <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-sm)", fontSize: "0.8125rem", display: "flex", justifyContent: "space-between" }}>
                    <span>WhatsApp: <strong>{selectedFarmer.mobile}</strong></span>
                    <span>Total Cows Owned: <strong>{selectedFarmer.cowsOwned || (selectedFarmer.cows?.length || 0)}</strong></span>
                  </div>
                )}
              </div>

              {/* Date & Time */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="form-grid">
                <Input
                  label="Insemination Date *"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  error={formErrors.date}
                />
                <Input
                  label="Insemination Time *"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  error={formErrors.time}
                />
              </div>

              {/* Cow Count & Ear Tags */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="form-grid">
                <Input
                  label="Number of Cows Inseminated *"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="50"
                  value={form.cowCount}
                  onChange={(e) => setForm({ ...form, cowCount: e.target.value })}
                  error={formErrors.cowCount}
                />
                <Input
                  label="Ear Tag Number(s)"
                  placeholder="e.g. ET-1001, ET-1002"
                  value={form.cowTags}
                  onChange={(e) => setForm({ ...form, cowTags: e.target.value })}
                  helperText="Optional specific ear tags"
                />
              </div>

              {/* Semen / Bull info & Auto Doctor */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Input
                  label="Semen Straw / Bull Batch"
                  placeholder="e.g. Gir Proven Bull #G-4402"
                  value={form.strawCode}
                  onChange={(e) => setForm({ ...form, strawCode: e.target.value })}
                />
                <Input
                  label="Attending Doctor"
                  value={attendingDoctor}
                  disabled
                  helperText="Auto-filled from active doctor session"
                />
              </div>

              <Textarea
                label="Reproductive Exam Notes"
                placeholder="e.g. Cervical mucus clear and elastic, right horn uterine tone excellent. Advised farmer for follow-up PD check at 60 days."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />

              {/* Info note before saving */}
              <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", background: "#dcfce7", color: "#166534", fontSize: "0.8125rem", display: "flex", gap: "0.625rem", alignItems: "center", border: "1px solid #bbf7d0" }}>
                <span style={{ fontSize: "1.25rem" }}>💬</span>
                <div>
                  <strong>Direct WhatsApp Receipt:</strong>
                  <div>Record is saved permanently. After saving, WhatsApp opens automatically with the receipt pre-typed for the farmer.</div>
                </div>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Quick Add Farmer Modal (Inline) */}
      {newFarmerModal && (
        <Modal
          title="Quick Register Farmer"
          onClose={() => setNewFarmerModal(false)}
          footer={
            <div style={{ display: "flex", gap: "0.75rem", width: "100%", justifyContent: "flex-end" }}>
              <Button variant="outline" onClick={() => setNewFarmerModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" form="inline-farmer-modal-form" disabled={submittingNewFarmer}>
                {submittingNewFarmer ? "Saving..." : "Add Farmer"}
              </Button>
            </div>
          }
        >
          <form
            id="inline-farmer-modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateInlineFarmer();
            }}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <Input
              label="Farmer Full Name *"
              placeholder="e.g. Bhupendra Singh"
              value={newFarmerForm.name}
              onChange={(e) => setNewFarmerForm({ ...newFarmerForm, name: e.target.value })}
              autoFocus
            />
            <Input
              label="Mobile Number (WhatsApp) *"
              type="tel"
              inputMode="tel"
              placeholder="e.g. +91 98765 43210"
              value={newFarmerForm.mobile}
              onChange={(e) => setNewFarmerForm({ ...newFarmerForm, mobile: e.target.value })}
              helperText="Receipt will be delivered to this number."
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="form-grid">
              <Input
                label="Village / Location"
                placeholder="e.g. Anand"
                value={newFarmerForm.village}
                onChange={(e) => setNewFarmerForm({ ...newFarmerForm, village: e.target.value })}
              />
              <Input
                label="Cows Owned"
                type="number"
                inputMode="numeric"
                min="1"
                value={newFarmerForm.cowsOwned}
                onChange={(e) => setNewFarmerForm({ ...newFarmerForm, cowsOwned: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Official Print/PDF Receipt Modal */}
      {printRecord && (
        <Modal
          title={`Insemination Receipt — ${printRecord.receiptNumber}`}
          size="md"
          onClose={() => setPrintRecord(null)}
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "0.75rem" }}>
              <Button
                variant="outline"
                size="sm"
                style={{
                  background: "#25D366",
                  color: "#ffffff",
                  borderColor: "#1ebe5d",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  fontWeight: 600,
                  padding: "0.5rem 1rem",
                }}
                onClick={() => openWhatsAppReceipt(printRecord, clinic, attendingDoctor)}
                title="Open WhatsApp with receipt pre-filled"
              >
                <MessageSquare size={16} /> Send on WhatsApp
              </Button>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <Button variant="outline" onClick={() => setPrintRecord(null)}>Close</Button>
                <Button variant="primary" onClick={handlePrintReceipt}>
                  <Printer size={16} /> Print / Save as PDF
                </Button>
              </div>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Printable Receipt Container with branded layout */}
            <div
              id="printable-receipt"
              style={{
                border: "2px solid #2d6a4f",
                borderRadius: "var(--radius-md)",
                padding: "1.75rem",
                background: "#ffffff",
                color: "#1a1a1a",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {/* Receipt Header */}
              <div style={{ textAlign: "center", borderBottom: "2px dashed #2d6a4f", paddingBottom: "1rem", marginBottom: "1rem" }}>
                <div style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>🐄</div>
                <h2 style={{ margin: "0 0 0.25rem 0", color: "#2d6a4f", fontSize: "1.35rem", fontWeight: 800, textTransform: "uppercase" }}>
                  {clinic?.clinicName || "VetAssist Cattle AI Clinic"}
                </h2>
                <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.85rem", color: "#555" }}>
                  {clinic?.address || "45 Green Pasture Road, Anand, Gujarat"}
                </p>
                <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "#2d6a4f" }}>
                  Ph: {clinic?.phone || "+91 98765 43210"}
                </p>
              </div>

              {/* Title & Receipt Meta */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", background: "#d8f3dc", padding: "0.5rem 0.75rem", borderRadius: "4px" }}>
                <span style={{ fontWeight: 800, color: "#1b4332", fontSize: "0.95rem" }}>
                  ARTIFICIAL INSEMINATION RECEIPT
                </span>
                <span style={{ fontWeight: 800, color: "#2d6a4f", fontFamily: "monospace", fontSize: "1rem" }}>
                  {printRecord.receiptNumber}
                </span>
              </div>

              {/* Receipt Body Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", marginBottom: "1rem" }}>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                    <td style={{ padding: "0.45rem 0", color: "#666", width: "40%" }}>Date & Time:</td>
                    <td style={{ padding: "0.45rem 0", fontWeight: 700 }}>
                      {formatDate(printRecord.date)} at {formatTime(printRecord.time)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                    <td style={{ padding: "0.45rem 0", color: "#666" }}>Farmer Name:</td>
                    <td style={{ padding: "0.45rem 0", fontWeight: 700 }}>{printRecord.farmerName}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                    <td style={{ padding: "0.45rem 0", color: "#666" }}>WhatsApp Contact:</td>
                    <td style={{ padding: "0.45rem 0", fontWeight: 600 }}>{printRecord.farmerMobile}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                    <td style={{ padding: "0.45rem 0", color: "#666" }}>Attending Doctor:</td>
                    <td style={{ padding: "0.45rem 0", fontWeight: 700 }}>{printRecord.doctorName}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                    <td style={{ padding: "0.45rem 0", color: "#666" }}>Cows Inseminated:</td>
                    <td style={{ padding: "0.45rem 0", fontWeight: 800, color: "#2d6a4f" }}>
                      {printRecord.cowCount} bovine animal{printRecord.cowCount > 1 ? "s" : ""}
                    </td>
                  </tr>
                  {printRecord.cowTags && (
                    <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                      <td style={{ padding: "0.45rem 0", color: "#666" }}>Ear Tag Numbers:</td>
                      <td style={{ padding: "0.45rem 0", fontWeight: 600 }}>{printRecord.cowTags}</td>
                    </tr>
                  )}
                  {printRecord.strawCode && (
                    <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                      <td style={{ padding: "0.45rem 0", color: "#666" }}>Semen / Bull Straw:</td>
                      <td style={{ padding: "0.45rem 0", fontWeight: 600 }}>{printRecord.strawCode}</td>
                    </tr>
                  )}
                  {printRecord.notes && (
                    <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                      <td style={{ padding: "0.45rem 0", color: "#666" }}>Clinical Remarks:</td>
                      <td style={{ padding: "0.45rem 0", fontSize: "0.85rem" }}>{printRecord.notes}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Receipt Footer */}
              <div style={{ textAlign: "center", borderTop: "2px dashed #2d6a4f", paddingTop: "0.75rem", fontSize: "0.75rem", color: "#666" }}>
                <p style={{ margin: "0 0 0.25rem 0", fontWeight: 600, color: "#2d6a4f" }}>
                  Record logged into clinic database. Pregnancy diagnosis (PD) advised after 60–90 days.
                </p>
                <p style={{ margin: 0 }}>Thank you for choosing {clinic?.clinicName || "VetAssist"}!</p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Mobile 3-Dot Action Menu Sheet */}
      {insemActionMenu && (
        <Modal
          title={`Actions: ${insemActionMenu.farmerName}`}
          onClose={() => setInsemActionMenu(null)}
          footer={
            <Button variant="outline" style={{ width: "100%" }} onClick={() => setInsemActionMenu(null)}>
              Close
            </Button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
              Receipt #{insemActionMenu.receiptNumber} • {formatDate(insemActionMenu.date)}
            </div>
            <button
              type="button"
              className="btn btn-outline"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                justifyContent: "flex-start",
                padding: "0.875rem 1rem",
                minHeight: "44px",
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "#166534",
                borderColor: "#bbf7d0",
                background: "#f0fdf4",
              }}
              onClick={() => {
                const rec = insemActionMenu;
                setInsemActionMenu(null);
                handleSendWhatsApp(rec);
              }}
            >
              <MessageSquare size={18} color="#25D366" />
              <span>Send Receipt on WhatsApp</span>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                justifyContent: "flex-start",
                padding: "0.875rem 1rem",
                minHeight: "44px",
                fontSize: "0.9375rem",
                fontWeight: 500,
              }}
              onClick={() => {
                const rec = insemActionMenu;
                setInsemActionMenu(null);
                setPrintRecord(rec);
              }}
            >
              <Printer size={18} />
              <span>View & Print Official Receipt</span>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                justifyContent: "flex-start",
                padding: "0.875rem 1rem",
                minHeight: "44px",
                fontSize: "0.9375rem",
                fontWeight: 500,
              }}
              onClick={() => {
                const id = insemActionMenu.id;
                setInsemActionMenu(null);
                handleToggleSent(id);
              }}
            >
              <CheckCircle2 size={18} color={insemActionMenu.whatsappSent ? "#16a34a" : "#9ca3af"} />
              <span>
                {insemActionMenu.whatsappSent ? "Mark as Not Sent" : "Mark as Sent on WhatsApp"}
              </span>
            </button>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
}
