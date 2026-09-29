import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, User, Building, Moon, Sun, KeyRound, ShieldCheck, WifiOff } from "lucide-react";
import PageLayout from "../components/pagelayout.jsx";
import Card, { CardHeader, CardBody } from "../components/card.jsx";
import Button from "../components/button.jsx";
import Input from "../components/input.jsx";
import Loader from "../components/loader.jsx";
import Modal from "../components/modal.jsx";
import { useToast } from "../hooks/useToast.js";
import ToastContainer from "../components/toast.jsx";
import settingsService from "../services/settings.service.js";
import authService from "../services/auth.service.js";
import { useAuth } from "../hooks/useAuth.js";
import { useSync } from "../hooks/useSync.js";

export default function Settings() {
  const { user: authUser, updateUser, updateSession } = useAuth();
  const { isOnline } = useSync();
  const { toasts, toast, removeToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Clinic information (used in receipt header)
  const [clinic, setClinic] = useState({
    clinicName: "VetAssist Cattle AI Clinic",
    address: "",
    phone: "",
    email: "doctor@vetassist.com",
    website: "",
    currency: "INR",
  });

  // Doctor's profile (used to auto-fill insemination records)
  const [doctor, setDoctor] = useState({
    name: "Doctor",
    phone: "",
    specialization: "Bovine Veterinary Specialist",
    email: "doctor@vetassist.com",
  });

  const [theme, setTheme] = useState("light");

  // Change Password Only Modal state
  const [pwdModal, setPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwdErrors, setPwdErrors] = useState({});
  const [submittingPwd, setSubmittingPwd] = useState(false);

  // Update Login Email & Password Modal state
  const [credModal, setCredModal] = useState(false);
  const [credForm, setCredForm] = useState({
    newEmail: "",
    newPassword: "",
    confirmPassword: "",
    currentPassword: "",
  });
  const [credErrors, setCredErrors] = useState({});
  const [submittingCred, setSubmittingCred] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadSettings() {
      try {
        const data = await settingsService.getSettings();
        if (!ignore && data) {
          setClinic({
            clinicName: data.clinicName || "",
            address: data.address || "",
            phone: data.phone || "",
            email: data.email || "",
            website: data.website || "",
            currency: data.currency || "INR",
          });
          if (data.user) {
            setDoctor({
              name: data.user.name || data.doctorName || "",
              phone: data.user.phone || "",
              specialization: data.user.specialization || "",
              email: data.user.email || "",
            });
          }
          if (data.theme) {
            setTheme(data.theme);
            document.documentElement.setAttribute("data-theme", data.theme);
          }
        }
      } catch {
        if (!ignore) {
          // Use a stable inline call — avoids adding toast (unstable ref) to deps
          setClinic(prev => ({ ...prev }));
          console.error("Failed to load clinic settings from server.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadSettings();
    return () => {
      ignore = true;
    };
  }, []); // Empty deps: load once on mount only — toast is intentionally excluded (unstable ref)

  async function handleSaveSettings() {
    if (!isOnline) {
      toast.error("Saving clinic settings requires an active internet connection.");
      return;
    }
    setSaving(true);
    try {
      const res = await settingsService.updateSettings({
        ...clinic,
        doctorName: doctor.name,
        user: doctor,
        theme,
      });
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("vetassist_theme", theme);

      // Immediately update doctor identity in AuthContext so Navbar and Sidebar reflect changes without logout
      if (res && res.user) {
        updateUser(res.user);
      } else {
        updateUser({
          name: doctor.name,
          phone: doctor.phone,
          specialization: doctor.specialization,
        });
      }

      toast.success("Clinic details and Doctor profile saved.");
    } catch (err) {
      toast.error(err.message || "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  }

  function handleThemeChange(newTheme) {
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("vetassist_theme", newTheme);
  }

  function validatePassword() {
    const errs = {};
    if (!pwdForm.currentPassword) errs.currentPassword = "Old password is required.";
    if (!pwdForm.newPassword || pwdForm.newPassword.length < 6) {
      errs.newPassword = "New password must be at least 6 characters.";
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }
    return errs;
  }

  async function handleChangePasswordSubmit() {
    if (!isOnline) {
      toast.error("Changing password requires an active internet connection.");
      return;
    }
    const errs = validatePassword();
    if (Object.keys(errs).length) {
      setPwdErrors(errs);
      return;
    }
    setSubmittingPwd(true);

    try {
      await authService.changePassword(pwdForm.currentPassword, pwdForm.newPassword);
      toast.success("Doctor password changed successfully.");
      setPwdModal(false);
      setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwdErrors({});
    } catch (err) {
      toast.error(err.message || "Failed to change password. Verify your current password.");
    } finally {
      setSubmittingPwd(false);
    }
  }

  function validateCredentials() {
    const errs = {};
    if (!credForm.currentPassword) {
      errs.currentPassword = "Current password is required to authorize login changes.";
    }
    if (!credForm.newEmail.trim() && !credForm.newPassword) {
      errs.general = "Please provide a new login email, a new password, or both.";
    }
    if (credForm.newEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(credForm.newEmail.trim())) {
        errs.newEmail = "Please enter a valid email address.";
      }
    }
    if (credForm.newPassword) {
      if (credForm.newPassword.length < 6) {
        errs.newPassword = "New password must be at least 6 characters.";
      }
      if (credForm.newPassword !== credForm.confirmPassword) {
        errs.confirmPassword = "New passwords do not match.";
      }
    }
    return errs;
  }

  async function handleUpdateCredentialsSubmit() {
    if (!isOnline) {
      toast.error("Updating credentials requires an active internet connection.");
      return;
    }
    const errs = validateCredentials();
    if (Object.keys(errs).length) {
      setCredErrors(errs);
      return;
    }
    setSubmittingCred(true);

    try {
      const res = await authService.updateCredentials({
        currentPassword: credForm.currentPassword,
        newEmail: credForm.newEmail.trim() || undefined,
        newPassword: credForm.newPassword || undefined,
      });

      // Update in-memory and storage session with new token and updated user details
      if (res.token && res.user) {
        updateSession(res.token, res.user);
        if (res.user.email) {
          setDoctor((prev) => ({ ...prev, email: res.user.email }));
        }
      }

      toast.success(
        res.message || "Doctor login credentials updated successfully. Please use your new credentials for future logins."
      );
      setCredModal(false);
      setCredForm({ newEmail: "", newPassword: "", confirmPassword: "", currentPassword: "" });
      setCredErrors({});
    } catch (err) {
      toast.error(err.message || "Failed to update login credentials. Verify your current password.");
    } finally {
      setSubmittingCred(false);
    }
  }

  if (loading) {
    return (
      <PageLayout title="Settings" subtitle="Loading preferences...">
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
          <Loader size="lg" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Clinic Settings"
      subtitle="Manage clinic receipt branding, attending doctor identity, security, and appearance."
      actions={
        <Button variant="primary" onClick={handleSaveSettings} disabled={saving || !isOnline} title={!isOnline ? "Settings updates require internet connection" : ""}>
          <Save size={16} /> {saving ? "Saving Changes..." : "Save Settings"}
        </Button>
      }
    >
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {!isOnline && (
        <div
          style={{
            padding: "0.875rem 1.25rem",
            marginBottom: "1.5rem",
            borderRadius: "var(--radius-lg)",
            background: "#fef3c7",
            color: "#92400e",
            border: "1px solid #fde68a",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontSize: "0.875rem",
          }}
        >
          <WifiOff size={18} style={{ flexShrink: 0 }} />
          <span>
            <strong>Needs Internet Connection:</strong> Modifying clinic branding, security credentials, and passwords requires an active internet connection to prevent sync conflicts.
          </span>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="settings-grid"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}
      >
        {/* Clinic Identity & Receipt Header Info */}
        <Card hover>
          <CardHeader title="Clinic Identity (Receipt Header)">
            <Building size={18} color="var(--color-primary)" />
          </CardHeader>
          <CardBody>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Input
                label="Clinic Name *"
                value={clinic.clinicName}
                onChange={(e) => setClinic({ ...clinic, clinicName: e.target.value })}
                helperText="Displayed in large print at top of WhatsApp & PDF receipts"
              />
              <Input
                label="Clinic Address"
                value={clinic.address}
                onChange={(e) => setClinic({ ...clinic, address: e.target.value })}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="form-grid">
                <Input
                  label="Official Clinic Phone"
                  type="tel"
                  inputMode="tel"
                  value={clinic.phone}
                  onChange={(e) => setClinic({ ...clinic, phone: e.target.value })}
                  helperText="Follow-up contact on receipt"
                />
                <Input
                  label="Official Email"
                  type="email"
                  inputMode="email"
                  value={clinic.email}
                  onChange={(e) => setClinic({ ...clinic, email: e.target.value })}
                />
              </div>
              <Input
                label="Clinic Website"
                value={clinic.website}
                onChange={(e) => setClinic({ ...clinic, website: e.target.value })}
              />
            </div>
          </CardBody>
        </Card>

        {/* Attending Doctor Profile */}
        <Card hover>
          <CardHeader title="Doctor Profile (Auto-filled on Receipts)">
            <User size={18} color="var(--color-primary)" />
          </CardHeader>
          <CardBody>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Input
                label="Doctor Full Name *"
                value={doctor.name}
                onChange={(e) => setDoctor({ ...doctor, name: e.target.value })}
                helperText="Auto-filled on every new insemination visit"
              />
              <Input
                label="Specialization / Title"
                value={doctor.specialization}
                onChange={(e) => setDoctor({ ...doctor, specialization: e.target.value })}
              />
              <Input
                label="Doctor Mobile Phone"
                type="tel"
                inputMode="tel"
                value={doctor.phone}
                onChange={(e) => setDoctor({ ...doctor, phone: e.target.value })}
              />
              <Input
                label="Doctor Login Email"
                value={doctor.email}
                disabled
                helperText="Fixed single doctor login account"
              />
            </div>
          </CardBody>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15, ease: "easeOut" }}
        className="settings-grid"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}
      >
        {/* Security & Credentials */}
        <Card hover>
          <CardHeader title="Doctor Login Credentials & Security">
            <ShieldCheck size={18} color="var(--color-primary)" />
          </CardHeader>
          <CardBody>
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Active Login Email:</span>
                <strong style={{ color: "var(--color-primary)" }}>{doctor.email || authUser?.email || "doctor@vetassist.com"}</strong>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", lineHeight: 1.5, margin: 0 }}>
                This is a single-doctor clinic system. You can update your login email and password anytime by verifying your current password. No duplicate accounts are created.
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Button
                variant="primary"
                disabled={!isOnline}
                title={!isOnline ? "Credentials change requires internet connection" : ""}
                onClick={() => {
                  setCredForm({ newEmail: "", newPassword: "", confirmPassword: "", currentPassword: "" });
                  setCredErrors({});
                  setCredModal(true);
                }}
              >
                <KeyRound size={16} /> Update Login Email & Password {!isOnline ? "(Needs internet)" : ""}
              </Button>
              <Button
                variant="outline"
                disabled={!isOnline}
                title={!isOnline ? "Password change requires internet connection" : ""}
                onClick={() => {
                  setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  setPwdErrors({});
                  setPwdModal(true);
                }}
              >
                Change Password Only {!isOnline ? "(Needs internet)" : ""}
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Appearance Theme */}
        <Card hover>
          <CardHeader title="Appearance & Theme" />
          <CardBody>
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
              Choose your preferred visual mode for clinic management.
            </p>
            <div style={{ display: "flex", gap: "1rem" }}>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleThemeChange("light")}
                style={{
                  flex: 1,
                  padding: "1rem",
                  borderRadius: "var(--radius-lg)",
                  border: theme === "light" ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                  background: "#FFFFFF",
                  color: "#0F172A",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  boxShadow: theme === "light" ? "0 0 0 3px var(--color-primary-alpha), 0 4px 14px rgba(15, 118, 110, 0.15)" : "var(--shadow-card)",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Sun size={20} color="#F59E0B" />
                  <span>Light Theme</span>
                </div>
                {theme === "light" && (
                  <span style={{ fontSize: "0.7rem", color: "var(--color-primary)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Active
                  </span>
                )}
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleThemeChange("dark")}
                style={{
                  flex: 1,
                  padding: "1rem",
                  borderRadius: "var(--radius-lg)",
                  border: theme === "dark" ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                  background: "#0F172A",
                  color: "#F8FAFC",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  boxShadow: theme === "dark" ? "0 0 0 3px var(--color-primary-alpha), 0 4px 14px rgba(20, 184, 166, 0.2)" : "var(--shadow-card)",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Moon size={20} color="#14B8A6" />
                  <span>Dark Theme</span>
                </div>
                {theme === "dark" && (
                  <span style={{ fontSize: "0.7rem", color: "var(--color-primary)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Active
                  </span>
                )}
              </motion.button>
            </div>
          </CardBody>
        </Card>
        {/* Bottom Save Button for Mobile / Long scroll convenience */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem", marginBottom: "1rem" }}>
          <Button
            variant="primary"
            size="lg"
            onClick={handleSaveSettings}
            disabled={saving}
            style={{ width: "100%", maxWidth: "340px", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
          >
            <Save size={18} /> {saving ? "Saving Changes..." : "Save All Settings"}
          </Button>
        </div>
      </motion.div>

      {/* Update Login Email & Password Modal */}
      {credModal && (
        <Modal
          title="Update Login Email & Password"
          onClose={() => setCredModal(false)}
          footer={
            <div style={{ display: "flex", gap: "0.75rem", width: "100%", justifyContent: "flex-end" }}>
              <Button variant="outline" onClick={() => setCredModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" form="cred-modal-form" disabled={submittingCred}>
                {submittingCred ? "Updating Credentials..." : "Save New Credentials"}
              </Button>
            </div>
          }
        >
          <form
            id="cred-modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateCredentialsSubmit();
            }}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div style={{ padding: "0.75rem", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-sm)", fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
              Current Login: <strong>{doctor.email || authUser?.email}</strong>. Entering a new email or password will update your single doctor account permanently.
            </div>

            {credErrors.general && (
              <div style={{ color: "var(--color-danger)", fontSize: "0.8125rem", fontWeight: 600 }}>
                {credErrors.general}
              </div>
            )}

            <Input
              label="New Login Email (Leave blank to keep current)"
              type="email"
              placeholder="e.g. doctor.new@clinic.com"
              value={credForm.newEmail}
              onChange={(e) => setCredForm({ ...credForm, newEmail: e.target.value })}
              error={credErrors.newEmail}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="form-grid">
              <Input
                label="New Password (Optional)"
                type="password"
                placeholder="At least 6 characters"
                value={credForm.newPassword}
                onChange={(e) => setCredForm({ ...credForm, newPassword: e.target.value })}
                error={credErrors.newPassword}
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Re-type new password"
                value={credForm.confirmPassword}
                onChange={(e) => setCredForm({ ...credForm, confirmPassword: e.target.value })}
                error={credErrors.confirmPassword}
              />
            </div>

            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
              <Input
                label="Current Password * (Security Confirmation)"
                type="password"
                placeholder="Enter current password to authorize changes"
                value={credForm.currentPassword}
                onChange={(e) => setCredForm({ ...credForm, currentPassword: e.target.value })}
                error={credErrors.currentPassword}
                helperText="Required before applying any email or password modifications."
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Change Password Modal */}
      {pwdModal && (
        <Modal
          title="Change Doctor Password"
          onClose={() => setPwdModal(false)}
          footer={
            <div style={{ display: "flex", gap: "0.75rem", width: "100%", justifyContent: "flex-end" }}>
              <Button variant="outline" onClick={() => setPwdModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" form="pwd-modal-form" disabled={submittingPwd}>
                {submittingPwd ? "Updating..." : "Update Password"}
              </Button>
            </div>
          }
        >
          <form
            id="pwd-modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleChangePasswordSubmit();
            }}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <Input
              label="Current Password *"
              type="password"
              placeholder="Enter current password"
              value={pwdForm.currentPassword}
              onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
              error={pwdErrors.currentPassword}
            />
            <Input
              label="New Password *"
              type="password"
              placeholder="At least 6 characters"
              value={pwdForm.newPassword}
              onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
              error={pwdErrors.newPassword}
            />
            <Input
              label="Confirm New Password *"
              type="password"
              placeholder="Re-type new password"
              value={pwdForm.confirmPassword}
              onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
              error={pwdErrors.confirmPassword}
            />
          </form>
        </Modal>
      )}
    </PageLayout>
  );
}
