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

// Default initial data fallback
const DEFAULT_SETTINGS = {
  schoolName: 'โรงเรียนอนุบาลและประถมศึกษาเทศบาลพัฒนา',
  department: 'สังกัดสำนักการศึกษา เทศบาลนครนนทบุรี',
  managerName: 'นางกาญจนา มงคลสุข (หัวหน้างานโภชนาการโรงเรียน)',
  directorName: 'นายประเสริฐ วัฒนาภิรมย์ (ผู้อำนวยการสถานศึกษา)',
  logoUrl: 'https://lh3.googleusercontent.com/d/1elzE02MEWHhTvxpvVECoFj7y9NpxYg2j',
  gasWebAppUrl: 'https://script.google.com/macros/s/AKfycbzKYFt1-hn2Qq9bnrsQpG9PMhehuuq6yuaE2e6Tq8ogIB1Ft6EQV4FdyzUkL5RxTKqf/exec'
};

interface StoreData {
  settings: typeof DEFAULT_SETTINGS;
  menuBank: any[];
  dailyMenus: any[];
  lastUpdated: string;
}

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
        menuBank: parsed.menuBank || [],
        dailyMenus: parsed.dailyMenus || [],
        lastUpdated: parsed.lastUpdated || new Date().toISOString()
      };
    } catch (e) {
      console.error('Error reading store.json, re-initializing', e);
    }
  }

  // Load from initialData if store doesn't exist
  let initialMenuBank: any[] = [];
  let initialDailyMenus: any[] = [];
  try {
    const initDataPath = path.resolve(__dirname, 'src', 'data', 'initialData.ts');
    if (fs.existsSync(initDataPath)) {
      // Basic fallback
      initialMenuBank = [
        { id: 'mb-01', category: 'ข้าว', menuName: 'ข้าวสวยหอมมะลิใหม่', createdAt: '2026-09-01' },
        { id: 'mb-02', category: 'ข้าว', menuName: 'ข้าวกล้องเกษตรอินทรีย์หอมนุ่ม', createdAt: '2026-09-01' },
        { id: 'mb-05', category: 'อาหารจานเดียว', menuName: 'ข้าวมันไก่ตอนสูตรอนามัย น้ำซุปฟักหวาน', createdAt: '2026-09-01' },
        { id: 'mb-06', category: 'อาหารจานเดียว', menuName: 'ก๋วยเตี๋ยวเส้นหมี่น้ำใสลูกชิ้นปลาหมูสับ', createdAt: '2026-09-01' },
        { id: 'mb-11', category: 'อาหารไม่เผ็ด', menuName: 'ต้มจืดเต้าหู้หมูสับสาหร่ายวากาเมะแครอท', createdAt: '2026-09-01' },
        { id: 'mb-12', category: 'อาหารไม่เผ็ด', menuName: 'ไข่พะโล้โบราณหมูสามชั้น เต้าหู้พวง', createdAt: '2026-09-01' },
        { id: 'mb-18', category: 'อาหารเผ็ด', menuName: 'แกงเขียวหวานไก่ใส่มะเขือเปราะใบโหระพา', createdAt: '2026-09-01' },
        { id: 'mb-19', category: 'อาหารเผ็ด', menuName: 'ผัดกะเพราหมูสับใบกะเพราบ้าน (เผ็ดน้อยสำหรับเด็ก)', createdAt: '2026-09-01' },
        { id: 'mb-23', category: 'ผลไม้', menuName: 'กล้วยน้ำว้าอินทรีย์สวนโรงเรียน', createdAt: '2026-09-01' },
        { id: 'mb-24', category: 'ผลไม้', menuName: 'แตงโมกินรีหวานฉ่ำหั่นชิ้นพอดีคำ', createdAt: '2026-09-01' },
        { id: 'mb-26', category: 'ของหวาน', menuName: 'บัวลอยเผือกมะพร้าวอ่อนกะทิสดหวานน้อย', createdAt: '2026-09-01' },
        { id: 'mb-27', category: 'ของหวาน', menuName: 'กล้วยบวชชีงาขาวคั่วหอมกรุ่น', createdAt: '2026-09-01' }
      ];
    }
  } catch (err) {
    console.warn('Initial data load warning:', err);
  }

  const initialStore: StoreData = {
    settings: DEFAULT_SETTINGS,
    menuBank: initialMenuBank,
    dailyMenus: initialDailyMenus,
    lastUpdated: new Date().toISOString()
  };

  fs.writeFileSync(STORE_PATH, JSON.stringify(initialStore, null, 2), 'utf-8');
  return initialStore;
}

function readStore(): StoreData {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return initStore();
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('readStore error:', err);
    return initStore();
  }
}

function writeStore(data: StoreData): void {
  try {
    data.lastUpdated = new Date().toISOString();
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
  const timeoutId = setTimeout(() => controller.abort(), 20000);

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
      if (Array.isArray(data.dailyMenu) && data.dailyMenu.length > 0) {
        current.dailyMenus = data.dailyMenu;
        changed = true;
      }
      if (changed) {
        current.lastUpdated = new Date().toISOString();
        writeStore(current);
        console.log(`[AutoSync] Synced ${current.dailyMenus.length} daily menus and ${current.menuBank.length} menu items from Google Sheets`);
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

  // Instantly trigger initial sync from Google Sheets in background
  syncFromGas().catch((err) => console.warn('Initial sync error:', err));

  // Run periodic background sync from Google Sheets every 60 seconds (prevents Google quota exhaustion)
  setInterval(() => {
    syncFromGas().catch(() => {});
  }, 60000);

  // -----------------------------------------------------------------
  // 1. GET /api/data - Fetch all synchronized school data
  // -----------------------------------------------------------------
  app.get('/api/data', async (_req, res) => {
    try {
      const data = readStore();
      // If store is empty or has fewer than expected items, trigger immediate sync
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
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -----------------------------------------------------------------
  // 2. POST /api/save - Save and sync data across all devices
  // -----------------------------------------------------------------
  app.post('/api/save', async (req, res) => {
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
            dailyMenu: current.dailyMenus
          }).catch((e) => console.warn('Background GAS sync warning:', e.message));
        }, 1200);
      }

      res.json({
        success: true,
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
        throw new Error(data.message || 'ซิงค์ข้อมูลไม่สำเร็จ');
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -----------------------------------------------------------------
  // Vite Dev Middleware or Production Static Serving
  // -----------------------------------------------------------------
  const distPath = fs.existsSync(path.resolve(process.cwd(), 'dist'))
    ? path.resolve(process.cwd(), 'dist')
    : path.resolve(__dirname, 'dist');

  if (!isProd && fs.existsSync(path.resolve(process.cwd(), 'vite.config.ts'))) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
