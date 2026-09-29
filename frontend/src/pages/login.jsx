import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Stethoscope, Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from "lucide-react";
import Button from "../components/button.jsx";
import { useAuth } from "../hooks/useAuth.js";

/**
 * Single-Doctor Secure Authentication
 * Security Note:
 * Public registration is permanently removed. Access is strictly granted
 * to the registered veterinarian via bcrypt-hashed password verification and JWT session tokens.
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || "/dashboard";

  function validate() {
    const errs = {};
    if (!form.email.trim()) errs.email = "Doctor email address is required";
    if (!form.password.trim()) errs.password = "Password is required";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      await login(form.email.trim(), form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(
        err.message || "Invalid doctor credentials. Please check your email and password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-root">
      {/* Left panel with cattle photography & branding */}
      <div className="login-left">
        <div className="login-left-overlay" />
        <div className="login-left-content">
          <div className="login-brand">
            <div className="login-logo-icon">
              <Stethoscope size={26} color="white" />
            </div>
            <div>
              <span className="login-brand-title">VetAssist</span>
              <span className="login-brand-sub">Cattle AI & Reproductive Clinic</span>
            </div>
          </div>

          <div className="login-quote-box">
            <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>🐄</div>
            <p className="login-quote-text">
              "Precision artificial insemination, instant WhatsApp receipts for farmers, and complete herd reproductive records."
            </p>
            <p className="login-quote-author">— Bovine Veterinary Practice</p>
          </div>

          <div className="login-feature-pills">
            <span className="login-pill">🌾 Farmer-First Directory</span>
            <span className="login-pill">📱 Instant WhatsApp Receipts</span>
            <span className="login-pill">🔒 Secure JWT Auth</span>
          </div>
        </div>
      </div>

      {/* Right panel: Doctor login form */}
      <div className="login-right">
        <div className="login-form-wrap">
          {/* Top clinic identity */}
          <div style={{ marginBottom: "2rem" }}>
            <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--color-primary)", textDecoration: "none", fontWeight: 600, marginBottom: "1.25rem", minHeight: "44px" }}>
              ← Back to Homepage
            </Link>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
              Doctor Portal Login
            </h1>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9375rem" }}>
              Sign in to manage farmer records and issue WhatsApp insemination receipts.
            </p>
          </div>

          {serverError && (
            <div className="alert-banner alert-error" style={{ marginBottom: "1.5rem" }}>
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.375rem", color: "var(--color-text)" }}>
                Doctor Email
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)", pointerEvents: "none", display: "flex" }}>
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  className={`input ${errors.email ? "input-error" : ""}`}
                  style={{ paddingLeft: "2.5rem", width: "100%", fontSize: "16px" }}
                  placeholder="doctor@vetassist.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {errors.email && <span className="input-helper-text" style={{ color: "var(--color-danger)" }}>{errors.email}</span>}
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.375rem", color: "var(--color-text)" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)", pointerEvents: "none", display: "flex" }}>
                  <Lock size={16} />
                </span>
                <input
                  type={showPwd ? "text" : "password"}
                  className={`input ${errors.password ? "input-error" : ""}`}
                  style={{ paddingLeft: "2.5rem", paddingRight: "3rem", width: "100%", fontSize: "16px" }}
                  placeholder="Enter your doctor password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{ position: "absolute", right: "0.25rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span className="input-helper-text" style={{ color: "var(--color-danger)" }}>{errors.password}</span>}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              style={{ width: "100%", justifyContent: "center" }}
              disabled={loading}
            >
              {loading ? "Verifying Credentials..." : <><span>Sign In to Clinic</span> <ArrowRight size={16} /></>}
            </Button>
          </form>

          {/* Security Architecture Badge */}
          <div style={{ marginTop: "2rem", padding: "1rem", borderRadius: "var(--radius-md)", background: "var(--color-bg-secondary)", border: "1px solid var(--color-border-light)", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <ShieldCheck size={20} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: "0.15rem" }} />
            <div style={{ fontSize: "0.775rem", color: "var(--color-text-secondary)", lineHeight: 1.45 }}>
              <strong style={{ color: "var(--color-text)", display: "block", marginBottom: "0.15rem" }}>
                Single-Practitioner Secure Portal
              </strong>
              Public registration is disabled. Doctor credentials are authenticated using salted bcrypt (12 rounds) and cryptographically signed JWT sessions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
