import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MenuItem, 
  DailyMenuEntry, 
  SchoolSettings, 
  ToastNotification, 
  ActivityPhoto,
  TaxRecord
} from './types';
import { 
  INITIAL_SETTINGS, 
  INITIAL_MENU_BANK, 
  INITIAL_DAILY_MENUS 
} from './data/initialData';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { DailyMenuPlanner } from './components/DailyMenuPlanner';
import { PrintReport } from './components/PrintReport';
import { TaxManagement } from './components/TaxManagement';
import { SettingsModal } from './components/SettingsModal';
import { LightboxModal } from './components/LightboxModal';
import { NotificationToast } from './components/NotificationToast';
import { LoginScreen } from './components/LoginScreen';
import { ConfirmModal } from './components/ConfirmModal';
import { 
  callGasGet, 
  callGasPost, 
  fetchServerData,
  saveServerData,
  saveSingleDailyMenuDirect,
  saveSingleMenuItemDirect,
  subscribeToLocalSync,
  subscribeToRealtimeSync,
  uploadLogoToServer,
  uploadPhotoToServer,
  testGasConnection,
  syncWithGas,
  DEFAULT_SPREADSHEET_URL,
  queueDirectGasSync,
  deleteDailyMenuFromServer
} from './services/api';

const STORAGE_KEY_SETTINGS = 'school_lunch_settings_v1';
const STORAGE_KEY_MENU_BANK = 'school_lunch_menu_bank_v1';
const STORAGE_KEY_DAILY_MENUS = 'school_lunch_daily_menus_v2';
const STORAGE_KEY_TAX_RECORDS = 'thai_school_lunch_tax_records_v1';
const STORAGE_KEY_DELETED_DATES = 'school_lunch_deleted_dates_v1';
const STORAGE_KEY_AUTH = 'school_lunch_auth';
const STORAGE_KEY_LAST_ACTIVITY = 'school_lunch_last_activity_v1';
const STORAGE_KEY_ACTIVE_TAB = 'school_lunch_active_tab_v2';
const STORAGE_KEY_ACTIVE_REPORT_MONTH = 'school_lunch_active_report_month_v2';
const STORAGE_KEY_ACTIVE_REPORT_YEAR = 'school_lunch_active_report_year_v2';
const STORAGE_KEY_LAST_LOCAL_SAVE = 'school_lunch_last_local_save_v2';
// กำหนดระยะเวลาหยุดไม่ขยับหน้าจอ: 30 นาที (30 x 60 x 1000 มิลลิวินาที)
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

// Helper ตรวจสอบว่ารายการอาหารมีเมนูจริงอยู่หรือไม่
function hasMealContent(entry: DailyMenuEntry | any): boolean {
  if (!entry) return false;
  return Boolean(
    (entry.singleDish && String(entry.singleDish).trim()) ||
    (entry.rice && String(entry.rice).trim()) ||
    (entry.spicy && String(entry.spicy).trim()) ||
    (entry.nonSpicy && String(entry.nonSpicy).trim()) ||
    (entry.dessert && String(entry.dessert).trim())
  );
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

function cleanDailyEntryDishes(entry: DailyMenuEntry): DailyMenuEntry {
  if (!entry) return entry;
  const clean = { ...entry };
  (['rice', 'singleDish', 'spicy', 'nonSpicy', 'dessert'] as const).forEach((f) => {
    const val = clean[f];
    if (val && FORBIDDEN_DUMMY_DISHES.has(val.trim())) {
      clean[f] = '';
    }
  });
  return clean;
}

function mergeDailyEntry(existing: DailyMenuEntry, incoming: DailyMenuEntry): DailyMenuEntry {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const result: DailyMenuEntry = { ...existing, ...incoming };
  const dishFields: (keyof Pick<DailyMenuEntry, 'rice' | 'singleDish' | 'spicy' | 'nonSpicy' | 'dessert'>)[] = [
    'rice',
    'singleDish',
    'spicy',
    'nonSpicy',
    'dessert'
  ];

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

export default function App() {
  // Authentication state (ID: Admin, Password: 1159551)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const savedAuth = localStorage.getItem(STORAGE_KEY_AUTH) || sessionStorage.getItem(STORAGE_KEY_AUTH);
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        if (parsed.isAuthenticated) {
          // ตรวจสอบว่าหน้าจอค้างหยุดนิ่งเกิน 30 นาทีหรือไม่
          const savedLastActivity = localStorage.getItem(STORAGE_KEY_LAST_ACTIVITY);
          if (savedLastActivity) {
            const elapsed = Date.now() - Number(savedLastActivity);
            if (elapsed >= INACTIVITY_TIMEOUT_MS) {
              localStorage.removeItem(STORAGE_KEY_AUTH);
              sessionStorage.removeItem(STORAGE_KEY_AUTH);
              localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
              return false;
            }
          }
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState<string>(() => {
    try {
      const savedAuth = localStorage.getItem(STORAGE_KEY_AUTH) || sessionStorage.getItem(STORAGE_KEY_AUTH);
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        return parsed.username || 'Admin';
      }
      return 'Admin';
    } catch {
      return 'Admin';
    }
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  // Navigation active tab - Persisted in localStorage so reload stays on the exact same view
  const [activeTab, setActiveTab] = useState<'tax' | 'planner' | 'repository' | 'report' | 'settings'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB);
      if (saved && ['tax', 'planner', 'repository', 'report', 'settings'].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return 'tax';
  });

  // Real-time synchronization state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(true);

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

  const [deletedDates, setDeletedDates] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DELETED_DATES);
      return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const [dailyMenus, setDailyMenus] = useState<DailyMenuEntry[]>(() => {
    try {
      const savedDeleted = localStorage.getItem(STORAGE_KEY_DELETED_DATES);
      const delSet = savedDeleted ? new Set<string>(JSON.parse(savedDeleted)) : new Set<string>();

      const saved = localStorage.getItem(STORAGE_KEY_DAILY_MENUS) || localStorage.getItem('school_lunch_daily_menus_v1');
      if (saved) {
        const parsed: DailyMenuEntry[] = JSON.parse(saved);
        return parsed
          .filter((item) => item && item.date && !delSet.has(item.date.trim().slice(0, 10)))
          .map((item) => cleanDailyEntryDishes({ ...item, photos: item.photos || [] }));
      }
      return INITIAL_DAILY_MENUS
        .filter((item) => item && item.date && !delSet.has(item.date.trim().slice(0, 10)))
        .map(cleanDailyEntryDishes);
    } catch {
      return INITIAL_DAILY_MENUS.map(cleanDailyEntryDishes);
    }
  });

  const [taxRecords, setTaxRecords] = useState<TaxRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TAX_RECORDS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
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
  const lastLocalSaveTimeRef = useRef<number>(
    (() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_LAST_LOCAL_SAVE);
        return saved ? Number(saved) : 0;
      } catch {
        return 0;
      }
    })()
  );

  // Active / Targeted Month & Year for Report & Planner synchronization
  const [activeReportMonth, setActiveReportMonth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_REPORT_MONTH);
      if (saved) {
        const num = Number(saved);
        if (num >= 1 && num <= 12) return num;
      }
    } catch {}
    const d = new Date();
    return d.getMonth() + 1;
  });

  const [activeReportYear, setActiveReportYear] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_REPORT_YEAR);
      if (saved) {
        const num = Number(saved);
        if (num >= 2020 && num <= 2050) return num;
      }
    } catch {}
    const d = new Date();
    return d.getFullYear();
  });

  // Persist activeTab, activeReportMonth, activeReportYear
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, activeTab);
    } catch {}
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_REPORT_MONTH, String(activeReportMonth));
    } catch {}
  }, [activeReportMonth]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_REPORT_YEAR, String(activeReportYear));
    } catch {}
  }, [activeReportYear]);

  const handleNavigateToReport = (month?: number, year?: number) => {
    if (month) {
      setActiveReportMonth(month);
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVE_REPORT_MONTH, String(month));
      } catch {}
    }
    if (year) {
      setActiveReportYear(year);
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVE_REPORT_YEAR, String(year));
      } catch {}
    }
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TAX_RECORDS, JSON.stringify(taxRecords));
    } catch (e) {
      console.error('Storage error', e);
    }
  }, [taxRecords]);

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
  // Inactivity Auto-Logout Tracker (หยุดไม่ขยับหน้าจอเกิน 30 นาที ให้ออกจากระบบทันที)
  // -------------------------------------------------------------
  const lastActivityRef = useRef<number>(Date.now());
  const lastThrottleStorageRef = useRef<number>(0);

  const handleInactivityLogout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH);
      sessionStorage.removeItem(STORAGE_KEY_AUTH);
      localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
    } catch (e) {
      console.warn('Inactivity logout storage error:', e);
    }
    setIsAuthenticated(false);
    setShowLogoutConfirm(false);
    showToast(
      'ออกจากระบบอัตโนมัติ',
      'ไม่มีการเคลื่อนไหวหรือใช้งานหน้าจอนานเกิน 30 นาที ระบบได้ออกจากระบบทันทีเพื่อความปลอดภัย',
      'warning'
    );
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    // ตั้งเวลาเริ่มต้นเมื่อเปิดหน้าจอ
    lastActivityRef.current = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, String(Date.now()));
    } catch (e) {}

    // อัปเดตเวลากิจกรรมล่าสุดเมื่อผู้ใช้ขยับเมาส์ เลื่อนหน้าจอ สัมผัส หรือกดปุ่ม
    const recordUserActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;

      // บันทึกลง localStorage แบบ Throttle ทุก 10 วินาที เพื่อประสิทธิภาพสูงสุด
      if (now - lastThrottleStorageRef.current > 10000) {
        lastThrottleStorageRef.current = now;
        try {
          localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, String(now));
        } catch (e) {}
      }
    };

    // ตรวจสอบว่าหยุดไม่ขยับเกิน 30 นาทีหรือไม่
    const checkInactivity = () => {
      const now = Date.now();
      let lastActive = lastActivityRef.current;
      try {
        const stored = localStorage.getItem(STORAGE_KEY_LAST_ACTIVITY);
        if (stored) {
          lastActive = Math.max(lastActive, Number(stored));
        }
      } catch (e) {}

      if (now - lastActive >= INACTIVITY_TIMEOUT_MS) {
        handleInactivityLogout();
      }
    };

    // ดักจับทุกเหตุการณ์การใช้งานหน้าจอ
    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'touchmove',
      'scroll',
      'wheel',
      'click'
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, recordUserActivity, { passive: true });
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkInactivity);

    // ตรวจสอบสม่ำเสมอทุก 10 วินาทีในเบื้องหลัง
    const timerId = setInterval(checkInactivity, 10000);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, recordUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkInactivity);
      clearInterval(timerId);
    };
  }, [isAuthenticated, handleInactivityLogout]);

  // -------------------------------------------------------------
  // Real-Time Cross-Device Synchronization
  // ซิงค์ข้อมูลข้ามอุปกรณ์ ทุกเบราว์เซอร์ และทุกบัญชีอีเมลแบบเรียลไทม์ 0ms
  // -------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    let isPulling = false;

    // ฟังก์ชันช่วยผสานและอัปเดตข้อมูลอาหารกลางวันจาก Server อย่างปลอดภัย ไม่ให้เมนูหายเด็ดขาด
    const applyIncomingServerPayload = (data: any, isInitial = false) => {
      if (!isMounted || !data) return;

      const shouldUpdate = isInitial || (data.lastUpdated && data.lastUpdated !== lastServerTimestampRef.current);
      if (shouldUpdate) {
        if (data.lastUpdated) {
          lastServerTimestampRef.current = data.lastUpdated;
        }

        if (data.settings && Object.keys(data.settings).length > 0) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
          if (data.settings.gasWebAppUrl) {
            setIsGasConnected(true);
          }
        }

        if (Array.isArray(data.menuBank) && data.menuBank.length > 0) {
          setMenuBank(data.menuBank);
        }

        let delSet = new Set<string>();
        if (Array.isArray(data.deletedDates)) {
          delSet = new Set(data.deletedDates);
          setDeletedDates(delSet);
          try {
            localStorage.setItem(STORAGE_KEY_DELETED_DATES, JSON.stringify(data.deletedDates));
          } catch {}
        } else {
          try {
            const savedDel = localStorage.getItem(STORAGE_KEY_DELETED_DATES);
            if (savedDel) delSet = new Set<string>(JSON.parse(savedDel));
          } catch {}
        }

        if (Array.isArray(data.dailyMenus)) {
          const clean = data.dailyMenus
            .filter(
              (m: DailyMenuEntry) => m && m.date && !delSet.has(m.date.trim().slice(0, 10))
            )
            .map(cleanDailyEntryDishes);

          setDailyMenus((prev) => {
            const mergedMap = new Map<string, DailyMenuEntry>();

            // 1. เก็บรายการเดิมในเครื่องที่ไม่ได้ถูกสั่งลบ
            prev.forEach((item) => {
              if (item && item.date && !delSet.has(item.date.trim().slice(0, 10))) {
                mergedMap.set(item.date.trim().slice(0, 10), item);
              }
            });

            // 2. ผสานข้อมูลจาก Server อย่างชาญฉลาดโดยรักษาเมนูอาหารเดิมไว้เสมอ
            clean.forEach((s: DailyMenuEntry) => {
              const sDate = s.date.trim().slice(0, 10);
              const localItem = mergedMap.get(sDate);
              if (!localItem) {
                mergedMap.set(sDate, s);
              } else {
                mergedMap.set(sDate, mergeDailyEntry(localItem, s));
              }
            });

            const mergedList = Array.from(mergedMap.values()).sort((a, b) => a.date.localeCompare(b.date));
            if (JSON.stringify(prev) === JSON.stringify(mergedList)) {
              return prev;
            }
            try {
              localStorage.setItem(STORAGE_KEY_DAILY_MENUS, JSON.stringify(mergedList));
            } catch {}
            return mergedList;
          });
        }

        if (Array.isArray(data.taxRecords)) {
          setTaxRecords(data.taxRecords);
        }
      }
    };

    // 0.1 ซิงค์ข้ามอุปกรณ์ ทุกเบราว์เซอร์ ทุกอีเมลแบบเรียลไทม์ 0ms ด้วย Server-Sent Events (SSE)
    const unsubscribeRealtime = subscribeToRealtimeSync(
      (serverData, eventType) => {
        if (!isMounted || !serverData) return;
        // หากผู้ใช้เพิ่งกดสุ่มหรือบันทึกใหม่ในเครื่องนี้เองภายใน 1.5 วินาที ให้ข้ามเพื่อไม่ชนกับคำขอในมือ
        if (Date.now() - lastLocalSaveTimeRef.current < 1500 && eventType !== 'INIT_STATE') {
          return;
        }
        applyIncomingServerPayload(serverData, eventType === 'INIT_STATE');
      },
      (connected) => {
        if (isMounted) setIsRealtimeConnected(connected);
      }
    );

    // 0.2 ซิงค์ข้ามแท็บในเครื่องเดียวกันทันทีด้วย BroadcastChannel (0ms ละเอียดระดับเรียลไทม์)
    const unsubscribeSync = subscribeToLocalSync((event) => {
      if (!isMounted) return;
      if (event.type === 'ALL' && event.payload) {
        if (event.payload.settings) setSettings(event.payload.settings);
        if (event.payload.menuBank) setMenuBank(event.payload.menuBank);
        if (event.payload.dailyMenus) setDailyMenus(event.payload.dailyMenus);
        if (event.payload.taxRecords) setTaxRecords(event.payload.taxRecords);
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
      } else if (event.type === 'TAX_RECORDS' && event.payload) {
        setTaxRecords(event.payload);
      }
    });

    const pullServerData = async (isInitial = false) => {
      if (isPulling) return;
      // ป้องกันการดึงข้อมูลทับข้อมูลที่เพิ่งสุ่มหรือบันทึกใหม่ในเครื่องภายใน 1.5 วินาที
      if (!isInitial && Date.now() - lastLocalSaveTimeRef.current < 1500) {
        return;
      }

      isPulling = true;
      if (!isInitial) setIsSyncing(true);
      try {
        const data = await fetchServerData(settings.gasWebAppUrl);
        if (!isMounted || !data || !data.success) return;

        if (!isInitial && Date.now() - lastLocalSaveTimeRef.current < 1500) {
          return;
        }

        applyIncomingServerPayload(data, isInitial);
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

    // 4. Periodic polling ทุก 5 วินาทีเมื่อเปิดหน้าจออยู่ (สำรองความปลอดภัยกรณี SSE หลุด)
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        pullServerData(false);
      }
    }, 5000);

    return () => {
      isMounted = false;
      unsubscribeRealtime();
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
    saveServerData({ settings, menuBank: updated, dailyMenus, syncToGas: true });
  };

  const handleUpdateMenuItem = async (item: MenuItem) => {
    const updated = menuBank.map((m) => (m.id === item.id ? item : m));
    setMenuBank(updated);
    showToast('อัปเดตเมนูแล้ว', `แก้ไขข้อมูล "${item.menuName}" เรียบร้อยแล้ว`, 'success');

    saveSingleMenuItemDirect(item, settings.gasWebAppUrl);
    saveServerData({ settings, menuBank: updated, dailyMenus, syncToGas: true });
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

    saveServerData({ settings, menuBank: updated, dailyMenus, syncToGas: true });
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
    const now = Date.now();
    lastLocalSaveTimeRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY_LAST_LOCAL_SAVE, String(now));
    } catch {}

    const cleanDate = entry.date.trim().slice(0, 10);
    const cleanEntry = { ...entry, date: cleanDate };

    // ปลดล็อควันที่นี้ออกจากรายการที่เคยถูกลบ เพื่อให้บันทึกหรือสุ่มใหม่ได้สำเร็จ
    let activeDelArray: string[] = [];
    setDeletedDates((prev) => {
      const next = new Set(prev);
      next.delete(cleanDate);
      activeDelArray = Array.from(next);
      try {
        localStorage.setItem(STORAGE_KEY_DELETED_DATES, JSON.stringify(activeDelArray));
      } catch (e) {}
      return next;
    });

    const existingIndex = dailyMenus.findIndex((m) => m.date === cleanDate);
    let updated: DailyMenuEntry[];

    if (existingIndex >= 0) {
      updated = [...dailyMenus];
      updated[existingIndex] = cleanEntry;
    } else {
      updated = [...dailyMenus, cleanEntry];
      updated.sort((a, b) => a.date.localeCompare(b.date));
    }

    setDailyMenus(updated);
    try {
      localStorage.setItem(STORAGE_KEY_DAILY_MENUS, JSON.stringify(updated));
    } catch (e) {
      console.error('Storage error', e);
    }

    // ซิงค์เฉพาะวันที่บันทึกไปยัง Google Sheets ใน ~300ms แทนการวนลูปทั้งเดือน
    saveSingleDailyMenuDirect(cleanEntry, settings.gasWebAppUrl);
    const saveRes = await saveServerData({ settings, menuBank, dailyMenus: updated, deletedDates: activeDelArray, syncToGas: true });
    lastLocalSaveTimeRef.current = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY_LAST_LOCAL_SAVE, String(lastLocalSaveTimeRef.current));
    } catch {}

    if (saveRes && saveRes.lastUpdated) {
      lastServerTimestampRef.current = saveRes.lastUpdated;
    }

    return true;
  };

  const handleBatchSaveDailyMenus = async (entries: DailyMenuEntry[]): Promise<boolean> => {
    const now = Date.now();
    lastLocalSaveTimeRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY_LAST_LOCAL_SAVE, String(now));
    } catch {}

    if (entries.length > 0) {
      const [y, m] = entries[0].date.split('-').map(Number);
      if (y && m) {
        setActiveReportYear(y);
        setActiveReportMonth(m);
        try {
          localStorage.setItem(STORAGE_KEY_ACTIVE_REPORT_YEAR, String(y));
          localStorage.setItem(STORAGE_KEY_ACTIVE_REPORT_MONTH, String(m));
        } catch {}
      }
    }

    // ปลดล็อควันที่ทั้งหมดในชุดที่เพิ่งสุ่มหรือบันทึกใหม่ออกจาก deletedDates
    const incomingDates = new Set(entries.map((e) => e.date.trim().slice(0, 10)));
    let activeDelArray: string[] = [];
    setDeletedDates((prev) => {
      const next = new Set(prev);
      incomingDates.forEach((d) => next.delete(d));
      activeDelArray = Array.from(next);
      try {
        localStorage.setItem(STORAGE_KEY_DELETED_DATES, JSON.stringify(activeDelArray));
      } catch (e) {}
      return next;
    });

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
    const saveRes = await saveServerData({ settings, menuBank, dailyMenus: updated, deletedDates: activeDelArray, syncToGas: true });
    lastLocalSaveTimeRef.current = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY_LAST_LOCAL_SAVE, String(lastLocalSaveTimeRef.current));
    } catch {}

    if (saveRes && saveRes.lastUpdated) {
      lastServerTimestampRef.current = saveRes.lastUpdated;
    }

    // ส่งตรงไปยัง Google Apps Script Web App เพื่อให้แน่ใจว่าบันทึกลงชีตทันที
    if (settings.gasWebAppUrl) {
      queueDirectGasSync(settings.gasWebAppUrl, { settings, menuBank, dailyMenus: updated }, 100);
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
        if (data.dailyMenus) {
          let currentDel = deletedDates;
          try {
            const savedDel = localStorage.getItem(STORAGE_KEY_DELETED_DATES);
            if (savedDel) currentDel = new Set<string>(JSON.parse(savedDel));
          } catch {}
          const clean = data.dailyMenus
            .filter((m: DailyMenuEntry) => m && m.date && !currentDel.has(m.date.trim().slice(0, 10)))
            .map(cleanDailyEntryDishes);

          setDailyMenus((prev) => {
            const mergedMap = new Map<string, DailyMenuEntry>();
            prev.forEach((item) => {
              if (item && item.date && !currentDel.has(item.date.trim().slice(0, 10))) {
                mergedMap.set(item.date.trim().slice(0, 10), item);
              }
            });
            clean.forEach((s: DailyMenuEntry) => {
              const sDate = s.date.trim().slice(0, 10);
              const localItem = mergedMap.get(sDate);
              if (!localItem) {
                mergedMap.set(sDate, s);
              } else {
                mergedMap.set(sDate, mergeDailyEntry(localItem, s));
              }
            });
            return Array.from(mergedMap.values()).sort((a, b) => a.date.localeCompare(b.date));
          });
        }
        if (data.taxRecords) setTaxRecords(data.taxRecords);
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
    const cleanDate = dateStr.trim().slice(0, 10);

    // 1. บันทึกลงรายการวันที่ถูกลบอย่างถาวรใน client cache
    setDeletedDates((prev) => {
      const next = new Set(prev);
      next.add(cleanDate);
      try {
        localStorage.setItem(STORAGE_KEY_DELETED_DATES, JSON.stringify(Array.from(next)));
      } catch (e) {
        console.error('Storage error', e);
      }
      return next;
    });

    // 2. ลบออกจาก dailyMenus
    const updated = dailyMenus.filter((m) => m.date !== cleanDate);
    setDailyMenus(updated);
    try {
      localStorage.setItem(STORAGE_KEY_DAILY_MENUS, JSON.stringify(updated));
    } catch (e) {
      console.error('Storage error', e);
    }
    showToast('ลบข้อมูลเรียบร้อย', `ลบเมนูวันที่ ${cleanDate} แล้ว`, 'info');

    // 3. ส่งคำสั่งลบถาวรไปยัง Express backend
    deleteDailyMenuFromServer(cleanDate);

    // 4. บันทึกข้อมูลและส่ง deletedDates
    const saveRes = await saveServerData({ settings, menuBank, dailyMenus: updated, deletedDates: [cleanDate], syncToGas: true });
    if (saveRes && saveRes.lastUpdated) {
      lastServerTimestampRef.current = saveRes.lastUpdated;
    }

    // 5. ส่งคำสั่งลบตรงไปยัง Google Apps Script Web App
    if (settings.gasWebAppUrl) {
      try {
        await callGasPost(settings.gasWebAppUrl, {
          action: 'deleteDailyMenu',
          date: cleanDate
        });
      } catch (err) {
        console.warn('GAS deleteDailyMenu warning:', err);
      }
    }
  };

  const handleBatchDeleteDailyMenus = async (dates: string[]) => {
    if (dates.length === 0) return;
    lastLocalSaveTimeRef.current = Date.now();
    const cleanDates = dates.map((d) => d.trim().slice(0, 10));
    const dateSet = new Set(cleanDates);

    // 1. บันทึกลงรายการวันที่ถูกลบอย่างถาวรใน client cache
    setDeletedDates((prev) => {
      const next = new Set(prev);
      cleanDates.forEach((d) => next.add(d));
      try {
        localStorage.setItem(STORAGE_KEY_DELETED_DATES, JSON.stringify(Array.from(next)));
      } catch (e) {
        console.error('Storage error', e);
      }
      return next;
    });

    // 2. ลบออกจาก dailyMenus
    const updated = dailyMenus.filter((m) => !dateSet.has(m.date));
    setDailyMenus(updated);
    try {
      localStorage.setItem(STORAGE_KEY_DAILY_MENUS, JSON.stringify(updated));
    } catch (e) {
      console.error('Storage error', e);
    }
    showToast('ลบข้อมูลเรียบร้อย', `ลบรายการอาหารที่เลือกจำนวน ${dates.length} วันแล้ว`, 'info');

    // 3. ส่งคำสั่งลบถาวรไปยัง Express backend
    deleteDailyMenuFromServer(cleanDates);

    // 4. บันทึกข้อมูลและส่ง deletedDates
    const saveRes = await saveServerData({ settings, menuBank, dailyMenus: updated, deletedDates: cleanDates, syncToGas: true });
    if (saveRes && saveRes.lastUpdated) {
      lastServerTimestampRef.current = saveRes.lastUpdated;
    }

    // 5. ส่งคำสั่งซิงค์ตรงไปยัง Google Apps Script
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
        if (res.taxRecords) {
          setTaxRecords(res.taxRecords);
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

  const handleSaveTaxRecords = async (updatedRecords: TaxRecord[]) => {
    setTaxRecords((prev) => {
      if (prev === updatedRecords) return prev;
      if (prev.length === updatedRecords.length && JSON.stringify(prev) === JSON.stringify(updatedRecords)) {
        return prev;
      }
      return updatedRecords;
    });
    lastLocalSaveTimeRef.current = Date.now();
    try {
      await saveServerData({
        settings,
        menuBank,
        dailyMenus,
        taxRecords: updatedRecords,
        syncToGas: true
      });
    } catch (err) {
      console.warn('Save tax error:', err);
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

  // -------------------------------------------------------------
  // Authentication Handlers
  // -------------------------------------------------------------
  const handleLoginSuccess = (user: string) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    lastActivityRef.current = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, String(Date.now()));
    } catch (e) {}
    showToast('เข้าสู่ระบบสำเร็จ', `ยินดีต้อนรับผู้ดูแลระบบ (${user})`, 'success');

    // ซิงค์ดึงข้อมูลล่าสุดอย่างปลอดภัย โดยใช้ mergeDailyEntry ไม่เขียนทับเมนูที่มีอยู่เดิมเด็ดขาด
    fetchServerData(settings.gasWebAppUrl)
      .then((data) => {
        if (data && data.success) {
          if (data.settings && Object.keys(data.settings).length > 0) {
            setSettings((prev) => ({ ...prev, ...data.settings }));
          }
          if (Array.isArray(data.menuBank) && data.menuBank.length > 0) {
            setMenuBank(data.menuBank);
          }
          if (Array.isArray(data.dailyMenus)) {
            let currentDel = deletedDates;
            try {
              const savedDel = localStorage.getItem(STORAGE_KEY_DELETED_DATES);
              if (savedDel) currentDel = new Set<string>(JSON.parse(savedDel));
            } catch {}
            const clean = data.dailyMenus
              .filter((m: DailyMenuEntry) => m && m.date && !currentDel.has(m.date.trim().slice(0, 10)))
              .map(cleanDailyEntryDishes);

            setDailyMenus((prev) => {
              const mergedMap = new Map<string, DailyMenuEntry>();
              prev.forEach((item) => {
                if (item && item.date && !currentDel.has(item.date.trim().slice(0, 10))) {
                  mergedMap.set(item.date.trim().slice(0, 10), item);
                }
              });
              try {
                const stored = localStorage.getItem(STORAGE_KEY_DAILY_MENUS);
                if (stored) {
                  const parsed: DailyMenuEntry[] = JSON.parse(stored);
                  parsed.forEach((item) => {
                    const cleanDate = item && item.date && item.date.trim().slice(0, 10);
                    if (cleanDate && !currentDel.has(cleanDate)) {
                      const exist = mergedMap.get(cleanDate);
                      if (!exist) {
                        mergedMap.set(cleanDate, cleanDailyEntryDishes(item));
                      } else {
                        mergedMap.set(cleanDate, mergeDailyEntry(exist, cleanDailyEntryDishes(item)));
                      }
                    }
                  });
                }
              } catch {}
              clean.forEach((s: DailyMenuEntry) => {
                const sDate = s.date.trim().slice(0, 10);
                const localItem = mergedMap.get(sDate);
                if (!localItem) {
                  mergedMap.set(sDate, s);
                } else {
                  mergedMap.set(sDate, mergeDailyEntry(localItem, s));
                }
              });
              const mergedList = Array.from(mergedMap.values()).sort((a, b) => a.date.localeCompare(b.date));
              try {
                localStorage.setItem(STORAGE_KEY_DAILY_MENUS, JSON.stringify(mergedList));
              } catch {}
              return mergedList;
            });
          }
          if (Array.isArray(data.taxRecords) && data.taxRecords.length > 0) {
            setTaxRecords(data.taxRecords);
          }
          if (data.lastUpdated) {
            lastServerTimestampRef.current = data.lastUpdated;
          }
        }
      })
      .catch((err) => console.warn('Post-login sync notice:', err));
  };

  const handleConfirmLogout = () => {
    try {
      localStorage.setItem(STORAGE_KEY_DAILY_MENUS, JSON.stringify(dailyMenus));
      localStorage.setItem(STORAGE_KEY_MENU_BANK, JSON.stringify(menuBank));
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
      localStorage.removeItem(STORAGE_KEY_AUTH);
      sessionStorage.removeItem(STORAGE_KEY_AUTH);
      localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
    } catch (e) {
      console.warn('Logout storage clear error:', e);
    }
    // ส่งข้อมูลล่าสุดไปสำรองบนเซิร์ฟเวอร์ทันทีก่อนออกจากระบบ
    saveServerData({ settings, menuBank, dailyMenus, syncToGas: true }).catch(() => {});
    setIsAuthenticated(false);
    setShowLogoutConfirm(false);
    showToast('ออกจากระบบแล้ว', 'ออกจากระบบการทำงานเรียบร้อยแล้ว', 'info');
  };

  // If user is not logged in, render the dedicated secure login page
  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          logoUrl={settings.logoUrl}
          schoolName={settings.schoolName}
        />
        <NotificationToast
          notifications={notifications}
          onDismiss={dismissToast}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header with live clock & top controls */}
      <Header
        settings={settings}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isGasConnected={isGasConnected}
        isSyncing={isSyncing}
        isRealtimeConnected={isRealtimeConnected}
        onManualSync={handleManualSync}
        onLogout={() => setShowLogoutConfirm(true)}
        username={currentUser}
      />

      {/* App Body with Left Sticky Vertical Sidebar & Main Content */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1700px] mx-auto">
        {/* Left Sticky Sidebar arranged vertically */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onLogout={() => setShowLogoutConfirm(true)}
          username={currentUser}
        />

        {/* Main Content View Container */}
        <main className="flex-1 min-w-0 px-3 sm:px-6 lg:px-8 py-5 pb-24 md:pb-8">
          {activeTab === 'tax' && (
            <TaxManagement
              settings={settings}
              showToast={showToast}
              records={taxRecords}
              onSaveRecords={handleSaveTaxRecords}
            />
          )}

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
              onActiveMonthYearChange={(m, y) => {
                setActiveReportMonth(m);
                setActiveReportYear(y);
              }}
            />
          )}

          {(activeTab === 'settings' || activeTab === 'repository') && (
            <SettingsModal
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onUploadLogo={handleUploadLogo}
              showToast={showToast}
              menuBank={menuBank}
              onAddMenuItem={handleAddMenuItem}
              onUpdateMenuItem={handleUpdateMenuItem}
              onDeleteMenuItem={handleDeleteMenuItem}
              onSeedPresets={handleSeedPresets}
              defaultSubTab={activeTab === 'repository' ? 'menu' : 'school'}
            />
          )}
        </main>
      </div>

      {/* Fixed Bottom Navigation for Mobile Devices */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

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

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="ยืนยันการออกจากระบบ"
        message="คุณต้องการออกจากระบบหรือไม่? คุณจะต้องใช้ ID: Admin และ Password เพื่อเข้าใช้งานอีกครั้ง"
        confirmText="ออกจากระบบ"
        cancelText="ยกเลิก"
        type="warning"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
