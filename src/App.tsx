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

    const pullServerData = async (isInitial = false) => {
      if (isPulling) return;
      isPulling = true;
      try {
        const data = await fetchServerData();
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

          if (Array.isArray(data.dailyMenus) && data.dailyMenus.length > 0) {
            setDailyMenus(data.dailyMenus);
          }
        }
      } catch (err) {
        console.warn('Central server sync poll warning:', err);
      } finally {
        isPulling = false;
      }
    };

    // 1. Initial pull from server
    pullServerData(true);

    // 2. Refresh on window focus (when user switches back to browser tab or device unlocks)
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

    // 4. Periodic polling every 5 seconds for smooth cross-device auto-sync
    const intervalId = setInterval(() => {
      pullServerData(false);
    }, 5000);

    return () => {
      isMounted = false;
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

    // Save to server for cross-device sync
    await saveServerData({ settings, menuBank: updated, dailyMenus, syncToGas: true });

    // Sync to GAS in background if configured
    if (settings.gasWebAppUrl) {
      try {
        await callGasPost(settings.gasWebAppUrl, {
          action: 'saveMenuItem',
          data: newItem
        });
      } catch (err) {
        console.error('GAS saveMenuItem error:', err);
      }
    }
  };

  const handleUpdateMenuItem = async (item: MenuItem) => {
    const updated = menuBank.map((m) => (m.id === item.id ? item : m));
    setMenuBank(updated);
    showToast('อัปเดตเมนูแล้ว', `แก้ไขข้อมูล "${item.menuName}" เรียบร้อยแล้ว`, 'success');

    await saveServerData({ settings, menuBank: updated, dailyMenus, syncToGas: true });

    if (settings.gasWebAppUrl) {
      try {
        await callGasPost(settings.gasWebAppUrl, {
          action: 'saveMenuItem',
          data: item
        });
      } catch (err) {
        console.error('GAS updateMenuItem error:', err);
      }
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    const target = menuBank.find((m) => m.id === id);
    const updated = menuBank.filter((m) => m.id !== id);
    setMenuBank(updated);
    showToast('ลบเมนูแล้ว', `ลบรายการ "${target?.menuName || ''}" ออกจากคลังแล้ว`, 'info');

    await saveServerData({ settings, menuBank: updated, dailyMenus, syncToGas: true });

    if (settings.gasWebAppUrl) {
      try {
        await callGasPost(settings.gasWebAppUrl, {
          action: 'deleteMenuItem',
          id: id
        });
      } catch (err) {
        console.error('GAS deleteMenuItem error:', err);
      }
    }
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

    // Save to central server so all other devices receive this change
    await saveServerData({ settings, menuBank, dailyMenus: updated, syncToGas: true });

    // Sync to GAS in background if configured
    if (settings.gasWebAppUrl) {
      try {
        await callGasPost(settings.gasWebAppUrl, {
          action: 'saveDailyMenu',
          data: entry
        });
      } catch (err) {
        console.warn('GAS saveDailyMenu warning:', err);
      }
    }

    return true;
  };

  const handleBatchSaveDailyMenus = async (entries: DailyMenuEntry[]): Promise<boolean> => {
    const map = new Map(dailyMenus.map((m) => [m.date, m]));
    entries.forEach((e) => map.set(e.date, e));
    const updated = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    setDailyMenus(updated);

    await saveServerData({ settings, menuBank, dailyMenus: updated, syncToGas: true });

    if (settings.gasWebAppUrl) {
      try {
        for (const entry of entries) {
          await callGasPost(settings.gasWebAppUrl, {
            action: 'saveDailyMenu',
            data: entry
          });
        }
      } catch (err) {
        console.warn('GAS batchSaveDailyMenus warning:', err);
      }
    }

    return true;
  };

  const handleDeleteDailyMenu = async (dateStr: string) => {
    const updated = dailyMenus.filter((m) => m.date !== dateStr);
    setDailyMenus(updated);
    showToast('ลบข้อมูลเรียบร้อย', `ลบเมนูวันที่ ${dateStr} แล้ว`, 'info');

    await saveServerData({ settings, menuBank, dailyMenus: updated, syncToGas: true });

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
            onOpenLightbox={handleOpenLightbox}
            showToast={showToast}
            gasWebAppUrl={settings.gasWebAppUrl}
            onUploadImageToDrive={handleUploadImageToDrive}
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
