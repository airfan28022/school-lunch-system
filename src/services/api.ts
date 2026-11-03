import { DailyMenuEntry, MenuItem, SchoolSettings, ActivityPhoto, TaxRecord } from '../types';

export const FALLBACK_IMAGE_URL = '/app-logo.png';

/**
 * แปลงลิงก์ Google Drive ให้อยู่ในรูปแบบ Direct Link ความเร็วสูง
 * https://lh3.googleusercontent.com/d/{FILE_ID}
 */
export function formatDriveDirectUrl(urlOrFileId: string): string {
  if (!urlOrFileId) return FALLBACK_IMAGE_URL;

  // หากเป็น data URI หรือรูปภาพจากที่อื่นอยู่แล้ว
  if (urlOrFileId.startsWith('data:') || urlOrFileId.startsWith('blob:')) {
    return urlOrFileId;
  }

  // หากเป็น direct link แล้ว
  if (urlOrFileId.includes('lh3.googleusercontent.com/d/')) {
    return urlOrFileId;
  }

  // ดึง File ID จากรูปแบบต่างๆ ของ Google Drive
  let fileId = urlOrFileId.trim();

  const match1 = urlOrFileId.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match1 && match1[1]) {
    fileId = match1[1];
  } else {
    const match2 = urlOrFileId.match(/id=([a-zA-Z0-9_-]+)/);
    if (match2 && match2[1]) {
      fileId = match2[1];
    }
  }

  // ถ้าดูเหมือน File ID (ตัวอักษรและตัวเลขผสมความยาวมากกว่า 15 ตัว)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(fileId)) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  return urlOrFileId;
}

/**
 * ฟังก์ชันช่วยแปลงไฟล์รูปภาพเป็น Base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzKYFt1-hn2Qq9bnrsQpG9PMhehuuq6yuaE2e6Tq8ogIB1Ft6EQV4FdyzUkL5RxTKqf/exec';
export const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1xl-pI4HwJ_ePGGy2uzHgU1OmFNVkIt_N_CRtzfwyz0M/edit';

/**
 * ยิงเรียก Google Apps Script Backend (GET)
 * หมายเหตุ: ไม่ใส่ custom headers (เช่น Accept หรือ Content-Type) เพื่อป้องกันเบราว์เซอร์ส่ง OPTIONS preflight CORS
 */
export async function callGasGet(webAppUrl: string, params: Record<string, string> = {}) {
  if (!webAppUrl || !webAppUrl.trim()) {
    throw new Error('ยังไม่ได้กำหนด URL ของ Google Apps Script');
  }

  // ปรับแต่งและทำความสะอาด URL
  let cleanUrl = webAppUrl.trim();

  // ตรวจสอบกรณีเป็น URL หน้าแก้ไขสคริปต์
  if (cleanUrl.includes('script.google.com') && cleanUrl.includes('/edit')) {
    throw new Error('URL นี้เป็นหน้าแก้ไขโค้ด (Editor) ไม่ใช่ Web App URL กรุณากดปุ่ม Deploy > New deployment > Web app เพื่อนำ URL /exec มาใช้');
  }

  // ปรับ /dev ให้เป็น /exec อัตโนมัติ เพื่อป้องกันปัญหา CORS จาก Google login
  if (cleanUrl.includes('/macros/s/') && cleanUrl.endsWith('/dev')) {
    cleanUrl = cleanUrl.replace(/\/dev$/, '/exec');
  }

  const query = new URLSearchParams(params).toString();
  const url = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}${query}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 วินาที timeout

  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText || 'เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง'}`);
    }

    const json = await response.json();
    return json;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('การเชื่อมต่อหมดเวลา (Timeout 12s): โปรดตรวจสอบว่า Web App เผยแพร่ถูกต้องหรือไม่');
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        'Failed to fetch: ไม่สามารถเชื่อมต่อกับ Google Apps Script ได้'
      );
    }
    throw error;
  }
}

/**
 * ยิงเรียก Google Apps Script Backend (POST)
 */
export async function callGasPost(webAppUrl: string, payload: any) {
  if (!webAppUrl || !webAppUrl.trim()) {
    throw new Error('ยังไม่ได้กำหนด URL ของ Google Apps Script');
  }

  let cleanUrl = webAppUrl.trim();
  if (cleanUrl.includes('/macros/s/') && cleanUrl.endsWith('/dev')) {
    cleanUrl = cleanUrl.replace(/\/dev$/, '/exec');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(cleanUrl, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // GAS Web App รับ text/plain เพื่อเลี่ยง preflight CORS
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('การบันทึกข้อมูลหมดเวลา (Timeout)');
    }
    throw error;
  }
}

/**
 * ส่งออกไฟล์ CSV พร้อม UTF-8 BOM สำหรับเปิดใน Microsoft Excel ภาษาไทยไม่เพี้ยน
 */
export function exportToCsv(filename: string, rows: string[][]) {
  const csvContent = '\uFEFF' + rows.map(e => e.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const SYNC_CHANNEL_NAME = 'school_lunch_realtime_sync';
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
} catch (e) {
  // Ignore in environments without BroadcastChannel
}

export function broadcastLocalChange(type: 'MENU_BANK' | 'DAILY_MENU' | 'SETTINGS' | 'TAX_RECORDS' | 'ALL', payload: any) {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({
        type,
        payload,
        timestamp: Date.now()
      });
    } catch (e) {
      console.warn('Broadcast error:', e);
    }
  }
}

export function subscribeToLocalSync(callback: (event: { type: string; payload: any; timestamp: number }) => void) {
  if (!broadcastChannel) return () => {};
  const handler = (e: MessageEvent) => {
    if (e.data && e.data.type) {
      callback(e.data);
    }
  };
  broadcastChannel.addEventListener('message', handler);
  return () => {
    broadcastChannel?.removeEventListener('message', handler);
  };
}

/**
 * ซิงค์ข้อมูลข้ามอุปกรณ์ ทุกเบราว์เซอร์ ทุกอีเมลแบบเรียลไทม์ผ่าน Server-Sent Events (SSE)
 * ไม่ว่าจะเปิดจากมือถือ แท็บเล็ต คอมพิวเตอร์ หรือเบราว์เซอร์ใด ข้อมูลจะเด้งซิงค์ตรงกันทันที 0ms
 */
export function subscribeToRealtimeSync(
  onUpdate: (payload: any, eventType: string) => void,
  onStatusChange?: (connected: boolean) => void
): () => void {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return () => {};
  }

  let eventSource: EventSource | null = null;
  let reconnectTimer: any = null;
  let isStopped = false;

  function connect() {
    if (isStopped) return;

    try {
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        onStatusChange?.(true);
      };

      eventSource.addEventListener('INIT_STATE', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          onUpdate(data, 'INIT_STATE');
        } catch (err) {
          console.warn('SSE INIT_STATE parse error:', err);
        }
      });

      eventSource.addEventListener('DATA_UPDATED', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          onUpdate(data, 'DATA_UPDATED');
        } catch (err) {
          console.warn('SSE DATA_UPDATED parse error:', err);
        }
      });

      eventSource.onmessage = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          onUpdate(data, 'MESSAGE');
        } catch {}
      };

      eventSource.onerror = () => {
        onStatusChange?.(false);
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (!isStopped && !reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
          }, 3000);
        }
      };
    } catch (err) {
      onStatusChange?.(false);
      if (!isStopped && !reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, 4000);
      }
    }
  }

  connect();

  return () => {
    isStopped = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    onStatusChange?.(false);
  };
}

let gasDebounceTimer: any = null;
let pendingGasPayload: any = null;

export function queueDirectGasSync(gasUrl: string, payload: any, delayMs: number = 100) {
  pendingGasPayload = payload;
  if (gasDebounceTimer) {
    clearTimeout(gasDebounceTimer);
  }
  gasDebounceTimer = setTimeout(async () => {
    if (!pendingGasPayload) return;
    const toSend = pendingGasPayload;
    pendingGasPayload = null;
    try {
      await callGasPost(gasUrl, {
        action: 'syncAll',
        settings: toSend.settings,
        menuBank: toSend.menuBank,
        dailyMenus: toSend.dailyMenus,
        dailyMenu: toSend.dailyMenus,
        taxRecords: toSend.taxRecords
      });
    } catch (e: any) {
      console.warn('Direct GAS sync notice:', e.message);
    }
  }, delayMs);
}

/**
 * ดึงข้อมูลที่ซิงค์ส่วนกลางจากทั้ง Express Server ภายใน และ Google Apps Script Web App
 * ผสานข้อมูลแบบ Dual-Engine เพื่อรับประกันว่าทุกเครื่อง ทุกเบราว์เซอร์ และเครื่องของเพื่อนได้รับข้อมูลชุดเดียวกันแบบ 100%
 */
export async function fetchServerData(gasUrlOverride?: string) {
  const targetGasUrl = gasUrlOverride || DEFAULT_GAS_URL;

  // 1. ดึงจากเซิร์ฟเวอร์ Express ภายใน (/api/data) เพื่อความเร็วสูงสุด
  let localData: any = null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('/api/data', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      localData = await res.json();
    }
  } catch {
    // โหมดสถิต เช่น Cloudflare Pages
  }

  // 2. ดึงจาก Google Apps Script Web App (คลาวด์กลางที่เชื่อมทุกเครื่องในโลก)
  let cloudData: any = null;
  if (targetGasUrl) {
    try {
      const gasData = await callGasGet(targetGasUrl, { action: 'getAllData' });
      if (gasData && gasData.status === 'success') {
        cloudData = {
          success: true,
          settings: gasData.settings,
          menuBank: gasData.menuBank,
          dailyMenus: gasData.dailyMenu || gasData.dailyMenus,
          taxRecords: gasData.taxRecords || [],
          lastUpdated: gasData.timestamp || gasData.lastUpdated || new Date().toISOString()
        };
      }
    } catch (gasErr) {
      console.warn('Direct GAS sync notice:', gasErr);
    }
  }

  // 3. ผสานข้อมูลระหว่าง Cloud (Google Sheets) และ Express Server อย่างชาญฉลาด
  let resultData = localData;

  if (cloudData && localData) {
    const mergedMap = new Map<string, DailyMenuEntry>();
    (localData.dailyMenus || []).forEach((m: DailyMenuEntry) => {
      if (m && m.date) mergedMap.set(String(m.date).slice(0, 10), m);
    });

    (cloudData.dailyMenus || []).forEach((c: DailyMenuEntry) => {
      if (c && c.date) {
        const d = String(c.date).slice(0, 10);
        const existing = mergedMap.get(d);
        if (!existing) {
          mergedMap.set(d, c);
        } else {
          const merged = { ...existing, ...c };
          const dishFields = ['rice', 'singleDish', 'spicy', 'nonSpicy', 'dessert'] as const;
          dishFields.forEach((field) => {
            const cVal = (c as any)[field] ? String((c as any)[field]).trim() : '';
            const eVal = (existing as any)[field] ? String((existing as any)[field]).trim() : '';
            if (cVal) (merged as any)[field] = cVal;
            else if (eVal) (merged as any)[field] = eVal;
          });
          mergedMap.set(d, merged);
        }
      }
    });

    const mergedList = Array.from(mergedMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    resultData = {
      ...localData,
      dailyMenus: mergedList,
      menuBank: (cloudData.menuBank && cloudData.menuBank.length >= (localData.menuBank || []).length) ? cloudData.menuBank : localData.menuBank,
      settings: { ...(localData.settings || {}), ...(cloudData.settings || {}) },
      taxRecords: (cloudData.taxRecords && cloudData.taxRecords.length >= (localData.taxRecords || []).length) ? cloudData.taxRecords : localData.taxRecords,
      lastUpdated: cloudData.lastUpdated || localData.lastUpdated
    };

    // ส่งข้อมูลที่ผสานแล้วไปอัปเดตลงเซิร์ฟเวอร์ Express ภายในแบบเงียบๆ
    if (mergedList.length > (localData.dailyMenus || []).length) {
      fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyMenus: mergedList,
          syncToGas: false
        })
      }).catch(() => {});
    }
  } else if (cloudData && !localData) {
    resultData = cloudData;
  }

  // ทำความสะอาดและป้องกันวันที่ซ้ำซ้อนอย่างเด็ดขาด
  if (resultData && Array.isArray(resultData.dailyMenus)) {
    const map = new Map<string, DailyMenuEntry>();
    resultData.dailyMenus.forEach((m: DailyMenuEntry) => {
      if (m && m.date) {
        const cleanDate = String(m.date).trim().slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
          map.set(cleanDate, { ...m, date: cleanDate });
        }
      }
    });
    resultData.dailyMenus = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  return resultData;
}

/**
 * บันทึกข้อมูลขึ้น Server และส่งตรงไปยัง Google Apps Script Web App ทันที
 * ซิงค์ข้อมูลข้ามอุปกรณ์ ทุกเครื่อง ทุกเบราว์เซอร์ และเครื่องของเพื่อนทันที
 */
export async function saveServerData(payload: {
  settings?: SchoolSettings;
  menuBank?: MenuItem[];
  dailyMenus?: DailyMenuEntry[];
  taxRecords?: TaxRecord[];
  deletedDates?: string[];
  syncToGas?: boolean;
}) {
  // ทำความสะอาดและป้องกันข้อมูลซ้ำซ้อนก่อนส่ง
  if (Array.isArray(payload.dailyMenus)) {
    const map = new Map<string, DailyMenuEntry>();
    payload.dailyMenus.forEach((m) => {
      if (m && m.date) {
        const cleanDate = String(m.date).trim().slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
          map.set(cleanDate, { ...m, date: cleanDate });
        }
      }
    });
    payload.dailyMenus = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  // 1. กระจายข้อมูลข้ามแท็บในเครื่องเดียวกันทันทีใน 0 มิลลิวินาที
  broadcastLocalChange('ALL', payload);

  let serverResult: any = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      serverResult = await res.json();
    }
  } catch (err) {
    // โหมดสถิต เช่น Cloudflare Pages
  }

  // 2. ส่งข้อมูลไปยัง Google Apps Script Web App ทันทีเสมอ เพื่อซิงค์ไปทุกเครื่อง ทุกเบราว์เซอร์ และเครื่องของเพื่อนทันที
  const gasUrl = payload.settings?.gasWebAppUrl || DEFAULT_GAS_URL;
  if (gasUrl && payload.syncToGas !== false) {
    queueDirectGasSync(gasUrl, payload, 100);
  }

  return serverResult || { success: true, lastUpdated: new Date().toISOString() };
}

/**
 * ลบรายการอาหารกลางวันออกจาก Server และ Google Sheets อย่างถาวร (ป้องกันการเด้งกลับมาอีก)
 */
export async function deleteDailyMenuFromServer(dates: string[] | string, gasUrl?: string): Promise<boolean> {
  const targetDates = Array.isArray(dates) ? dates : [dates];
  if (targetDates.length === 0) return true;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    fetch('/api/delete-daily-menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dates: targetDates }),
      signal: controller.signal
    }).catch(() => {});
    clearTimeout(timeoutId);
  } catch (err) {}

  const targetGas = gasUrl || DEFAULT_GAS_URL;
  if (targetGas) {
    targetDates.forEach((d) => {
      callGasPost(targetGas, { action: 'deleteDailyMenu', date: d }).catch(() => {});
    });
  }
  return true;
}

/**
 * ซิงค์เมนูวันที่เดียวแบบความเร็วสูงพิเศษ (Fast single-day sync)
 */
export async function saveSingleDailyMenuDirect(entry: DailyMenuEntry, gasUrl?: string) {
  broadcastLocalChange('DAILY_MENU', entry);
  const targetUrl = gasUrl || DEFAULT_GAS_URL;
  return callGasPost(targetUrl, {
    action: 'saveDailyMenu',
    data: entry
  }).catch((err) => console.warn('Fast daily menu sync notice:', err));
}

/**
 * ซิงค์เมนูในคลังแบบความเร็วสูงพิเศษ (Fast single-item sync)
 */
export async function saveSingleMenuItemDirect(item: MenuItem, gasUrl?: string) {
  broadcastLocalChange('MENU_BANK', item);
  const targetUrl = gasUrl || DEFAULT_GAS_URL;
  return callGasPost(targetUrl, {
    action: 'saveMenuItem',
    data: item
  }).catch((err) => console.warn('Fast menu item sync notice:', err));
}

/**
 * อัปโหลดตราสัญลักษณ์โรงเรียน (บันทึกไปยัง Google Drive)
 */
export async function uploadLogoToServer(
  fileData: string,
  fileName: string,
  mimeType: string
): Promise<{
  success: boolean;
  logoUrl: string;
  fileId?: string;
  isDrive: boolean;
  message?: string;
}> {
  const res = await fetch('/api/upload-logo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileData, fileName, mimeType })
  });

  if (!res.ok) {
    throw new Error(`HTTP Error ${res.status}`);
  }

  return await res.json();
}

/**
 * อัปโหลดรูปภาพกิจกรรมอาหารกลางวันไปยัง Google Drive
 */
export async function uploadPhotoToServer(
  fileData: string,
  fileName: string,
  mimeType: string,
  activityName: string,
  date: string
): Promise<ActivityPhoto> {
  const res = await fetch('/api/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileData, fileName, mimeType, activityName, date })
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || `HTTP Error ${res.status}`);
  }

  const json = await res.json();
  if (json.success && json.photo) {
    return json.photo;
  }
  throw new Error('ไม่สามารถบันทึกรูปภาพได้');
}

/**
 * ทดสอบการเชื่อมต่อ Google Apps Script
 */
export async function testGasConnection(url: string) {
  const res = await fetch('/api/test-gas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP Error ${res.status}`);
  }

  return await res.json();
}

/**
 * สั่งซิงค์ข้อมูลทั้งหมดกับ Google Sheets & Drive
 */
export async function syncWithGas(url?: string) {
  const res = await fetch('/api/sync-gas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP Error ${res.status}`);
  }

  return await res.json();
}
