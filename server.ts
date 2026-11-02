import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = fs.existsSync(path.resolve(process.cwd(), 'data'))
  ? path.resolve(process.cwd(), 'data')
  : path.resolve(__dirname, 'data');
const STORE_PATH = path.resolve(DATA_DIR, 'store.json');

import { INITIAL_MENU_BANK } from './src/data/initialData';

// Default initial data fallback
const DEFAULT_SETTINGS = {
  schoolName: 'โรงเรียนบ้านนาออก',
  department: 'สังกัดสำนักงานเขตพื้นที่ประถมศึกษากระบี่',
  managerName: '',
  directorName: '',
  logoUrl: 'https://lh3.googleusercontent.com/d/1tJ0PObYNbFQy_N59gj0ZKWkYLN-7a96n',
  gasWebAppUrl: 'https://script.google.com/macros/s/AKfycbzKYFt1-hn2Qq9bnrsQpG9PMhehuuq6yuaE2e6Tq8ogIB1Ft6EQV4FdyzUkL5RxTKqf/exec'
};

let lastServerSaveTime = 0;

interface StoreData {
  settings: typeof DEFAULT_SETTINGS;
  menuBank: any[];
  dailyMenus: any[];
  taxRecords?: any[];
  deletedDates?: string[];
  lastUpdated: string;
}

// Known legacy template dummy dishes that do NOT exist in the user's menuBank
const FORBIDDEN_DUMMY_DISHES = new Set([
  'ข้าวสวยหอมมะลิใหม่',
  'ข้าวกล้องเกษตรอินทรีย์หอมนุ่ม',
  'ข้าวกล้องเกษตรอินทรีย์',
  'ข้าวสวยหอมมะลิ',
  'ข้าวมันไก่ตอนสูตรอนามัย น้ำซุปฟักหวาน',
  'ก๋วยเตี๋ยวเส้นหมี่น้ำใสลูกชิ้นปลาหมูสับ',
  'ก๋วยเตี๋ยวหมูสับน้ำใส ลูกชิ้นปลา',
  'ข้าวมันไก่ต้ม พร้อมน้ำซุปฟัก',
  'ต้มจืดเต้าหู้หมูสับสาหร่ายวากาเมะแครอท',
  'ต้มจืดเต้าหู้หมูสับสาหร่ายวากาเมะ',
  'ไข่พะโล้โบราณหมูสามชั้น เต้าหู้พวง',
  'ไข่พะโล้หมูสามชั้น เต้าหู้พวง',
  'แกงเขียวหวานไก่ใส่มะเขือเปราะใบโหระพา',
  'แกงเขียวหวานไก่ใส่ฟักและมะเขือเปราะ',
  'ผัดกะเพราหมูสับใบกะเพราบ้าน (เผ็ดน้อยสำหรับเด็ก)',
  'ผัดกะเพราหมูสับใบกะเพราบ้าน',
  'กล้วยน้ำว้าอินทรีย์สวนโรงเรียน',
  'กล้วยน้ำว้าเกษตรอินทรีย์',
  'แตงโมกินรีหวานฉ่ำหั่นชิ้นพอดีคำ',
  'แตงโมหวานฉ่ำหั่นชิ้น',
  'บัวลอยเผือกมะพร้าวอ่อนกะทิสดหวานน้อย',
  'กล้วยบวชชีงาขาวคั่วหอมกรุ่น',
  'สับปะรดภูแลหวานกรอบ',
  'ส้มสายน้ำผึ้งสด',
  'ผัดซีอิ๊วหมูนุ่มใส่คะน้าฮ่องกง',
  'ข้าวผัดอเมริกัน น่องไก่ทอด',
  'แกงจืดฟักเขียวกระดูกหมูเห็ดหอม',
  'ผัดผักรวมมิตรใส่กุ้งสด',
  'แกงเผ็ดหมูใส่หน่อไม้สด'
]);

// Ensure store exists on disk
function initStore(): StoreData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(STORE_PATH)) {
    try {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        settings: parsed.settings || DEFAULT_SETTINGS,
        menuBank: parsed.menuBank || INITIAL_MENU_BANK,
        dailyMenus: parsed.dailyMenus || [],
        taxRecords: parsed.taxRecords || [],
        deletedDates: parsed.deletedDates || [],
        lastUpdated: parsed.lastUpdated || new Date().toISOString()
      };
    } catch (e) {
      console.error('Error reading store.json, re-initializing', e);
    }
  }

  const initialStore: StoreData = {
    settings: DEFAULT_SETTINGS,
    menuBank: INITIAL_MENU_BANK,
    dailyMenus: [],
    taxRecords: [],
    deletedDates: [],
    lastUpdated: new Date().toISOString()
  };

  fs.writeFileSync(STORE_PATH, JSON.stringify(initialStore, null, 2), 'utf-8');
  return initialStore;
}

function mergeDailyEntry(existing: any, incoming: any): any {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const result = { ...existing, ...incoming };
  const dishFields = ['rice', 'singleDish', 'spicy', 'nonSpicy', 'dessert'] as const;

  dishFields.forEach((field) => {
    const incVal = incoming[field] ? String(incoming[field]).trim() : '';
    const existVal = existing[field] ? String(existing[field]).trim() : '';
    // หากข้อมูลใหม่เป็นช่องว่าง แต่ข้อมูลเดิมมีเมนูอยู่แล้ว ให้รักษาเมนูเดิมไว้เด็ดขาด ไม่ลบออก
    if (!incVal && existVal) {
      result[field] = existVal;
    } else if (incVal) {
      result[field] = incVal;
    }
  });

  if ((!result.photos || result.photos.length === 0) && (existing.photos && existing.photos.length > 0)) {
    result.photos = existing.photos;
  }

  return result;
}

function sanitizeDailyMenus(list: any[]): any[] {
  if (!Array.isArray(list)) return [];
  const map = new Map<string, any>();
  list.forEach((item) => {
    if (!item || !item.date) return;
    const cleanDate = String(item.date).trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      const copy = { ...item, date: cleanDate };
      ['rice', 'singleDish', 'spicy', 'nonSpicy', 'dessert'].forEach((field) => {
        if (copy[field] && FORBIDDEN_DUMMY_DISHES.has(String(copy[field]).trim())) {
          copy[field] = '';
        }
      });
      map.set(cleanDate, copy);
    }
  });
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function readStore(): StoreData {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return initStore();
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.dailyMenus) {
      parsed.dailyMenus = sanitizeDailyMenus(parsed.dailyMenus);
    }
    return parsed;
  } catch (err) {
    console.error('readStore error:', err);
    return initStore();
  }
}

function writeStore(data: StoreData): void {
  try {
    data.lastUpdated = new Date().toISOString();
    if (data.dailyMenus) {
      data.dailyMenus = sanitizeDailyMenus(data.dailyMenus);
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('writeStore error:', err);
  }
}

// Helper to call GAS backend
async function callGas(url: string, payload: any): Promise<any> {
  let cleanUrl = url.trim();
  if (cleanUrl.includes('/macros/s/') && cleanUrl.endsWith('/dev')) {
    cleanUrl = cleanUrl.replace(/\/dev$/, '/exec');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
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

// Background synchronization from Google Sheets
let isSyncingGas = false;
async function syncFromGas(gasUrl?: string): Promise<boolean> {
  if (isSyncingGas) return false;
  if (Date.now() - lastServerSaveTime < 60000) return false;
  isSyncingGas = true;

  try {
    const current = readStore();
    const targetUrl = gasUrl || current.settings?.gasWebAppUrl || DEFAULT_SETTINGS.gasWebAppUrl;
    if (!targetUrl) return false;

    let cleanUrl = targetUrl.trim();
    if (cleanUrl.includes('/macros/s/') && cleanUrl.endsWith('/dev')) {
      cleanUrl = cleanUrl.replace(/\/dev$/, '/exec');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}action=getAllData`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) return false;

    const data = await res.json();
    if (data && data.status === 'success') {
      let changed = false;
      if (data.settings && Object.keys(data.settings).length > 0) {
        current.settings = { ...current.settings, ...data.settings, gasWebAppUrl: targetUrl };
        changed = true;
      }
      if (Array.isArray(data.menuBank) && data.menuBank.length > 0) {
        current.menuBank = data.menuBank;
        changed = true;
      }
      if (Array.isArray(data.dailyMenu)) {
        const deletedSet = new Set(current.deletedDates || []);
        const sanitized = sanitizeDailyMenus(data.dailyMenu).filter((item) => !deletedSet.has(item.date));
        
        const existingMap = new Map<string, any>();
        (current.dailyMenus || []).forEach((item: any) => {
          if (item && item.date && !deletedSet.has(item.date)) {
            existingMap.set(item.date, item);
          }
        });

        // Non-destructively merge incoming GAS entries
        sanitized.forEach((gasItem: any) => {
          const date = gasItem.date;
          const existing = existingMap.get(date);
          const gasHasFood = Boolean(
            (gasItem.singleDish && String(gasItem.singleDish).trim()) ||
            (gasItem.rice && String(gasItem.rice).trim()) ||
            (gasItem.spicy && String(gasItem.spicy).trim()) ||
            (gasItem.nonSpicy && String(gasItem.nonSpicy).trim())
          );

          if (!existing) {
            // เพิ่มวันที่ใหม่จาก GAS เฉพาะกรณีที่มีเมนูอาหารจริงเท่านั้น ห้ามเพิ่มแถวว่างเปล่า
            if (gasHasFood) {
              existingMap.set(date, gasItem);
            }
          } else {
            // หากมีอยู่แล้ว ให้ผสานข้อมูลโดยรักษาเมนูเดิมที่มีอยู่เสมอ
            existingMap.set(date, mergeDailyEntry(existing, gasItem));
          }
        });

        const merged = Array.from(existingMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        if (JSON.stringify(merged) !== JSON.stringify(current.dailyMenus || [])) {
          current.dailyMenus = merged;
          changed = true;
        }
      }
      if (Array.isArray(data.taxRecords) && data.taxRecords.length > 0) {
        current.taxRecords = data.taxRecords;
        changed = true;
      }
      if (changed) {
        current.lastUpdated = new Date().toISOString();
        writeStore(current);
        console.log(`[AutoSync] Synced ${current.dailyMenus.length} daily menus, ${current.menuBank.length} menu items, and ${(current.taxRecords || []).length} tax records from Google Sheets`);
      }
      return true;
    }
  } catch (err: any) {
    console.warn('[AutoSync] Background GAS sync warning:', err.message);
  } finally {
    isSyncingGas = false;
  }
  return false;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // Ensure store exists on startup
  initStore();

  // Always perform sync from Google Sheets on server startup
  syncFromGas().catch((err) => console.warn('Initial GAS sync notice:', err));

  // Periodic automatic synchronization from Google Sheets (every 30s) across all devices
  setInterval(() => {
    if (Date.now() - lastServerSaveTime > 45000) {
      syncFromGas().catch((err) => console.warn('Periodic GAS sync notice:', err));
    }
  }, 30000);

  // -----------------------------------------------------------------
  // 1. GET /api/data - Fetch all synchronized school data
  // -----------------------------------------------------------------
  app.get('/api/data', async (_req, res) => {
    try {
      const latest = readStore();
      res.json({
        success: true,
        settings: latest.settings,
        menuBank: latest.menuBank,
        dailyMenus: latest.dailyMenus,
        taxRecords: latest.taxRecords || [],
        deletedDates: latest.deletedDates || [],
        lastUpdated: latest.lastUpdated
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -----------------------------------------------------------------
  // 2. POST /api/save - Save and sync data across all devices
  // -----------------------------------------------------------------
  app.post('/api/save', async (req, res) => {
    try {
      const { settings, menuBank, dailyMenus, taxRecords, deletedDates, syncToGas } = req.body;
      const current = readStore();

      if (settings) {
        current.settings = { ...current.settings, ...settings };
      }
      if (Array.isArray(menuBank)) {
        current.menuBank = menuBank;
      }
      if (Array.isArray(dailyMenus)) {
        const existingMap = new Map<string, any>();
        (current.dailyMenus || []).forEach((item: any) => {
          if (item && item.date) {
            existingMap.set(String(item.date).trim().slice(0, 10), item);
          }
        });

        const incomingClean = sanitizeDailyMenus(dailyMenus);
        incomingClean.forEach((item: any) => {
          const date = item.date;
          const existing = existingMap.get(date);
          if (!existing) {
            existingMap.set(date, item);
          } else {
            existingMap.set(date, mergeDailyEntry(existing, item));
          }
        });

        current.dailyMenus = Array.from(existingMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      }
      if (Array.isArray(taxRecords)) {
        current.taxRecords = taxRecords;
      }
      if (Array.isArray(deletedDates)) {
        current.deletedDates = deletedDates;
      }

      // ปลดล็อควันที่ทั้งหมดที่มีรายการอาหารออกจาก deletedDates เสมอ
      if (Array.isArray(current.dailyMenus) && current.deletedDates) {
        const savedDates = new Set(current.dailyMenus.map((m: any) => m && m.date && String(m.date).trim().slice(0, 10)));
        current.deletedDates = current.deletedDates.filter((d) => !savedDates.has(d));
      }

      lastServerSaveTime = Date.now();
      writeStore(current);

      // Debounced background sync to GAS (merges rapid edits into 1 call)
      const gasUrl = current.settings.gasWebAppUrl || DEFAULT_SETTINGS.gasWebAppUrl;
      if (gasUrl && syncToGas !== false) {
        if ((global as any).__gasSyncTimer) {
          clearTimeout((global as any).__gasSyncTimer);
        }
        (global as any).__gasSyncTimer = setTimeout(() => {
          callGas(gasUrl, {
            action: 'syncAll',
            settings: current.settings,
            menuBank: current.menuBank,
            dailyMenus: current.dailyMenus,
            dailyMenu: current.dailyMenus,
            taxRecords: current.taxRecords || []
          }).catch((e) => console.warn('Background GAS sync warning:', e.message));
        }, 400);
      }

      res.json({
        success: true,
        deletedDates: current.deletedDates || [],
        lastUpdated: current.lastUpdated
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -----------------------------------------------------------------
  // 2.1 POST /api/delete-daily-menu - Permanent deletion across all devices
  // -----------------------------------------------------------------
  app.post('/api/delete-daily-menu', async (req, res) => {
    try {
      const { date, dates } = req.body;
      const targetDates: string[] = Array.isArray(dates) ? dates : (date ? [date] : []);
      if (targetDates.length === 0) {
        return res.status(400).json({ success: false, error: 'No dates provided' });
      }

      const current = readStore();
      const toDeleteSet = new Set(targetDates.map((d: string) => String(d).trim().slice(0, 10)));

      // กรองรายการอาหารที่ถูกลบออกอย่างเด็ดขาด
      current.dailyMenus = (current.dailyMenus || []).filter((m) => !toDeleteSet.has(m.date));
      current.deletedDates = Array.from(new Set([...(current.deletedDates || []), ...Array.from(toDeleteSet)]));

      lastServerSaveTime = Date.now();
      writeStore(current);

      // สั่งซิงค์ลง Google Sheets แบบทันทีเพื่อล้างข้อมูลแถวที่ลบออกจากชีต
      const gasUrl = current.settings.gasWebAppUrl || DEFAULT_SETTINGS.gasWebAppUrl;
      if (gasUrl) {
        callGas(gasUrl, {
          action: 'syncAll',
          settings: current.settings,
          menuBank: current.menuBank,
          dailyMenus: current.dailyMenus,
          dailyMenu: current.dailyMenus,
          taxRecords: current.taxRecords || []
        }).catch((err) => console.warn('GAS delete sync notice:', err.message));
      }

      res.json({
        success: true,
        deletedDates: Array.from(toDeleteSet),
        dailyMenus: current.dailyMenus,
        lastUpdated: current.lastUpdated
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -----------------------------------------------------------------
  // 3. POST /api/upload-logo - Save logo directly to Google Drive
  // -----------------------------------------------------------------
  app.post('/api/upload-logo', async (req, res) => {
    try {
      const { fileData, fileName, mimeType } = req.body;
      if (!fileData) {
        return res.status(400).json({ success: false, error: 'ไม่พบข้อมูลไฟล์รูปภาพ' });
      }

      const current = readStore();
      const gasUrl = current.settings?.gasWebAppUrl;

      // If Google Apps Script is connected, upload directly to Google Drive
      if (gasUrl) {
        try {
          const gasRes = await callGas(gasUrl, {
            action: 'uploadLogo',
            fileData,
            fileName: fileName || `school_logo_${Date.now()}.png`,
            mimeType: mimeType || 'image/png'
          });

          if (gasRes.status === 'success' && (gasRes.directUrl || gasRes.logoUrl)) {
            const driveUrl = gasRes.directUrl || gasRes.logoUrl;
            current.settings.logoUrl = driveUrl;
            writeStore(current);

            return res.json({
              success: true,
              logoUrl: driveUrl,
              fileId: gasRes.fileId,
              isDrive: true,
              message: 'บันทึกภาพตราโรงเรียนลง Google Drive สำเร็จ'
            });
          }
        } catch (gasErr: any) {
          console.warn('GAS uploadLogo error, fallback to server storage:', gasErr.message);
        }
      }

      // Fallback: Store logo in persistent central store
      current.settings.logoUrl = fileData;
      writeStore(current);

      res.json({
        success: true,
        logoUrl: fileData,
        isDrive: false,
        message: 'บันทึกภาพในระบบเรียบร้อย (เชื่อมต่อ Google Drive เพื่อจัดเก็บไฟล์บนไดรฟ์โดยตรง)'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -----------------------------------------------------------------
  // 4. POST /api/upload-image - Upload activity food photo to Google Drive
  // -----------------------------------------------------------------
  app.post('/api/upload-image', async (req, res) => {
    try {
      const { fileData, fileName, mimeType, activityName, date } = req.body;
      const current = readStore();
      const gasUrl = current.settings?.gasWebAppUrl;

      if (!gasUrl) {
        return res.status(400).json({
          success: false,
          error: 'ยังไม่ได้เชื่อมต่อ Google Apps Script Web App'
        });
      }

      const gasRes = await callGas(gasUrl, {
        action: 'uploadImage',
        fileData,
        fileName,
        mimeType,
        activityName,
        date
      });

      if (gasRes.status === 'success') {
        res.json({
          success: true,
          photo: {
            url: gasRes.directUrl || gasRes.url,
            fileId: gasRes.fileId,
            name: gasRes.fileName || fileName,
            uploadedAt: gasRes.uploadedAt || new Date().toLocaleString('th-TH'),
            folderName: gasRes.folderName
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: gasRes.message || 'ไม่สามารถอัปโหลดได้'
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -----------------------------------------------------------------
  // 5. POST /api/test-gas - Test GAS connection & sync
  // -----------------------------------------------------------------
  app.post('/api/test-gas', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ success: false, error: 'กรุณาระบุ Web App URL' });
      }

      let cleanUrl = url.trim();
      if (cleanUrl.includes('/macros/s/') && cleanUrl.endsWith('/dev')) {
        cleanUrl = cleanUrl.replace(/\/dev$/, '/exec');
      }

      const gasRes = await fetch(`${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}action=ping`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!gasRes.ok) {
        throw new Error(`HTTP Error ${gasRes.status}: ${gasRes.statusText}`);
      }

      const json = await gasRes.json();
      res.json({ success: true, data: json });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -----------------------------------------------------------------
  // 6. POST /api/sync-gas - Pull all data from Google Sheets into server
  // -----------------------------------------------------------------
  app.post('/api/sync-gas', async (req, res) => {
    try {
      const current = readStore();
      const gasUrl = req.body?.url || current.settings?.gasWebAppUrl;

      if (!gasUrl) {
        return res.status(400).json({ success: false, error: 'ยังไม่ได้ระบุ Google Apps Script URL' });
      }

      let cleanUrl = gasUrl.trim();
      if (cleanUrl.includes('/macros/s/') && cleanUrl.endsWith('/dev')) {
        cleanUrl = cleanUrl.replace(/\/dev$/, '/exec');
      }

      const gasRes = await fetch(`${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}action=getAllData`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!gasRes.ok) {
        throw new Error(`HTTP Error ${gasRes.status}: ${gasRes.statusText}`);
      }

      const data = await gasRes.json();
      if (data.status === 'success') {
        if (data.settings && Object.keys(data.settings).length > 0) {
          current.settings = { ...current.settings, ...data.settings, gasWebAppUrl: gasUrl };
        }
        if (Array.isArray(data.menuBank) && data.menuBank.length > 0) {
          current.menuBank = data.menuBank;
        }
        if (Array.isArray(data.dailyMenu) && data.dailyMenu.length > 0) {
          current.dailyMenus = sanitizeDailyMenus(data.dailyMenu);
        }
        if (Array.isArray(data.taxRecords) && data.taxRecords.length > 0) {
          current.taxRecords = data.taxRecords;
        }

        writeStore(current);
        return res.json({
          success: true,
          settings: current.settings,
          menuBank: current.menuBank,
          dailyMenus: current.dailyMenus,
          taxRecords: current.taxRecords || [],
          spreadsheetUrl: data.spreadsheetUrl
        });
      } else {
        throw new Error(data.message || 'ซิงค์ข้อมูลไม่สำเร็จ');
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -----------------------------------------------------------------
  // 6. GET /api/download-code-gs - Direct download for Google Apps Script file
  // -----------------------------------------------------------------
  app.get(['/api/download-code-gs', '/Code.gs'], (_req, res) => {
    const codeGsPath = path.resolve(process.cwd(), 'Code.gs');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Code.gs"');
    if (fs.existsSync(codeGsPath)) {
      return res.sendFile(codeGsPath);
    }
    return res.status(404).send('Code.gs not found');
  });

  // -----------------------------------------------------------------
  // Vite Dev Middleware or Production Static Serving
  // -----------------------------------------------------------------
  const distPath = fs.existsSync(path.resolve(process.cwd(), 'dist'))
    ? path.resolve(process.cwd(), 'dist')
    : path.resolve(__dirname, 'dist');

  if (!isProd && fs.existsSync(path.resolve(process.cwd(), 'vite.config.ts'))) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexPath = path.resolve(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Not Found');
      }
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
