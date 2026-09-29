/**
 * Internal Sync Engine for VetAssist (Safari & iOS PWA compatible)
 * Strictly in-app sync with concurrency locking, FIFO ordering, and persistent outbox
 */

import farmerService from "./farmer.service.js";
import inseminationService from "./insemination.service.js";
import {
  getOutboxItems,
  updateOutboxItem,
  removeOutboxItem,
  saveFarmersFromServer,
  saveInseminationsFromServer,
  getFarmerByIdOrClientLocal,
  setMeta,
  getMeta,
} from "../db/indexedDb.js";
import { getStoredToken } from "./api.js";

let isSyncing = false;
let syncIntervalId = null;
const subscribers = new Set();

let currentState = {
  status: typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline",
  isOnline: typeof navigator !== "undefined" && navigator.onLine,
  isSyncing: false,
  pendingCount: 0,
  failedCount: 0,
  lastSyncedAt: null,
  authRequired: false,
};

function notifySubscribers() {
  const stateCopy = { ...currentState };
  subscribers.forEach((cb) => {
    try {
      cb(stateCopy);
    } catch (e) {
      console.error("Subscriber callback error:", e);
    }
  });
  window.dispatchEvent(new CustomEvent("vetassist:sync-state-changed", { detail: stateCopy }));
}

async function refreshCounts() {
  try {
    const items = await getOutboxItems();
    currentState.pendingCount = items.filter((i) => i.status === "pending").length;
    currentState.failedCount = items.filter((i) => i.status === "failed").length;
    const lastSync = await getMeta("lastSyncedAt");
    if (lastSync) {
      currentState.lastSyncedAt = lastSync;
    }
  } catch (err) {
    console.warn("refreshCounts error:", err);
  }
}

export function getSyncState() {
  return { ...currentState };
}

export function subscribeSyncState(callback) {
  subscribers.add(callback);
  callback({ ...currentState });
  return () => subscribers.delete(callback);
}

/**
 * Main Sync Execution Loop (Thread-safe lock)
 */
export async function runSync(force = false) {
  if (isSyncing) return;
  if (!navigator.onLine && !force) {
    currentState.status = "offline";
    currentState.isOnline = false;
    notifySubscribers();
    return;
  }

  const token = getStoredToken();
  if (!token) {
    // Cannot upload without auth token, but preserve outbox!
    currentState.authRequired = true;
    notifySubscribers();
    return;
  }

  isSyncing = true;
  currentState.isSyncing = true;
  currentState.status = "syncing";
  currentState.isOnline = true;
  currentState.authRequired = false;
  notifySubscribers();

  try {
    const outboxItems = await getOutboxItems();
    const pendingItems = outboxItems.filter((i) => i.status === "pending");

    for (const item of pendingItems) {
      // Re-verify network state before each item
      if (!navigator.onLine) {
        console.info("Sync paused: device went offline.");
        break;
      }

      try {
        if (item.type === "CREATE_FARMER") {
          const serverFarmer = await farmerService.create(item.payload);
          if (serverFarmer && serverFarmer.id) {
            await saveFarmersFromServer([serverFarmer]);

            // Resolve any dependent pending inseminations in local outbox
            if (item.clientId) {
              const remaining = await getOutboxItems();
              for (const rem of remaining) {
                if (
                  rem.type === "CREATE_INSEMINATION" &&
                  (rem.payload.farmerId === item.clientId || rem.payload.farmerClientId === item.clientId)
                ) {
                  await updateOutboxItem(rem.id, {
                    payload: {
                      ...rem.payload,
                      farmerId: serverFarmer.id,
                      farmerClientId: item.clientId,
                    },
                  });
                }
              }
            }

            // Only remove from outbox upon server confirmation
            await removeOutboxItem(item.id);
          }
        } else if (item.type === "CREATE_INSEMINATION") {
          // Resolve farmer if was created offline
          let payload = { ...item.payload };
          if (payload.farmerClientId) {
            const localFarmer = await getFarmerByIdOrClientLocal(payload.farmerClientId);
            if (localFarmer && localFarmer.id && localFarmer.id !== localFarmer.clientId) {
              payload.farmerId = localFarmer.id;
            }
          }

          const res = await inseminationService.create(payload);
          const serverRecord = res.data;
          if (serverRecord && serverRecord.id) {
            await saveInseminationsFromServer([serverRecord]);
            await removeOutboxItem(item.id);
          }
        }

        // Small delay (100ms) between queued items to avoid server flooding / rate-limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (err) {
        console.warn(`Sync item failed (${item.type}):`, err);

        // 401 Unauthorized: token expired while offline
        if (err.status === 401) {
          currentState.authRequired = true;
          // Keep outbox intact!
          break;
        }

        // 4xx Client Validation Error: Do NOT retry blindly. Mark failed so user can inspect
        if (err.status >= 400 && err.status < 500) {
          await updateOutboxItem(item.id, {
            status: "failed",
            lastError: err.message || "Validation failed on server.",
            attempts: (item.attempts || 0) + 1,
          });
          continue; // Move on to next non-dependent item
        }

        // Network error (timeout, 5xx, or offline drop): Stop batch and retry later
        await updateOutboxItem(item.id, {
          attempts: (item.attempts || 0) + 1,
          lastError: err.message || "Network error. Will retry when connection stabilizes.",
        });
        break;
      }
    }

    // Refresh counts and metadata
    await refreshCounts();
    const now = Date.now();
    await setMeta("lastSyncedAt", now);
    currentState.lastSyncedAt = now;
  } catch (err) {
    console.error("Critical syncEngine error:", err);
  } finally {
    isSyncing = false;
    currentState.isSyncing = false;
    currentState.isOnline = navigator.onLine;
    currentState.status = navigator.onLine ? "online" : "offline";
    notifySubscribers();
    window.dispatchEvent(new CustomEvent("vetassist:sync-completed"));
  }
}

/**
 * Retry a failed outbox item
 */
export async function retryOutboxItem(id) {
  await updateOutboxItem(id, { status: "pending", lastError: null });
  await refreshCounts();
  notifySubscribers();
  runSync();
}

/**
 * Discard a failed outbox item
 */
export async function discardOutboxItem(id) {
  await removeOutboxItem(id);
  await refreshCounts();
  notifySubscribers();
}

/**
 * Initialize listeners and timer on app launch
 */
export function initSyncEngine() {
  function handleOnline() {
    currentState.isOnline = true;
    currentState.status = "online";
    notifySubscribers();
    // Run sync when connectivity returns
    runSync();
  }

  function handleOffline() {
    currentState.isOnline = false;
    currentState.status = "offline";
    notifySubscribers();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible" && navigator.onLine) {
      runSync();
    }
  }

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("vetassist:outbox-updated", () => {
    refreshCounts().then(notifySubscribers);
    if (navigator.onLine) runSync();
  });

  // Background 60-second periodic sync (clears duplicates)
  if (syncIntervalId) clearInterval(syncIntervalId);
  syncIntervalId = setInterval(() => {
    if (navigator.onLine && !isSyncing) {
      runSync();
    }
  }, 60000);

  // Initial count load and startup sync
  refreshCounts().then(() => {
    notifySubscribers();
    if (navigator.onLine) {
      runSync();
    }
  });

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    if (syncIntervalId) clearInterval(syncIntervalId);
  };
}
