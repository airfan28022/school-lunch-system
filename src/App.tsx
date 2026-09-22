import React, { useState, useEffect } from 'react';
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
  formatDriveDirectUrl 
} from './services/api';

const STORAGE_KEY_SETTINGS = 'school_lunch_settings_v1';
const STORAGE_KEY_MENU_BANK = 'school_lunch_menu_bank_v1';
const STORAGE_KEY_DAILY_MENUS = 'school_lunch_daily_menus_v2';

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<'planner' | 'repository' | 'report' | 'settings'>('planner');

  // Core Data States with localStorage persistence
  const [settings, setSettings] = useState<SchoolSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
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
        return parsed.map((item) => ({ ...item, photos: [] }));
      }
      return INITIAL_DAILY_MENUS;
    } catch {
      return INITIAL_DAILY_MENUS;
    }
  });

  // GAS connection status
  const [isGasConnected, setIsGasConnected] = useState<boolean>(false);

  // Lightbox Modal state
  const [lightboxData, setLightboxData] = useState<{
    photo: ActivityPhoto;
    allPhotos: ActivityPhoto[];
    onReplace?: (newPhoto: ActivityPhoto) => void;
    onDelete?: () => void;
  } | null>(null);

  // Notification Toasts state
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  // Sync to localStorage
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

  // Attempt initial sync with GAS if URL configured
  useEffect(() => {
    if (!settings.gasWebAppUrl) return;

    let isMounted = true;
    callGasGet(settings.gasWebAppUrl, { action: 'getAllData' })
      .then((res) => {
        if (!isMounted) return;
        if (res.status === 'success') {
          setIsGasConnected(true);
          if (res.settings && Object.keys(res.settings).length > 0) {
            setSettings((prev) => ({ ...prev, ...res.settings }));
          }
          if (res.menuBank && res.menuBank.length > 0) {
            setMenuBank(res.menuBank);
          }
          if (res.dailyMenu && res.dailyMenu.length > 0) {
            setDailyMenus(res.dailyMenu);
          }
          showToast('ซิงค์ข้อมูลสำเร็จ', 'ดึงข้อมูลล่าสุดจาก Google Sheets และ Drive เรียบร้อย', 'info');
        }
      })
      .catch((err) => {
        console.warn('Initial GAS fetch error:', err);
        setIsGasConnected(false);
      });

    return () => {
      isMounted = false;
    };
  }, [settings.gasWebAppUrl]);

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

  const handleSeedPresets = () => {
    setMenuBank(INITIAL_MENU_BANK);
    showToast('เติมเมนูตัวอย่างแล้ว', 'รีเซ็ตคลังเมนูอาหารกลางวันมาตรฐานโรงเรียนแล้ว', 'success');
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

  const handleDeleteDailyMenu = async (dateStr: string) => {
    if (!window.confirm(`คุณต้องการลบข้อมูลเมนูอาหารของวันที่ ${dateStr} ใช่หรือไม่?`)) {
      return;
    }

    const updated = dailyMenus.filter((m) => m.date !== dateStr);
    setDailyMenus(updated);
    showToast('ลบข้อมูลเรียบร้อย', `ลบเมนูวันที่ ${dateStr} แล้ว`, 'info');

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

  const handleUploadImageToDrive = async (
    fileData: string,
    fileName: string,
    mimeType: string,
    activityName: string,
    dateStr: string
  ): Promise<ActivityPhoto> => {
    if (!settings.gasWebAppUrl) {
      throw new Error('ยังไม่ได้เชื่อมต่อ Google Apps Script');
    }

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
      throw new Error(res.message || 'ไม่สามารถอัปโหลดได้');
    }
  };

  // -------------------------------------------------------------
  // Settings Actions
  // -------------------------------------------------------------
  const handleSaveSettings = async (updated: SchoolSettings) => {
    setSettings(updated);
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
      const res = await callGasGet(url, { action: 'ping' });
      if (res && res.status === 'success') {
        setIsGasConnected(true);
        return {
          success: true,
          message: res.message || 'เชื่อมต่อ Google Apps Script และ Google Sheets สำเร็จสมบูรณ์'
        };
      }
      setIsGasConnected(false);
      return {
        success: false,
        message: res?.message || 'สคริปต์ตอบกลับ แต่สถานะไม่สำเร็จ'
      };
    } catch (err: any) {
      console.warn('GAS connection test result:', err?.message || err);
      setIsGasConnected(false);
      return {
        success: false,
        message: err?.message || 'ไม่สามารถเชื่อมต่อ Google Apps Script ได้ (Failed to fetch)'
      };
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
            onDeleteDailyMenu={handleDeleteDailyMenu}
            onOpenLightbox={handleOpenLightbox}
            showToast={showToast}
            gasWebAppUrl={settings.gasWebAppUrl}
            onUploadImageToDrive={settings.gasWebAppUrl ? handleUploadImageToDrive : undefined}
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
          />
        )}

        {activeTab === 'settings' && (
          <SettingsModal
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onTestGasConnection={handleTestGasConnection}
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
