/**
 * Unified Data Service for VetAssist
 * Handles seamless routing between Online API and Offline IndexedDB storage
 */

import farmerService from "./farmer.service.js";
import inseminationService from "./insemination.service.js";
import {
  getAllFarmersLocal,
  saveFarmersFromServer,
  putFarmerLocal,
  deleteFarmerLocal,
  getFarmerByIdOrClientLocal,
  getAllInseminationsLocal,
  saveInseminationsFromServer,
  putInseminationLocal,
  addToOutbox,
  setMeta,
  getMeta,
} from "../db/indexedDb.js";
import { getWhatsAppDeepLink } from "../utils/receipt.js";

function isNetworkError(err) {
  if (!navigator.onLine) return true;
  if (!err) return false;
  // ApiError sets status = 0 on network failures/timeouts
  if (err.status === 0) return true;
  // If no status and message indicates network/fetch failure
  if (err.name === "TypeError" && err.message?.includes("fetch")) return true;
  if (err.message?.includes("connect") || err.message?.includes("Network")) return true;
  return false;
}

export const dataService = {
  // ──────────────────────────────────────────────
  // FARMERS
  // ──────────────────────────────────────────────
  async getFarmers() {
    if (navigator.onLine) {
      try {
        const serverData = await farmerService.getAll();
        if (Array.isArray(serverData)) {
          await saveFarmersFromServer(serverData);
          await setMeta("lastFarmersFetchAt", Date.now());
        }
      } catch (err) {
        if (!isNetworkError(err)) {
          console.warn("Failed to fetch farmers from server:", err);
        }
      }
    }
    // Always return full local IndexedDB list (includes synced + pending local creations)
    return await getAllFarmersLocal();
  },

  async createFarmer(formData) {
    const clientId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `farmer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Try online path first if browser reports online
    if (navigator.onLine) {
      try {
        const serverFarmer = await farmerService.create({
          ...formData,
          clientId,
        });

        // Save into IndexedDB as synced
        await saveFarmersFromServer([serverFarmer]);
        return {
          ...serverFarmer,
          syncStatus: "synced",
          isOffline: false,
        };
      } catch (err) {
        // Only fall back to offline if it is a network error (not 4xx validation)
        if (!isNetworkError(err) && err.status >= 400 && err.status < 500) {
          throw err;
        }
        console.info("Network failed on createFarmer, falling back to offline saving...");
      }
    }

    // Offline fallback path
    const localFarmer = {
      id: clientId,
      clientId,
      name: (formData.name || formData.farmerName || "").trim(),
      mobile: (formData.mobile || formData.phone || "").trim(),
      village: formData.village?.trim() || null,
      cowsOwned: parseInt(formData.cowsOwned || formData.cattleCount, 10) || 1,
      notes: formData.notes?.trim() || null,
      cows: [],
      syncStatus: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await putFarmerLocal(localFarmer);
    await addToOutbox({
      type: "CREATE_FARMER",
      clientId,
      payload: { ...formData, clientId },
    });

    // Fire custom event to notify sync badge / UI
    window.dispatchEvent(new CustomEvent("vetassist:outbox-updated"));

    return {
      ...localFarmer,
      isOffline: true,
    };
  },

  async updateFarmer(id, formData) {
    if (!navigator.onLine) {
      throw new Error("Internet connection is required to edit farmer records.");
    }
    const updated = await farmerService.update(id, formData);
    await saveFarmersFromServer([updated]);
    return updated;
  },

  async deleteFarmer(id) {
    if (!navigator.onLine) {
      throw new Error("Internet connection is required to delete farmer records.");
    }
    const res = await farmerService.delete(id);
    await deleteFarmerLocal(id);
    return res;
  },

  // ──────────────────────────────────────────────
  // INSEMINATIONS
  // ──────────────────────────────────────────────
  async getInseminations(params) {
    if (navigator.onLine) {
      try {
        const serverRecords = await inseminationService.getAll(params);
        if (Array.isArray(serverRecords)) {
          await saveInseminationsFromServer(serverRecords);
          await setMeta("lastInsemFetchAt", Date.now());
        }
      } catch (err) {
        if (!isNetworkError(err)) {
          console.warn("Failed to fetch inseminations from server:", err);
        }
      }
    }
    // Return full local IndexedDB list (synced + pending local creations)
    return await getAllInseminationsLocal();
  },

  async createInsemination(formData, clinicInfo, doctorName) {
    const clientId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `insem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Resolve farmer from local IndexedDB cache
    const farmer = await getFarmerByIdOrClientLocal(formData.farmerId);
    const farmerClientId = farmer?.clientId || (formData.farmerId.startsWith("farmer-") ? formData.farmerId : null);

    if (navigator.onLine) {
      try {
        const res = await inseminationService.create({
          ...formData,
          clientId,
          farmerClientId: farmerClientId || undefined,
        });

        const savedRecord = res.data;
        if (savedRecord) {
          await saveInseminationsFromServer([savedRecord]);
        }

        return {
          ...res,
          isOffline: false,
        };
      } catch (err) {
        if (!isNetworkError(err) && err.status >= 400 && err.status < 500) {
          throw err;
        }
        console.info("Network failed on createInsemination, falling back to offline saving...");
      }
    }

    // Offline fallback path
    const tempReceiptNumber = `TEMP-${clientId.slice(0, 6).toUpperCase()}`;
    const localRecord = {
      id: clientId,
      clientId,
      receiptNumber: tempReceiptNumber,
      farmerId: formData.farmerId,
      farmerClientId: farmerClientId || null,
      farmerName: farmer?.name || "Farmer",
      farmerMobile: farmer?.mobile || "",
      doctorName: doctorName || clinicInfo?.doctorName || "Doctor",
      date: formData.date,
      time: formData.time,
      cowCount: parseInt(formData.cowCount, 10) || 1,
      cowTags: formData.cowTags?.trim() || null,
      strawCode: formData.strawCode?.trim() || null,
      notes: formData.notes?.trim() || null,
      whatsappStatus: "pending",
      syncStatus: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await putInseminationLocal(localRecord);
    await addToOutbox({
      type: "CREATE_INSEMINATION",
      clientId,
      payload: {
        ...formData,
        clientId,
        farmerClientId: farmerClientId || undefined,
      },
    });

    const offlineWhatsAppLink = getWhatsAppDeepLink(localRecord, clinicInfo, doctorName);

    window.dispatchEvent(new CustomEvent("vetassist:outbox-updated"));

    return {
      success: true,
      message: `Insemination saved locally on this phone (Temp #${tempReceiptNumber}). It will upload automatically when online.`,
      data: localRecord,
      whatsappLink: offlineWhatsAppLink,
      isOffline: true,
    };
  },

  // ──────────────────────────────────────────────
  // CACHED CLINIC & DOCTOR PROFILE FOR RECEIPTS
  // ──────────────────────────────────────────────
  async cacheClinicSettings(settings) {
    if (settings) {
      await setMeta("clinicSettings", settings);
    }
  },

  async getCachedClinicSettings() {
    return await getMeta("clinicSettings");
  },
};

export default dataService;
