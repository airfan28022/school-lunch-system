import { DailyMenuEntry, MenuItem, SchoolSettings, ActivityPhoto } from '../types';

export const FALLBACK_IMAGE_URL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23fef3c7"/><circle cx="200" cy="140" r="60" fill="%23fde68a" stroke="%23f59e0b" stroke-width="4"/><path d="M170 140 Q200 110 230 140" stroke="%23ea580c" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="185" cy="130" r="5" fill="%23ea580c"/><circle cx="215" cy="130" r="5" fill="%23ea580c"/><text x="200" y="240" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23b45309" text-anchor="middle">ภาพอาหารกลางวันโรงเรียน</text></svg>';

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

/**
 * ยิงเรียก Google Apps Script Backend (GET)
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
      headers: {
        'Accept': 'application/json'
      },
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
        'Failed to fetch: ไม่สามารถเชื่อมต่อกับ Google Apps Script ได้ (สาเหตุส่วนใหญ่: 1. ยังไม่ได้ตั้งค่า Who has access เป็น "Anyone" หรือ 2. ยังไม่ได้เปิดอนุญาตสิทธิ์เข้าถึงบัญชี Google ให้กับสคริปต์)'
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

/**
 * ดึงข้อมูลที่ซิงค์ส่วนกลางจาก Server (ใช้ร่วมกันทุกเครื่อง ทุกเบราว์เซอร์ ทุกอีเมล)
 */
export async function fetchServerData() {
  try {
    const res = await fetch('/api/data', {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('fetchServerData error:', err);
    return null;
  }
}

/**
 * บันทึกข้อมูลขึ้น Server เพื่อซิงค์ไปทุกเครื่อง ทุกอุปกรณ์ทันที
 */
export async function saveServerData(payload: {
  settings?: SchoolSettings;
  menuBank?: MenuItem[];
  dailyMenus?: DailyMenuEntry[];
  syncToGas?: boolean;
}) {
  try {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('saveServerData error:', err);
    return null;
  }
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
