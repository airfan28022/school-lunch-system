// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var DATA_DIR = path.resolve(__dirname, "data");
var STORE_PATH = path.resolve(DATA_DIR, "store.json");
var DEFAULT_SETTINGS = {
  schoolName: "\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E2D\u0E19\u0E38\u0E1A\u0E32\u0E25\u0E41\u0E25\u0E30\u0E1B\u0E23\u0E30\u0E16\u0E21\u0E28\u0E36\u0E01\u0E29\u0E32\u0E40\u0E17\u0E28\u0E1A\u0E32\u0E25\u0E1E\u0E31\u0E12\u0E19\u0E32",
  department: "\u0E2A\u0E31\u0E07\u0E01\u0E31\u0E14\u0E2A\u0E33\u0E19\u0E31\u0E01\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32 \u0E40\u0E17\u0E28\u0E1A\u0E32\u0E25\u0E19\u0E04\u0E23\u0E19\u0E19\u0E17\u0E1A\u0E38\u0E23\u0E35",
  managerName: "\u0E19\u0E32\u0E07\u0E01\u0E32\u0E0D\u0E08\u0E19\u0E32 \u0E21\u0E07\u0E04\u0E25\u0E2A\u0E38\u0E02 (\u0E2B\u0E31\u0E27\u0E2B\u0E19\u0E49\u0E32\u0E07\u0E32\u0E19\u0E42\u0E20\u0E0A\u0E19\u0E32\u0E01\u0E32\u0E23\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19)",
  directorName: "\u0E19\u0E32\u0E22\u0E1B\u0E23\u0E30\u0E40\u0E2A\u0E23\u0E34\u0E10 \u0E27\u0E31\u0E12\u0E19\u0E32\u0E20\u0E34\u0E23\u0E21\u0E22\u0E4C (\u0E1C\u0E39\u0E49\u0E2D\u0E33\u0E19\u0E27\u0E22\u0E01\u0E32\u0E23\u0E2A\u0E16\u0E32\u0E19\u0E28\u0E36\u0E01\u0E29\u0E32)",
  logoUrl: "https://lh3.googleusercontent.com/d/1elzE02MEWHhTvxpvVECoFj7y9NpxYg2j",
  gasWebAppUrl: "https://script.google.com/macros/s/AKfycbzKYFt1-hn2Qq9bnrsQpG9PMhehuuq6yuaE2e6Tq8ogIB1Ft6EQV4FdyzUkL5RxTKqf/exec"
};
function initStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(STORE_PATH)) {
    try {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        settings: parsed.settings || DEFAULT_SETTINGS,
        menuBank: parsed.menuBank || [],
        dailyMenus: parsed.dailyMenus || [],
        lastUpdated: parsed.lastUpdated || (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (e) {
      console.error("Error reading store.json, re-initializing", e);
    }
  }
  let initialMenuBank = [];
  let initialDailyMenus = [];
  try {
    const initDataPath = path.resolve(__dirname, "src", "data", "initialData.ts");
    if (fs.existsSync(initDataPath)) {
      initialMenuBank = [
        { id: "mb-01", category: "\u0E02\u0E49\u0E32\u0E27", menuName: "\u0E02\u0E49\u0E32\u0E27\u0E2A\u0E27\u0E22\u0E2B\u0E2D\u0E21\u0E21\u0E30\u0E25\u0E34\u0E43\u0E2B\u0E21\u0E48", createdAt: "2026-09-01" },
        { id: "mb-02", category: "\u0E02\u0E49\u0E32\u0E27", menuName: "\u0E02\u0E49\u0E32\u0E27\u0E01\u0E25\u0E49\u0E2D\u0E07\u0E40\u0E01\u0E29\u0E15\u0E23\u0E2D\u0E34\u0E19\u0E17\u0E23\u0E35\u0E22\u0E4C\u0E2B\u0E2D\u0E21\u0E19\u0E38\u0E48\u0E21", createdAt: "2026-09-01" },
        { id: "mb-05", category: "\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E08\u0E32\u0E19\u0E40\u0E14\u0E35\u0E22\u0E27", menuName: "\u0E02\u0E49\u0E32\u0E27\u0E21\u0E31\u0E19\u0E44\u0E01\u0E48\u0E15\u0E2D\u0E19\u0E2A\u0E39\u0E15\u0E23\u0E2D\u0E19\u0E32\u0E21\u0E31\u0E22 \u0E19\u0E49\u0E33\u0E0B\u0E38\u0E1B\u0E1F\u0E31\u0E01\u0E2B\u0E27\u0E32\u0E19", createdAt: "2026-09-01" },
        { id: "mb-06", category: "\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E08\u0E32\u0E19\u0E40\u0E14\u0E35\u0E22\u0E27", menuName: "\u0E01\u0E4B\u0E27\u0E22\u0E40\u0E15\u0E35\u0E4B\u0E22\u0E27\u0E40\u0E2A\u0E49\u0E19\u0E2B\u0E21\u0E35\u0E48\u0E19\u0E49\u0E33\u0E43\u0E2A\u0E25\u0E39\u0E01\u0E0A\u0E34\u0E49\u0E19\u0E1B\u0E25\u0E32\u0E2B\u0E21\u0E39\u0E2A\u0E31\u0E1A", createdAt: "2026-09-01" },
        { id: "mb-11", category: "\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E44\u0E21\u0E48\u0E40\u0E1C\u0E47\u0E14", menuName: "\u0E15\u0E49\u0E21\u0E08\u0E37\u0E14\u0E40\u0E15\u0E49\u0E32\u0E2B\u0E39\u0E49\u0E2B\u0E21\u0E39\u0E2A\u0E31\u0E1A\u0E2A\u0E32\u0E2B\u0E23\u0E48\u0E32\u0E22\u0E27\u0E32\u0E01\u0E32\u0E40\u0E21\u0E30\u0E41\u0E04\u0E23\u0E2D\u0E17", createdAt: "2026-09-01" },
        { id: "mb-12", category: "\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E44\u0E21\u0E48\u0E40\u0E1C\u0E47\u0E14", menuName: "\u0E44\u0E02\u0E48\u0E1E\u0E30\u0E42\u0E25\u0E49\u0E42\u0E1A\u0E23\u0E32\u0E13\u0E2B\u0E21\u0E39\u0E2A\u0E32\u0E21\u0E0A\u0E31\u0E49\u0E19 \u0E40\u0E15\u0E49\u0E32\u0E2B\u0E39\u0E49\u0E1E\u0E27\u0E07", createdAt: "2026-09-01" },
        { id: "mb-18", category: "\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E40\u0E1C\u0E47\u0E14", menuName: "\u0E41\u0E01\u0E07\u0E40\u0E02\u0E35\u0E22\u0E27\u0E2B\u0E27\u0E32\u0E19\u0E44\u0E01\u0E48\u0E43\u0E2A\u0E48\u0E21\u0E30\u0E40\u0E02\u0E37\u0E2D\u0E40\u0E1B\u0E23\u0E32\u0E30\u0E43\u0E1A\u0E42\u0E2B\u0E23\u0E30\u0E1E\u0E32", createdAt: "2026-09-01" },
        { id: "mb-19", category: "\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E40\u0E1C\u0E47\u0E14", menuName: "\u0E1C\u0E31\u0E14\u0E01\u0E30\u0E40\u0E1E\u0E23\u0E32\u0E2B\u0E21\u0E39\u0E2A\u0E31\u0E1A\u0E43\u0E1A\u0E01\u0E30\u0E40\u0E1E\u0E23\u0E32\u0E1A\u0E49\u0E32\u0E19 (\u0E40\u0E1C\u0E47\u0E14\u0E19\u0E49\u0E2D\u0E22\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E40\u0E14\u0E47\u0E01)", createdAt: "2026-09-01" },
        { id: "mb-23", category: "\u0E1C\u0E25\u0E44\u0E21\u0E49", menuName: "\u0E01\u0E25\u0E49\u0E27\u0E22\u0E19\u0E49\u0E33\u0E27\u0E49\u0E32\u0E2D\u0E34\u0E19\u0E17\u0E23\u0E35\u0E22\u0E4C\u0E2A\u0E27\u0E19\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19", createdAt: "2026-09-01" },
        { id: "mb-24", category: "\u0E1C\u0E25\u0E44\u0E21\u0E49", menuName: "\u0E41\u0E15\u0E07\u0E42\u0E21\u0E01\u0E34\u0E19\u0E23\u0E35\u0E2B\u0E27\u0E32\u0E19\u0E09\u0E48\u0E33\u0E2B\u0E31\u0E48\u0E19\u0E0A\u0E34\u0E49\u0E19\u0E1E\u0E2D\u0E14\u0E35\u0E04\u0E33", createdAt: "2026-09-01" },
        { id: "mb-26", category: "\u0E02\u0E2D\u0E07\u0E2B\u0E27\u0E32\u0E19", menuName: "\u0E1A\u0E31\u0E27\u0E25\u0E2D\u0E22\u0E40\u0E1C\u0E37\u0E2D\u0E01\u0E21\u0E30\u0E1E\u0E23\u0E49\u0E32\u0E27\u0E2D\u0E48\u0E2D\u0E19\u0E01\u0E30\u0E17\u0E34\u0E2A\u0E14\u0E2B\u0E27\u0E32\u0E19\u0E19\u0E49\u0E2D\u0E22", createdAt: "2026-09-01" },
        { id: "mb-27", category: "\u0E02\u0E2D\u0E07\u0E2B\u0E27\u0E32\u0E19", menuName: "\u0E01\u0E25\u0E49\u0E27\u0E22\u0E1A\u0E27\u0E0A\u0E0A\u0E35\u0E07\u0E32\u0E02\u0E32\u0E27\u0E04\u0E31\u0E48\u0E27\u0E2B\u0E2D\u0E21\u0E01\u0E23\u0E38\u0E48\u0E19", createdAt: "2026-09-01" }
      ];
    }
  } catch (err) {
    console.warn("Initial data load warning:", err);
  }
  const initialStore = {
    settings: DEFAULT_SETTINGS,
    menuBank: initialMenuBank,
    dailyMenus: initialDailyMenus,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
  fs.writeFileSync(STORE_PATH, JSON.stringify(initialStore, null, 2), "utf-8");
  return initialStore;
}
function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return initStore();
    }
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("readStore error:", err);
    return initStore();
  }
}
function writeStore(data) {
  try {
    data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("writeStore error:", err);
  }
}
async function callGas(url, payload) {
  let cleanUrl = url.trim();
  if (cleanUrl.includes("/macros/s/") && cleanUrl.endsWith("/dev")) {
    cleanUrl = cleanUrl.replace(/\/dev$/, "/exec");
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2e4);
  try {
    const res = await fetch(cleanUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new Error(`GAS HTTP error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}
var isSyncingGas = false;
async function syncFromGas(gasUrl) {
  if (isSyncingGas) return false;
  isSyncingGas = true;
  try {
    const current = readStore();
    const targetUrl = gasUrl || current.settings?.gasWebAppUrl || DEFAULT_SETTINGS.gasWebAppUrl;
    if (!targetUrl) return false;
    let cleanUrl = targetUrl.trim();
    if (cleanUrl.includes("/macros/s/") && cleanUrl.endsWith("/dev")) {
      cleanUrl = cleanUrl.replace(/\/dev$/, "/exec");
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12e3);
    const res = await fetch(`${cleanUrl}${cleanUrl.includes("?") ? "&" : "?"}action=getAllData`, {
      method: "GET",
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return false;
    const data = await res.json();
    if (data && data.status === "success") {
      let changed = false;
      if (data.settings && Object.keys(data.settings).length > 0) {
        current.settings = { ...current.settings, ...data.settings, gasWebAppUrl: targetUrl };
        changed = true;
      }
      if (Array.isArray(data.menuBank) && data.menuBank.length > 0) {
        current.menuBank = data.menuBank;
        changed = true;
      }
      if (Array.isArray(data.dailyMenu) && data.dailyMenu.length > 0) {
        current.dailyMenus = data.dailyMenu;
        changed = true;
      }
      if (changed) {
        current.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
        writeStore(current);
        console.log(`[AutoSync] Synced ${current.dailyMenus.length} daily menus and ${current.menuBank.length} menu items from Google Sheets`);
      }
      return true;
    }
  } catch (err) {
    console.warn("[AutoSync] Background GAS sync warning:", err.message);
  } finally {
    isSyncingGas = false;
  }
  return false;
}
async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3e3;
  const isProd = process.env.NODE_ENV === "production";
  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ extended: true, limit: "30mb" }));
  initStore();
  syncFromGas().catch((err) => console.warn("Initial sync error:", err));
  setInterval(() => {
    syncFromGas().catch(() => {
    });
  }, 8e3);
  app.get("/api/data", async (_req, res) => {
    try {
      const data = readStore();
      if (!data.dailyMenus || data.dailyMenus.length === 0) {
        await syncFromGas();
      }
      const latest = readStore();
      res.json({
        success: true,
        settings: latest.settings,
        menuBank: latest.menuBank,
        dailyMenus: latest.dailyMenus,
        lastUpdated: latest.lastUpdated
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/save", async (req, res) => {
    try {
      const { settings, menuBank, dailyMenus, syncToGas } = req.body;
      const current = readStore();
      if (settings) {
        current.settings = { ...current.settings, ...settings };
      }
      if (Array.isArray(menuBank)) {
        current.menuBank = menuBank;
      }
      if (Array.isArray(dailyMenus)) {
        current.dailyMenus = dailyMenus;
      }
      writeStore(current);
      const gasUrl = current.settings.gasWebAppUrl || DEFAULT_SETTINGS.gasWebAppUrl;
      if (gasUrl && syncToGas !== false) {
        callGas(gasUrl, {
          action: "syncAll",
          settings: current.settings,
          menuBank: current.menuBank,
          dailyMenu: current.dailyMenus
        }).catch((e) => console.warn("Background GAS sync warning:", e.message));
      }
      res.json({
        success: true,
        lastUpdated: current.lastUpdated
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/upload-logo", async (req, res) => {
    try {
      const { fileData, fileName, mimeType } = req.body;
      if (!fileData) {
        return res.status(400).json({ success: false, error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E1F\u0E25\u0E4C\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E" });
      }
      const current = readStore();
      const gasUrl = current.settings?.gasWebAppUrl;
      if (gasUrl) {
        try {
          const gasRes = await callGas(gasUrl, {
            action: "uploadLogo",
            fileData,
            fileName: fileName || `school_logo_${Date.now()}.png`,
            mimeType: mimeType || "image/png"
          });
          if (gasRes.status === "success" && (gasRes.directUrl || gasRes.logoUrl)) {
            const driveUrl = gasRes.directUrl || gasRes.logoUrl;
            current.settings.logoUrl = driveUrl;
            writeStore(current);
            return res.json({
              success: true,
              logoUrl: driveUrl,
              fileId: gasRes.fileId,
              isDrive: true,
              message: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E20\u0E32\u0E1E\u0E15\u0E23\u0E32\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E25\u0E07 Google Drive \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08"
            });
          }
        } catch (gasErr) {
          console.warn("GAS uploadLogo error, fallback to server storage:", gasErr.message);
        }
      }
      current.settings.logoUrl = fileData;
      writeStore(current);
      res.json({
        success: true,
        logoUrl: fileData,
        isDrive: false,
        message: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E20\u0E32\u0E1E\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22 (\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D Google Drive \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E08\u0E31\u0E14\u0E40\u0E01\u0E47\u0E1A\u0E44\u0E1F\u0E25\u0E4C\u0E1A\u0E19\u0E44\u0E14\u0E23\u0E1F\u0E4C\u0E42\u0E14\u0E22\u0E15\u0E23\u0E07)"
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/upload-image", async (req, res) => {
    try {
      const { fileData, fileName, mimeType, activityName, date } = req.body;
      const current = readStore();
      const gasUrl = current.settings?.gasWebAppUrl;
      if (!gasUrl) {
        return res.status(400).json({
          success: false,
          error: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D Google Apps Script Web App"
        });
      }
      const gasRes = await callGas(gasUrl, {
        action: "uploadImage",
        fileData,
        fileName,
        mimeType,
        activityName,
        date
      });
      if (gasRes.status === "success") {
        res.json({
          success: true,
          photo: {
            url: gasRes.directUrl || gasRes.url,
            fileId: gasRes.fileId,
            name: gasRes.fileName || fileName,
            uploadedAt: gasRes.uploadedAt || (/* @__PURE__ */ new Date()).toLocaleString("th-TH"),
            folderName: gasRes.folderName
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: gasRes.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E44\u0E14\u0E49"
        });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/test-gas", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ success: false, error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38 Web App URL" });
      }
      let cleanUrl = url.trim();
      if (cleanUrl.includes("/macros/s/") && cleanUrl.endsWith("/dev")) {
        cleanUrl = cleanUrl.replace(/\/dev$/, "/exec");
      }
      const gasRes = await fetch(`${cleanUrl}${cleanUrl.includes("?") ? "&" : "?"}action=ping`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (!gasRes.ok) {
        throw new Error(`HTTP Error ${gasRes.status}: ${gasRes.statusText}`);
      }
      const json = await gasRes.json();
      res.json({ success: true, data: json });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/sync-gas", async (req, res) => {
    try {
      const current = readStore();
      const gasUrl = req.body?.url || current.settings?.gasWebAppUrl;
      if (!gasUrl) {
        return res.status(400).json({ success: false, error: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E30\u0E1A\u0E38 Google Apps Script URL" });
      }
      let cleanUrl = gasUrl.trim();
      if (cleanUrl.includes("/macros/s/") && cleanUrl.endsWith("/dev")) {
        cleanUrl = cleanUrl.replace(/\/dev$/, "/exec");
      }
      const gasRes = await fetch(`${cleanUrl}${cleanUrl.includes("?") ? "&" : "?"}action=getAllData`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (!gasRes.ok) {
        throw new Error(`HTTP Error ${gasRes.status}: ${gasRes.statusText}`);
      }
      const data = await gasRes.json();
      if (data.status === "success") {
        if (data.settings && Object.keys(data.settings).length > 0) {
          current.settings = { ...current.settings, ...data.settings, gasWebAppUrl: gasUrl };
        }
        if (Array.isArray(data.menuBank) && data.menuBank.length > 0) {
          current.menuBank = data.menuBank;
        }
        if (Array.isArray(data.dailyMenu) && data.dailyMenu.length > 0) {
          current.dailyMenus = data.dailyMenu;
        }
        writeStore(current);
        return res.json({
          success: true,
          settings: current.settings,
          menuBank: current.menuBank,
          dailyMenus: current.dailyMenus,
          spreadsheetUrl: data.spreadsheetUrl
        });
      } else {
        throw new Error(data.message || "\u0E0B\u0E34\u0E07\u0E04\u0E4C\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08");
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer();
