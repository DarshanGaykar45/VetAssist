import { useState } from "react";
import { Share, X, ShieldCheck } from "lucide-react";

export default function HomeScreenBanner() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return false;
    }
    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !window.MSStream;

    const isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    const dismissed = localStorage.getItem("vetassist_dismiss_ios_pwa_banner") === "true";

    return isIos && !isStandalone && !dismissed;
  });

  function handleDismiss() {
    localStorage.setItem("vetassist_dismiss_ios_pwa_banner", "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #064e3b 0%, #0f766e 100%)",
        color: "#ffffff",
        padding: "0.625rem 1rem",
        borderRadius: "var(--radius-lg)",
        marginBottom: "1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        boxShadow: "var(--shadow-md)",
        fontSize: "0.8125rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <ShieldCheck size={18} style={{ flexShrink: 0, color: "#a7f3d0" }} />
        <div>
          <strong>Protect your offline records:</strong> Tap Safari Share{" "}
          <Share size={12} style={{ display: "inline", verticalAlign: "middle" }} /> and select{" "}
          <strong>"Add to Home Screen"</strong>. The installed app prevents iOS 7-day data cleanup and ensures offline saving works anywhere in the fields.
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        style={{
          background: "rgba(255,255,255,0.15)",
          border: "none",
          color: "#ffffff",
          borderRadius: "50%",
          width: "24px",
          height: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
