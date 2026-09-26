import React, { useState, useEffect, useRef } from 'react';
import { 
  MenuItem, 
  DailyMenuEntry, 
  SchoolSettings, 
  ToastNotification, 
  ActivityPhoto 
} from './types';
import { 
  INITIAL_SETTINGS, 
  INITIAL_MENU_BANK, 
  INITIAL_DAILY_MENUS 
} from './data/initialData';
import { Header } from './components/Header';
import { MenuRepository } from './components/MenuRepository';
import { DailyMenuPlanner } from './components/DailyMenuPlanner';
import { PrintReport } from './components/PrintReport';
import { SettingsModal } from './components/SettingsModal';
import { LightboxModal } from './components/LightboxModal';
import { NotificationToast } from './components/NotificationToast';
import { 
  callGasGet, 
  callGasPost, 
  fetchServerData,
  saveServerData,
  saveSingleDailyMenuDirect,
  saveSingleMenuItemDirect,
  subscribeToLocalSync,
  uploadLogoToServer,
  uploadPhotoToServer,
  testGasConnection,
  syncWithGas
} from './services/api';

const STORAGE_KEY_SETTINGS = 'school_lunch_settings_v1';
const STORAGE_KEY_MENU_BANK = 'school_lunch_menu_bank_v1';
const STORAGE_KEY_DAILY_MENUS = 'school_lunch_daily_menus_v2';

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<'planner' | 'repository' | 'report' | 'settings'>('planner');

  // Real-time synchronization state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Core Data States with localStorage persistence as fast-boot cache
  const [settings, setSettings] = useState<SchoolSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.gasWebAppUrl) {
          parsed.gasWebAppUrl = INITIAL_SETTINGS.gasWebAppUrl;
        }
        return parsed;
      }
      return INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [menuBank, setMenuBank] = useState<MenuItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MENU_BANK);
      return saved ? JSON.parse(saved) : INITIAL_MENU_BANK;
    } catch {
      return INITIAL_MENU_BANK;
    }
  });

  const [dailyMenus, setDailyMenus] = useState<DailyMenuEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DAILY_MENUS) || localStorage.getItem('school_lunch_daily_menus_v1');
      if (saved) {
        const parsed: DailyMenuEntry[] = JSON.parse(saved);
        return parsed.map((item) => ({ ...item, photos: item.photos || [] }));
      }
      return INITIAL_DAILY_MENUS;
    } catch {
      return INITIAL_DAILY_MENUS;
    }
  });

  // GAS / Cloud connection status
  const [isGasConnected, setIsGasConnected] = useState<boolean>(Boolean(settings.gasWebAppUrl));

  // Lightbox Modal state
  const [lightboxData, setLightboxData] = useState<{
    photo: ActivityPhoto;
    allPhotos: ActivityPhoto[];
    onReplace?: (newPhoto: ActivityPhoto) => void;
    onDelete?: () => void;
  } | null>(null);

  // Notification Toasts state
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  // Ref to track last updated timestamp from server to prevent overwrite loops
  const lastServerTimestampRef = useRef<string>('');
  // Ref to track last local save timestamp to protect freshly randomized/saved data from race conditions
  const lastLocalSaveTimeRef = useRef<number>(0);

  // Active / Targeted Month & Year for Report & Planner synchronization
  const [activeReportMonth, setActiveReportMonth] = useState<number>(() => {
    const d = new Date();
    return d.getMonth() + 1;
  });
  const [activeReportYear, setActiveReportYear] = useState<number>(() => {
    const d = new Date();
    return d.getFullYear();
  });

  const handleNavigateToReport = (month?: number, year?: number) => {
    if (month) setActiveReportMonth(month);
    if (year) setActiveReportYear(year);
    setActiveTab('report');
  };

  const handleNavigateToPlanner = (_date?: string) => {
    setActiveTab('planner');
  };

  // Sync to localStorage as client cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Storage error', e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MENU_BANK, JSON.stringify(menuBank));
    } catch (e) {
      console.error('Storage error', e);
    }
  }, [menuBank]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DAILY_MENUS, JSON.stringify(dailyMenus));
    } catch (e) {
      console.error('Storage error', e);
    }
  }, [dailyMenus]);

  // Toast Helper
  const showToast = (
    title: string,
    message?: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'success'
  ) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const newToast: ToastNotification = {
      id,
      title,
      message,
      type,
      timestamp: Date.now()
    };

    setNotifications((prev) => [...prev, newToast]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setNotifications((prev) => prev.filter((t) => t.id !== id));
  };

  // -------------------------------------------------------------
  // Real-Time Cross-Device Synchronization
  // ซิงค์ข้อมูลข้ามอุปกรณ์ ทุกเบราว์เซอร์ และทุกบัญชีอีเมล
  // -------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    let isPulling = false;

    // 0. ซิงค์ข้ามแท็บในเครื่องเดียวกันทันทีด้วย BroadcastChannel (0ms ละเอียดระดับเรียลไทม์)
    const unsubscribeSync = subscribeToLocalSync((event) => {
      if (!isMounted) return;
      if (event.type === 'ALL' && event.payload) {
        if (event.payload.settings) setSettings(event.payload.settings);
        if (event.payload.menuBank) setMenuBank(event.payload.menuBank);
        if (event.payload.dailyMenus) setDailyMenus(event.payload.dailyMenus);
      } else if (event.type === 'DAILY_MENU' && event.payload) {
        const entry = event.payload;
        setDailyMenus((prev) => {
          const idx = prev.findIndex((m) => m.date === entry.date);
          if (idx >= 0) {
            const cp = [...prev];
            cp[idx] = entry;
            return cp;
          }
          return [...prev, entry].sort((a, b) => a.date.localeCompare(b.date));
        });
      } else if (event.type === 'MENU_BANK' && event.payload) {
        const item = event.payload;
        setMenuBank((prev) => {
          const exists = prev.some((m) => m.id === item.id);
          return exists ? prev.map((m) => (m.id === item.id ? item : m)) : [item, ...prev];
        });
      }
    });

    const pullServerData = async (isInitial = false) => {
      if (isPulling) return;
      // ป้องกันการดึงข้อมูลทับข้อมูลที่เพิ่งสุ่มหรือบันทึกใหม่ในเครื่องภายใน 45 วินาที
      if (!isInitial && Date.now() - lastLocalSaveTimeRef.current < 45000) {
        return;
      }

      isPulling = true;
      if (!isInitial) setIsSyncing(true);
      try {
        const data = await fetchServerData(settings.gasWebAppUrl);
        if (!isMounted || !data || !data.success) return;

        const shouldUpdate = isInitial || (data.lastUpdated && data.lastUpdated !== lastServerTimestampRef.current);
        if (shouldUpdate) {
          lastServerTimestampRef.current = data.lastUpdated || '';

          if (data.settings && Object.keys(data.settings).length > 0) {
            setSettings((prev) => ({ ...prev, ...data.settings }));
            if (data.settings.gasWebAppUrl) {
              setIsGasConnected(true);
            }
          }

          if (Array.isArray(data.menuBank) && data.menuBank.length > 0) {
            setMenuBank(data.menuBank);
          }

          if (Array.isArray(data.dailyMenus)) {
            setDailyMenus(data.dailyMenus);
          }
        }
      } catch (err) {
        console.warn('Central server sync poll warning:', err);
      } finally {
        isPulling = false;
        if (isMounted) setIsSyncing(false);
      }
    };

    // 1. Initial pull from server/cloud
    pullServerData(true);

    // 2. Refresh on window focus (เมื่อกลับมาที่แท็บหรือปลดล็อคหน้าจอ)
    const onWindowFocus = () => {
      pullServerData(false);
    };
    window.addEventListener('focus', onWindowFocus);

    // 3. Refresh on tab visibility change
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pullServerData(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // 4. Periodic polling ทุก 15 วินาทีเมื่อเปิดหน้าจออยู่ (ป้องกันการยิงเซิร์ฟเวอร์ถี่เกินไปและประหยัดโควต้า)
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        pullServerData(false);
      }
    }, 15000);

    return () => {
      isMounted = false;
      unsubscribeSync();
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(intervalId);
    };
  }, []);

  // -------------------------------------------------------------
  // Menu Repository Actions (Module 1)
  // -------------------------------------------------------------
  const handleAddMenuItem = async (item: Omit<MenuItem, 'id'>) => {
    const newItem: MenuItem = {
      ...item,
      id: 'mb-' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    };

    const updated = [newItem, ...menuBank];
    setMenuBank(updated);
    showToast('เพิ่มเมนูสำเร็จ', `บันทึก "${item.menuName}" ในหมวด ${item.category} แล้ว`, 'success');

    // ซิงค์เฉพาะรายการใหม่แบบความเร็วสูงพิเศษ (Fast single item save)
    saveSingleMenuItemDirect(newItem, settings.gasWebAppUrl);
    saveServerData({ settings, menuBank: updated, dailyMenus, syncToGas: false });
  };

  const handleUpdateMenuItem = async (item: MenuItem) => {
    const updated = menuBank.map((m) => (m.id === item.id ? item : m));
    setMenuBank(updated);
    showToast('อัปเดตเมนูแล้ว', `แก้ไขข้อมูล "${item.menuName}" เรียบร้อยแล้ว`, 'success');

    saveSingleMenuItemDirect(item, settings.gasWebAppUrl);
    saveServerData({ settings, menuBank: updated, dailyMenus, syncToGas: false });
  };

  const handleDeleteMenuItem = async (id: string) => {
    const target = menuBank.find((m) => m.id === id);
    const updated = menuBank.filter((m) => m.id !== id);
    setMenuBank(updated);
    showToast('ลบเมนูแล้ว', `ลบรายการ "${target?.menuName || ''}" ออกจากคลังแล้ว`, 'info');

    if (settings.gasWebAppUrl) {
      callGasPost(settings.gasWebAppUrl, {
        action: 'deleteMenuItem',
        id: id
      }).catch((e) => console.warn('Delete menu warning:', e));
    }

    saveServerData({ settings, menuBank: updated, dailyMenus, syncToGas: false });
  };

  const handleSeedPresets = async () => {
    setMenuBank(INITIAL_MENU_BANK);
    showToast('เติมเมนูตัวอย่างแล้ว', 'รีเซ็ตคลังเมนูอาหารกลางวันมาตรฐานโรงเรียนแล้ว', 'success');
    await saveServerData({ menuBank: INITIAL_MENU_BANK, syncToGas: true });
  };

  // -------------------------------------------------------------
  // Daily Menu Planner Actions (Module 2)
  // -------------------------------------------------------------
  const handleSaveDailyMenu = async (entry: DailyMenuEntry): Promise<boolean> => {
    lastLocalSaveTimeRef.current = Date.now();
    const existingIndex = dailyMenus.findIndex((m) => m.date === entry.date);
    let updated: DailyMenuEntry[];

    if (existingIndex >= 0) {
      updated = [...dailyMenus];
      updated[existingIndex] = entry;
    } else {
      updated = [...dailyMenus, entry];
      updated.sort((a, b) => a.date.localeCompare(b.date));
    }

    setDailyMenus(updated);
    try {
      localStorage.setItem(STORAGE_KEY_DAILY_MENUS, JSON.stringify(updated));
    } catch (e) {
      console.error('Storage error', e);
    }

    // ซิงค์เฉพาะวันที่บันทึกไปยัง Google Sheets ใน ~300ms แทนการวนลูปทั้งเดือน
    saveSingleDailyMenuDirect(entry, settings.gasWebAppUrl);
    const saveRes = await saveServerData({ settings, menuBank, dailyMenus: updated, syncToGas: false });
    if (saveRes && saveRes.lastUpdated) {
      lastServerTimestampRef.current = saveRes.lastUpdated;
    }

    return true;
  };

  const handleBatchSaveDailyMenus = async (entries: DailyMenuEntry[]): Promise<boolean> => {
    lastLocalSaveTimeRef.current = Date.now();
    if (entries.length > 0) {
      const [y, m] = entries[0].date.split('-').map(Number);
      if (y && m) {
        setActiveReportYear(y);
        setActiveReportMonth(m);
      }
    }

    // กำหนดกลุ่มเดือนที่มีการสุ่มหรือบันทึกใหม่
    // แทนที่รายการของเดือนนั้นทั้งหมด เพื่อล้างข้อมูลวันที่ตกค้าง วันที่ซ้ำ หรือข้อมูลเก่าให้สะอาดหมดจด
    const incomingMonthPrefixes = new Set(entries.map((e) => e.date.slice(0, 7)));

    // เก็บรายการของเดือนอื่นๆ ไว้ตามเดิม
    const otherMonthsEntries = dailyMenus.filter(
      (m) => !incomingMonthPrefixes.has(m.date.slice(0, 7))
    );

    // ทำความสะอาดและป้องกันวันที่ซ้ำซ้อนในกลุ่มข้อมูลที่ส่งเข้ามา
    const newMonthMap = new Map<string, DailyMenuEntry>();
    entries.forEach((e) => {
      const cleanDate = e.date.trim().slice(0, 10);
      newMonthMap.set(cleanDate, { ...e, date: cleanDate });
    });

    const updated = [...otherMonthsEntries, ...Array.from(newMonthMap.values())].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    setDailyMenus(updated);
    try {
      localStorage.setItem(STORAGE_KEY_DAILY_MENUS, JSON.stringify(updated));
    } catch (e) {
      console.error('Storage error', e);
    }

    // ซิงค์ทั้งเดือนด้วย High-speed Batch mode (ครั้งเดียวจบ ไม่วนลูป 20 ครั้ง)
    const saveRes = await saveServerData({ settings, menuBank, dailyMenus: updated, syncToGas: true });
    if (saveRes && saveRes.lastUpdated) {
      lastServerTimestampRef.current = saveRes.lastUpdated;
    }
    return true;
  };

  // ปุ่มกดซิงค์ด่วนด้วยมือ
  const handleManualSync = async () => {
    setIsSyncing(true);
    showToast('กำลังซิงค์ข้อมูล...', 'กำลังดึงข้อมูลล่าสุดจากคลาวด์', 'info');
    try {
      const data = await fetchServerData(settings.gasWebAppUrl);
      if (data && data.success) {
        if (data.settings) setSettings((p) => ({ ...p, ...data.settings }));
        if (data.menuBank) setMenuBank(data.menuBank);
        if (data.dailyMenus) setDailyMenus(data.dailyMenus);
        showToast('ซิงค์ข้อมูลสำเร็จ', 'ข้อมูลล่าสุดตรงกันทุกอุปกรณ์แล้ว', 'success');
      } else {
        showToast('ซิงค์เรียบร้อย', 'ข้อมูลในเครื่องเป็นเวอร์ชันล่าสุดแล้ว', 'success');
      }
    } catch (err: any) {
      showToast('ซิงค์ไม่สำเร็จ', err.message || 'โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteDailyMenu = async (dateStr: string) => {
    lastLocalSaveTimeRef.current = Date.now();
    const updated = dailyMenus.filter((m) => m.date !== dateStr);
    setDailyMenus(updated);
    try {
      localStorage.setItem(STORAGE_KEY_DAILY_MENUS, JSON.stringify(updated));
    } catch (e) {
      console.error('Storage error', e);
    }
    showToast('ลบข้อมูลเรียบร้อย', `ลบเมนูวันที่ ${dateStr} แล้ว`, 'info');

    const saveRes = await saveServerData({ settings, menuBank, dailyMenus: updated, syncToGas: true });
    if (saveRes && saveRes.lastUpdated) {
      lastServerTimestampRef.current = saveRes.lastUpdated;
    }

    if (settings.gasWebAppUrl) {
      try {
        await callGasPost(settings.gasWebAppUrl, {
          action: 'deleteDailyMenu',
          date: dateStr
        });
      } catch (err) {
        console.warn('GAS deleteDailyMenu warning:', err);
      }
    }
  };

  const handleBatchDeleteDailyMenus = async (dates: string[]) => {
    if (dates.length === 0) return;
    lastLocalSaveTimeRef.current = Date.now();
    const dateSet = new Set(dates);
    const updated = dailyMenus.filter((m) => !dateSet.has(m.date));
    setDailyMenus(updated);
    try {
      localStorage.setItem(STORAGE_KEY_DAILY_MENUS, JSON.stringify(updated));
    } catch (e) {
      console.error('Storage error', e);
    }
    showToast('ลบข้อมูลเรียบร้อย', `ลบรายการอาหารที่เลือกจำนวน ${dates.length} วันแล้ว`, 'info');

    const saveRes = await saveServerData({ settings, menuBank, dailyMenus: updated, syncToGas: true });
    if (saveRes && saveRes.lastUpdated) {
      lastServerTimestampRef.current = saveRes.lastUpdated;
    }

    if (settings.gasWebAppUrl) {
      try {
        await callGasPost(settings.gasWebAppUrl, {
          action: 'syncAll',
          settings,
          menuBank,
          dailyMenus: updated,
          dailyMenu: updated
        });
      } catch (err) {
        console.warn('GAS batch delete sync warning:', err);
      }
    }
  };

  // -------------------------------------------------------------
  // Image & Logo Upload Actions (Google Drive Native)
  // -------------------------------------------------------------
  const handleUploadImageToDrive = async (
    fileData: string,
    fileName: string,
    mimeType: string,
    activityName: string,
    dateStr: string
  ): Promise<ActivityPhoto> => {
    try {
      // 1. Try server endpoint which communicates with Google Drive
      const photo = await uploadPhotoToServer(fileData, fileName, mimeType, activityName, dateStr);
      return photo;
    } catch (serverErr) {
      // 2. Direct client fallback to GAS if configured
      if (settings.gasWebAppUrl) {
        const res = await callGasPost(settings.gasWebAppUrl, {
          action: 'uploadImage',
          fileData,
          fileName,
          mimeType,
          activityName,
          date: dateStr
        });

        if (res.status === 'success') {
          return {
            url: res.directUrl || res.url,
            fileId: res.fileId,
            name: res.fileName || fileName,
            uploadedAt: res.uploadedAt || new Date().toLocaleString('th-TH'),
            folderName: res.folderName
          };
        } else {
          throw new Error(res.message || 'ไม่สามารถอัปโหลดไปยัง Google Drive ได้');
        }
      }
      throw serverErr;
    }
  };

  const handleUploadLogo = async (
    fileData: string,
    fileName: string,
    mimeType: string
  ): Promise<{ logoUrl: string; isDrive: boolean; message?: string }> => {
    try {
      const res = await uploadLogoToServer(fileData, fileName, mimeType);
      if (res && res.success && res.logoUrl) {
        setSettings((prev) => ({ ...prev, logoUrl: res.logoUrl }));
        return {
          logoUrl: res.logoUrl,
          isDrive: res.isDrive,
          message: res.message
        };
      }
      throw new Error(res?.message || 'ไม่สามารถบันทึกตราสัญลักษณ์ได้');
    } catch (err: any) {
      // Direct GAS upload fallback if available
      if (settings.gasWebAppUrl) {
        try {
          const gasRes = await callGasPost(settings.gasWebAppUrl, {
            action: 'uploadLogo',
            fileData,
            fileName,
            mimeType
          });
          if (gasRes.status === 'success' && (gasRes.directUrl || gasRes.logoUrl)) {
            const driveUrl = gasRes.directUrl || gasRes.logoUrl;
            setSettings((prev) => ({ ...prev, logoUrl: driveUrl }));
            await saveServerData({ settings: { ...settings, logoUrl: driveUrl } });
            return {
              logoUrl: driveUrl,
              isDrive: true,
              message: 'บันทึกภาพลง Google Drive เรียบร้อยแล้ว'
            };
          }
        } catch (gasErr) {
          console.warn('Direct GAS logo upload failed:', gasErr);
        }
      }

      // Local fallback
      setSettings((prev) => ({ ...prev, logoUrl: fileData }));
      await saveServerData({ settings: { ...settings, logoUrl: fileData } });
      return {
        logoUrl: fileData,
        isDrive: false,
        message: 'บันทึกภาพในระบบแล้ว'
      };
    }
  };

  // -------------------------------------------------------------
  // Settings Actions
  // -------------------------------------------------------------
  const handleSaveSettings = async (updated: SchoolSettings) => {
    setSettings(updated);
    if (updated.gasWebAppUrl) {
      setIsGasConnected(true);
    }

    // Save to central server to sync to all devices immediately
    await saveServerData({ settings: updated, syncToGas: true });

    if (updated.gasWebAppUrl) {
      try {
        await callGasPost(updated.gasWebAppUrl, {
          action: 'saveSettings',
          data: updated
        });
      } catch (err) {
        console.warn('GAS saveSettings warning:', err);
      }
    }
  };

  const handleTestGasConnection = async (url: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await testGasConnection(url);
      if (res && res.success) {
        setIsGasConnected(true);
        return {
          success: true,
          message: res.data?.message || 'เชื่อมต่อ Google Apps Script และ Google Sheets สำเร็จสมบูรณ์'
        };
      }
      setIsGasConnected(false);
      return {
        success: false,
        message: 'การตอบกลับจาก Google Apps Script ไม่สมบูรณ์'
      };
    } catch (err: any) {
      // Direct ping fallback
      try {
        const direct = await callGasGet(url, { action: 'ping' });
        if (direct && direct.status === 'success') {
          setIsGasConnected(true);
          return {
            success: true,
            message: 'เชื่อมต่อ Google Apps Script และ Google Sheets สำเร็จสมบูรณ์'
          };
        }
      } catch (directErr) {
        console.warn('Direct ping error:', directErr);
      }

      setIsGasConnected(false);
      return {
        success: false,
        message: err?.message || 'ไม่สามารถเชื่อมต่อ Google Apps Script ได้ (โปรดตรวจสอบสิทธิ์ Anyone)'
      };
    }
  };

  const handleSyncGas = async (url: string): Promise<boolean> => {
    try {
      const res = await syncWithGas(url);
      if (res && res.success) {
        if (res.settings) {
          setSettings((prev) => ({ ...prev, ...res.settings, gasWebAppUrl: url }));
        }
        if (res.menuBank) {
          setMenuBank(res.menuBank);
        }
        if (res.dailyMenus) {
          setDailyMenus(res.dailyMenus);
        }
        setIsGasConnected(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error('handleSyncGas error:', err);
      return false;
    }
  };

  // -------------------------------------------------------------
  // Lightbox Handler
  // -------------------------------------------------------------
  const handleOpenLightbox = (
    photo: ActivityPhoto,
    allPhotos: ActivityPhoto[],
    onReplace?: (newPhoto: ActivityPhoto) => void,
    onDelete?: () => void
  ) => {
    setLightboxData({
      photo,
      allPhotos,
      onReplace,
      onDelete
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header with live clock & navigation */}
      <Header
        settings={settings}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isGasConnected={isGasConnected}
        isSyncing={isSyncing}
        onManualSync={handleManualSync}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'planner' && (
          <DailyMenuPlanner
            dailyMenus={dailyMenus}
            menuBank={menuBank}
            onSaveDailyMenu={handleSaveDailyMenu}
            onBatchSaveDailyMenus={handleBatchSaveDailyMenus}
            onDeleteDailyMenu={handleDeleteDailyMenu}
            onBatchDeleteDailyMenus={handleBatchDeleteDailyMenus}
            onOpenLightbox={handleOpenLightbox}
            showToast={showToast}
            gasWebAppUrl={settings.gasWebAppUrl}
            onUploadImageToDrive={handleUploadImageToDrive}
            onNavigateToReport={handleNavigateToReport}
            onActiveMonthYearChange={(m, y) => {
              setActiveReportMonth(m);
              setActiveReportYear(y);
            }}
          />
        )}

        {activeTab === 'repository' && (
          <MenuRepository
            menuBank={menuBank}
            onAddMenuItem={handleAddMenuItem}
            onUpdateMenuItem={handleUpdateMenuItem}
            onDeleteMenuItem={handleDeleteMenuItem}
            onSeedPresets={handleSeedPresets}
          />
        )}

        {activeTab === 'report' && (
          <PrintReport
            dailyMenus={dailyMenus}
            settings={settings}
            showToast={showToast}
            menuBank={menuBank}
            onSaveDailyMenu={handleSaveDailyMenu}
            onDeleteDailyMenu={handleDeleteDailyMenu}
            onBatchDeleteDailyMenus={handleBatchDeleteDailyMenus}
            onBatchSaveDailyMenus={handleBatchSaveDailyMenus}
            initialMonth={activeReportMonth}
            initialYear={activeReportYear}
            onNavigateToPlanner={handleNavigateToPlanner}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsModal
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onUploadLogo={handleUploadLogo}
            onTestGasConnection={handleTestGasConnection}
            onSyncGas={handleSyncGas}
            showToast={showToast}
          />
        )}
      </main>

      {/* Lightbox Modal */}
      {lightboxData && (
        <LightboxModal
          photo={lightboxData.photo}
          allPhotos={lightboxData.allPhotos}
          onClose={() => setLightboxData(null)}
          onDelete={lightboxData.onDelete}
          onReplace={lightboxData.onReplace}
          showToast={showToast}
        />
      )}

      {/* Interactive Toast Notifications Container */}
      <NotificationToast
        notifications={notifications}
        onDismiss={dismissToast}
      />
    </div>
  );
}
