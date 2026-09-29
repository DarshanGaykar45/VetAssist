import { useState } from "react";
import { Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { useSync } from "../hooks/useSync.js";
import Modal from "./modal.jsx";
import Button from "./button.jsx";

export default function SyncStatus() {
  const {
    status,
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    syncNow,
    retry,
    discard,
    outboxList,
    refreshOutbox,
    authRequired,
  } = useSync();

  const [modalOpen, setModalOpen] = useState(false);

  async function handleOpenModal() {
    await refreshOutbox();
    setModalOpen(true);
  }

  const totalWaiting = pendingCount + failedCount;

  return (
    <>
      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
        {/* Status Pill */}
        <div
          className={`sync-pill sync-pill-${status}`}
          title={
            status === "syncing"
              ? "Syncing records with clinic server..."
              : isOnline
              ? "Online: Connected to clinic server"
              : "Offline: Saved records remain safe on your device"
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0.25rem 0.6rem",
            borderRadius: "9999px",
            fontSize: "0.75rem",
            fontWeight: 600,
            background:
              status === "syncing"
                ? "rgba(14, 165, 233, 0.12)"
                : isOnline
                ? "rgba(22, 163, 74, 0.12)"
                : "rgba(234, 179, 8, 0.16)", // Calm warning color, not red error
            color:
              status === "syncing"
                ? "#0284c7"
                : isOnline
                ? "#15803d"
                : "#b45309",
            border:
              status === "syncing"
                ? "1px solid rgba(14, 165, 233, 0.3)"
                : isOnline
                ? "1px solid rgba(22, 163, 74, 0.25)"
                : "1px solid rgba(234, 179, 8, 0.35)",
            whiteSpace: "nowrap",
          }}
        >
          {status === "syncing" ? (
            <>
              <RefreshCw size={12} className="spin-animation" />
              <span>Syncing...</span>
            </>
          ) : isOnline ? (
            <>
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#16a34a",
                }}
              />
              <span>Online</span>
            </>
          ) : (
            <>
              <CloudOff size={12} />
              <span>Offline</span>
            </>
          )}
        </div>

        {/* Pending Records Badge Button (Shown whenever records are waiting or failed) */}
        {totalWaiting > 0 && (
          <button
            type="button"
            onClick={handleOpenModal}
            aria-label={`${totalWaiting} records waiting to upload`}
            title="View saved records queue"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.25rem 0.65rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 700,
              background: failedCount > 0 ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.15)",
              color: failedCount > 0 ? "#dc2626" : "#b45309",
              border: failedCount > 0 ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(245, 158, 11, 0.35)",
              cursor: "pointer",
            }}
          >
            <Cloud size={12} />
            <span>
              {totalWaiting} {totalWaiting === 1 ? "record waiting" : "waiting to upload"}
            </span>
          </button>
        )}
      </div>

      {/* Outbox Modal / Bottom Sheet */}
      {modalOpen && (
        <Modal
          title="Saved Records Queue"
          onClose={() => setModalOpen(false)}
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "0.75rem" }}>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Close
              </Button>
              {isOnline && (
                <Button
                  variant="primary"
                  onClick={() => {
                    syncNow();
                  }}
                  disabled={isSyncing}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <RefreshCw size={14} className={isSyncing ? "spin-animation" : ""} />
                  <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
                </Button>
              )}
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                background: isOnline ? "var(--color-bg-secondary)" : "#fef3c7",
                color: isOnline ? "var(--color-text-secondary)" : "#92400e",
                fontSize: "0.8125rem",
                lineHeight: 1.5,
              }}
            >
              {authRequired ? (
                <div style={{ color: "var(--color-danger)", fontWeight: 600 }}>
                  ⚠️ Your session expired while offline. Please log in again to upload your saved records. (Your saved data is safely stored on this phone).
                </div>
              ) : isOnline ? (
                "You are online. Pending records will upload automatically, or you can tap 'Sync Now'."
              ) : (
                "You are currently offline. All farmers and inseminations added here are saved safely on your phone and will upload automatically once internet signal returns."
              )}
            </div>

            {outboxList.length === 0 ? (
              <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                <CheckCircle2 size={32} color="#16a34a" style={{ margin: "0 auto 0.5rem" }} />
                <div style={{ fontWeight: 600 }}>All records synced</div>
                <div style={{ fontSize: "0.8125rem" }}>Your phone is completely up to date with the clinic server.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {outboxList.map((item) => {
                  const isFailed = item.status === "failed";
                  const isFarmer = item.type === "CREATE_FARMER";
                  const title = isFarmer
                    ? `Farmer: ${item.payload?.name || item.payload?.farmerName || "New Farmer"}`
                    : `Insemination: ${item.payload?.cowCount || 1} cow(s) (${item.payload?.date || "today"})`;

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: "0.75rem 0.875rem",
                        borderRadius: "var(--radius-md)",
                        border: isFailed ? "1px solid #fecaca" : "1px solid var(--color-border-light)",
                        background: isFailed ? "#fff5f5" : "var(--color-surface)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>{title}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                            Saved {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {item.clientId ? ` • Ref: ${item.clientId.slice(0, 8)}` : ""}
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            padding: "0.15rem 0.5rem",
                            borderRadius: "9999px",
                            background: isFailed ? "#fee2e2" : "#fef3c7",
                            color: isFailed ? "#b91c1c" : "#92400e",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          {isFailed ? <AlertCircle size={10} /> : <Cloud size={10} />}
                          <span>{isFailed ? "Failed" : "Pending Sync"}</span>
                        </span>
                      </div>

                      {isFailed && item.lastError && (
                        <div style={{ fontSize: "0.75rem", color: "#dc2626", background: "#fef2f2", padding: "0.35rem 0.5rem", borderRadius: "4px" }}>
                          Error: {item.lastError}
                        </div>
                      )}

                      {isFailed && (
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.25rem" }}>
                          <button
                            type="button"
                            onClick={() => discard(item.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--color-danger)",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "0.25rem 0.5rem",
                            }}
                          >
                            <Trash2 size={12} /> Discard
                          </button>
                          <Button size="sm" variant="outline" onClick={() => retry(item.id)}>
                            Retry
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
