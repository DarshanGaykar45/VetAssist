import { openDB } from "idb";

const DB_NAME = "vetassist_offline_db";
const DB_VERSION = 1;

let dbPromise = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 1. Farmers store (keyed by 'id', indexed by 'clientId' and 'mobile')
        if (!db.objectStoreNames.contains("farmers")) {
          const farmerStore = db.createObjectStore("farmers", { keyPath: "id" });
          farmerStore.createIndex("clientId", "clientId", { unique: false });
          farmerStore.createIndex("mobile", "mobile", { unique: false });
          farmerStore.createIndex("syncStatus", "syncStatus", { unique: false });
        }

        // 2. Inseminations store (keyed by 'id', indexed by 'clientId' and 'farmerId')
        if (!db.objectStoreNames.contains("inseminations")) {
          const insemStore = db.createObjectStore("inseminations", { keyPath: "id" });
          insemStore.createIndex("clientId", "clientId", { unique: false });
          insemStore.createIndex("farmerId", "farmerId", { unique: false });
          insemStore.createIndex("syncStatus", "syncStatus", { unique: false });
          insemStore.createIndex("date", "date", { unique: false });
        }

        // 3. Outbox queue for offline creates (FIFO order by 'createdAt')
        if (!db.objectStoreNames.contains("outbox")) {
          const outboxStore = db.createObjectStore("outbox", { keyPath: "id" });
          outboxStore.createIndex("createdAt", "createdAt", { unique: false });
          outboxStore.createIndex("status", "status", { unique: false });
          outboxStore.createIndex("clientId", "clientId", { unique: false });
        }

        // 4. Key-value meta store (lastSyncedAt, cached clinic info, doctor profile)
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }
      },
    });
  }
  return dbPromise;
}

// ──────────────────────────────────────────────
// META STORE HELPERS
// ──────────────────────────────────────────────
export async function getMeta(key) {
  try {
    const db = await getDb();
    return await db.get("meta", key);
  } catch (err) {
    console.warn("IndexedDB getMeta error:", err);
    return null;
  }
}

export async function setMeta(key, value) {
  try {
    const db = await getDb();
    await db.put("meta", value, key);
  } catch (err) {
    console.warn("IndexedDB setMeta error:", err);
  }
}

// ──────────────────────────────────────────────
// FARMERS STORE HELPERS
// ──────────────────────────────────────────────
export async function getAllFarmersLocal() {
  try {
    const db = await getDb();
    const farmers = await db.getAll("farmers");
    // Sort so local pending items appear prominently, then by name
    return farmers.sort((a, b) => {
      if (a.syncStatus === "pending" && b.syncStatus !== "pending") return -1;
      if (a.syncStatus !== "pending" && b.syncStatus === "pending") return 1;
      return (a.name || "").localeCompare(b.name || "");
    });
  } catch (err) {
    console.warn("getAllFarmersLocal error:", err);
    return [];
  }
}

export async function getFarmerByIdOrClientLocal(idOrClientId) {
  if (!idOrClientId) return null;
  try {
    const db = await getDb();
    let farmer = await db.get("farmers", idOrClientId);
    if (!farmer) {
      const byClientId = await db.getFromIndex("farmers", "clientId", idOrClientId);
      if (byClientId) farmer = byClientId;
    }
    return farmer || null;
  } catch (err) {
    console.warn("getFarmerByIdOrClientLocal error:", err);
    return null;
  }
}

export async function saveFarmersFromServer(serverFarmers) {
  if (!Array.isArray(serverFarmers)) return;
  try {
    const db = await getDb();
    const tx = db.transaction("farmers", "readwrite");
    const store = tx.objectStore("farmers");

    // Fetch existing records
    const existing = await store.getAll();
    const pendingLocalMap = new Map();
    const serverIds = new Set(serverFarmers.map((f) => f.id));
    const serverClientIds = new Set(serverFarmers.filter((f) => f.clientId).map((f) => f.clientId));

    for (const f of existing) {
      if (f.syncStatus === "pending" || f.syncStatus === "failed") {
        pendingLocalMap.set(f.clientId || f.id, f);
      } else if (f.syncStatus === "synced") {
        // If it was previously synced from server but is no longer on the server, remove it
        const isStillOnServer = serverIds.has(f.id) || (f.clientId && serverClientIds.has(f.clientId));
        if (!isStillOnServer) {
          await store.delete(f.id);
        }
      }
    }

    // Insert or update server records as 'synced'
    for (const sf of serverFarmers) {
      const matchLocal = sf.clientId ? pendingLocalMap.get(sf.clientId) : null;
      if (matchLocal) {
        // Server already has this record synced, delete temporary local id if different
        if (matchLocal.id !== sf.id) {
          await store.delete(matchLocal.id);
        }
      }
      await store.put({
        ...sf,
        syncStatus: "synced",
        clientId: sf.clientId || null,
      });
    }

    await tx.done;
  } catch (err) {
    console.warn("saveFarmersFromServer error:", err);
  }
}

export async function putFarmerLocal(farmer) {
  try {
    const db = await getDb();
    await db.put("farmers", farmer);
  } catch (err) {
    console.warn("putFarmerLocal error:", err);
  }
}

export async function deleteFarmerLocal(id) {
  try {
    const db = await getDb();
    await db.delete("farmers", id);
  } catch (err) {
    console.warn("deleteFarmerLocal error:", err);
  }
}

// ──────────────────────────────────────────────
// INSEMINATIONS STORE HELPERS
// ──────────────────────────────────────────────
export async function getAllInseminationsLocal() {
  try {
    const db = await getDb();
    const records = await db.getAll("inseminations");
    // Sort descending by date, then time, then createdAt
    return records.sort((a, b) => {
      const dateA = `${a.date || ""} ${a.time || ""}`;
      const dateB = `${b.date || ""} ${b.time || ""}`;
      return dateB.localeCompare(dateA);
    });
  } catch (err) {
    console.warn("getAllInseminationsLocal error:", err);
    return [];
  }
}

export async function saveInseminationsFromServer(serverRecords) {
  if (!Array.isArray(serverRecords)) return;
  try {
    const db = await getDb();
    const tx = db.transaction("inseminations", "readwrite");
    const store = tx.objectStore("inseminations");

    const existing = await store.getAll();
    const pendingLocalMap = new Map();
    const serverIds = new Set(serverRecords.map((r) => r.id));
    const serverClientIds = new Set(serverRecords.filter((r) => r.clientId).map((r) => r.clientId));

    for (const r of existing) {
      if (r.syncStatus === "pending" || r.syncStatus === "failed") {
        pendingLocalMap.set(r.clientId || r.id, r);
      } else if (r.syncStatus === "synced") {
        // If it was previously synced from server but is no longer on the server, remove it
        const isStillOnServer = serverIds.has(r.id) || (r.clientId && serverClientIds.has(r.clientId));
        if (!isStillOnServer) {
          await store.delete(r.id);
        }
      }
    }

    for (const sr of serverRecords) {
      const matchLocal = sr.clientId ? pendingLocalMap.get(sr.clientId) : null;
      if (matchLocal && matchLocal.id !== sr.id) {
        await store.delete(matchLocal.id);
      }
      await store.put({
        ...sr,
        syncStatus: "synced",
        clientId: sr.clientId || null,
      });
    }

    await tx.done;
  } catch (err) {
    console.warn("saveInseminationsFromServer error:", err);
  }
}

export async function putInseminationLocal(record) {
  try {
    const db = await getDb();
    await db.put("inseminations", record);
  } catch (err) {
    console.warn("putInseminationLocal error:", err);
  }
}

// ──────────────────────────────────────────────
// OUTBOX QUEUE HELPERS (FIFO)
// ──────────────────────────────────────────────
export async function addToOutbox({ type, clientId, payload }) {
  try {
    const db = await getDb();
    const item = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type, // 'CREATE_FARMER' | 'CREATE_INSEMINATION'
      clientId,
      payload,
      createdAt: Date.now(),
      attempts: 0,
      lastError: null,
      status: "pending", // 'pending' | 'failed'
    };
    await db.put("outbox", item);
    return item;
  } catch (err) {
    console.warn("addToOutbox error:", err);
    return null;
  }
}

export async function getOutboxItems() {
  try {
    const db = await getDb();
    const items = await db.getAll("outbox");
    // Strictly preserve chronological order (FIFO) so farmers are uploaded before inseminations
    return items.sort((a, b) => a.createdAt - b.createdAt);
  } catch (err) {
    console.warn("getOutboxItems error:", err);
    return [];
  }
}

export async function updateOutboxItem(id, updates) {
  try {
    const db = await getDb();
    const item = await db.get("outbox", id);
    if (item) {
      await db.put("outbox", { ...item, ...updates });
    }
  } catch (err) {
    console.warn("updateOutboxItem error:", err);
  }
}

export async function removeOutboxItem(id) {
  try {
    const db = await getDb();
    await db.delete("outbox", id);
  } catch (err) {
    console.warn("removeOutboxItem error:", err);
  }
}

export async function getPendingOutboxCount() {
  try {
    const items = await getOutboxItems();
    return items.filter((i) => i.status === "pending" || i.status === "failed").length;
  } catch {
    return 0;
  }
}

// ──────────────────────────────────────────────
// CLEAR ALL LOCAL STORES (On Explicit Logout after confirmation)
// ──────────────────────────────────────────────
export async function clearAllLocalData() {
  try {
    const db = await getDb();
    const tx = db.transaction(["farmers", "inseminations", "outbox", "meta"], "readwrite");
    await tx.objectStore("farmers").clear();
    await tx.objectStore("inseminations").clear();
    await tx.objectStore("outbox").clear();
    await tx.objectStore("meta").clear();
    await tx.done;
  } catch (err) {
    console.warn("clearAllLocalData error:", err);
  }
}
