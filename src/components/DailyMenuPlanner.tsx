import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DailyMenuEntry, MenuItem, ActivityPhoto, MenuCategory } from '../types';
import { INITIAL_MENU_BANK } from '../data/initialData';
import { ConfirmModal } from './ConfirmModal';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Copy, 
  Trash2, 
  Pencil,
  Sparkles, 
  ArrowRight, 
  CheckCircle2,
  Shuffle,
  CalendarDays,
  X,
  Search,
  Printer
} from 'lucide-react';

interface DailyMenuPlannerProps {
  dailyMenus: DailyMenuEntry[];
  menuBank: MenuItem[];
  onSaveDailyMenu: (entry: DailyMenuEntry, isAutoAdvance?: boolean) => Promise<boolean> | boolean;
  onBatchSaveDailyMenus?: (entries: DailyMenuEntry[]) => Promise<boolean> | boolean;
  onDeleteDailyMenu: (dateStr: string) => Promise<void> | void;
  onOpenLightbox?: (photo: ActivityPhoto, allPhotos: ActivityPhoto[], onReplace?: (newPhoto: ActivityPhoto) => void, onDelete?: () => void) => void;
  showToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  gasWebAppUrl?: string;
  onUploadImageToDrive?: (fileData: string, fileName: string, mimeType: string, activityName: string, dateStr: string) => Promise<ActivityPhoto>;
  onNavigateToReport?: (month?: number, year?: number) => void;
  onActiveMonthYearChange?: (month: number, year: number) => void;
}

const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_MONTH_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const THAI_DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const THAI_DAY_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export const DailyMenuPlanner: React.FC<DailyMenuPlannerProps> = ({
  dailyMenus,
  menuBank,
  onSaveDailyMenu,
  onBatchSaveDailyMenus,
  onDeleteDailyMenu,
  onOpenLightbox,
  showToast,
  gasWebAppUrl,
  onUploadImageToDrive,
  onNavigateToReport,
  onActiveMonthYearChange
}) => {
  // Helper to format Date to YYYY-MM-DD
  const toDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = toDateString(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Parse currently selected date
  const [curYear, curMonth, curDay] = selectedDate.split('-').map(Number);

  // Month Randomizer State (defaults to selectedDate's month & year)
  const [randomMonth, setRandomMonth] = useState<number>(curMonth || (new Date().getMonth() + 1));
  const [randomYear, setRandomYear] = useState<number>(curYear || new Date().getFullYear());
  const [isRandomizing, setIsRandomizing] = useState<boolean>(false);

  // Search query for saved calendar menus table (for finding menus to copy)
  const [calendarSearchQuery, setCalendarSearchQuery] = useState<string>('');

  // Calendar Popover State
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [calViewYear, setCalViewYear] = useState<number>(curYear || new Date().getFullYear());
  const [calViewMonth, setCalViewMonth] = useState<number>(curMonth || (new Date().getMonth() + 1));
  const calendarRef = useRef<HTMLDivElement>(null);

  // Sync calendar view month/year when selectedDate changes
  useEffect(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    if (y && m) {
      setCalViewYear(y);
      setCalViewMonth(m);
      setRandomMonth(m);
      setRandomYear(y);
    }
  }, [selectedDate]);

  // Close calendar popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  // Form inputs
  const [rice, setRice] = useState<string>('');
  const [singleDish, setSingleDish] = useState<string>('');
  const [spicy, setSpicy] = useState<string>('');
  const [nonSpicy, setNonSpicy] = useState<string>('');
  const [dessert, setDessert] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // Predictive Auto-suggest state for the 5 fields
  const [activeSuggestField, setActiveSuggestField] = useState<string | null>(null);

  // Minimal Confirmation Dialog States
  const [deleteConfirmDate, setDeleteConfirmDate] = useState<string | null>(null);
  const [randomizeConfirmData, setRandomizeConfirmData] = useState<{ count: number; total: number } | null>(null);

  // Load existing menu data whenever selectedDate changes
  useEffect(() => {
    const existing = dailyMenus.find((m) => m.date === selectedDate);
    if (existing) {
      setRice(existing.rice || '');
      setSingleDish(existing.singleDish || '');
      setSpicy(existing.spicy || '');
      setNonSpicy(existing.nonSpicy || '');
      setDessert(existing.dessert || '');
      setNote(existing.note || '');
    } else {
      setRice('');
      setSingleDish('');
      setSpicy('');
      setNonSpicy('');
      setDessert('');
      setNote('');
    }
  }, [selectedDate, dailyMenus]);

  /**
   * Auto-Advance Date Logic:
   * Next day. If next day is Saturday (6) or Sunday (0), skip automatically to Monday!
   */
  const calculateNextSchoolDay = (currentDateStr: string): string => {
    const parts = currentDateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    
    // Add 1 day
    d.setDate(d.getDate() + 1);
    
    // Check if Saturday (6) -> skip 2 days to Monday
    if (d.getDay() === 6) {
      d.setDate(d.getDate() + 2);
    } 
    // Check if Sunday (0) -> skip 1 day to Monday
    else if (d.getDay() === 0) {
      d.setDate(d.getDate() + 1);
    }

    return toDateString(d);
  };

  // Format Thai Display Date
  const formatThaiDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return `วัน${THAI_DAY_NAMES[d.getDay()]}ที่ ${d.getDate()} ${THAI_MONTH_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  // Format short date like PrintReport (e.g. จ. 1/9/69)
  const formatShortDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const dayShort = THAI_DAY_SHORT[d.getDay()];
    const dateNum = d.getDate();
    const monthNum = d.getMonth() + 1;
    const yearShort = String(d.getFullYear() + 543).slice(-2);
    return `${dayShort} ${dateNum}/${monthNum}/${yearShort}`;
  };

  // Format meal list string identical to PrintReport (e.g. ข้าว + กับข้าว หรือ จานเดียว + ของหวาน)
  const formatMealList = (entry: DailyMenuEntry): string => {
    if (entry.singleDish) {
      const parts = [entry.singleDish];
      if (entry.dessert) parts.push(entry.dessert);
      return parts.join(' + ');
    }

    const items = [
      entry.rice,
      entry.spicy,
      entry.nonSpicy,
      entry.dessert
    ].filter(Boolean);

    if (items.length === 0) return '-';
    return items.join(' + ');
  };

  // Save handler
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const existingEntry = dailyMenus.find((m) => m.date === selectedDate);
    const entry: DailyMenuEntry = {
      date: selectedDate,
      rice: rice.trim(),
      singleDish: singleDish.trim(),
      spicy: spicy.trim(),
      nonSpicy: nonSpicy.trim(),
      dessert: dessert.trim(),
      note: note.trim(),
      photos: existingEntry?.photos || [],
      lastModified: new Date().toISOString()
    };

    const success = await onSaveDailyMenu(entry, true);
    if (success) {
      // Auto-advance date
      const nextDate = calculateNextSchoolDay(selectedDate);
      const isWeekendSkipped = (new Date(selectedDate).getDay() === 5); // Friday -> Monday
      
      setSelectedDate(nextDate);
      
      if (isWeekendSkipped) {
        showToast(
          'บันทึกสำเร็จ',
          `บันทึกข้อมูลวันที่ ${formatThaiDisplay(selectedDate)} แล้ว ระบบเลื่อนวันไปเป็น ${formatThaiDisplay(nextDate)}`,
          'success'
        );
      } else {
        showToast(
          'บันทึกสำเร็จ',
          `บันทึกเมนูเรียบร้อยแล้ว ระบบเลื่อนวันถัดไปอัตโนมัติ: ${formatThaiDisplay(nextDate)}`,
          'success'
        );
      }
    }
  };

  // Action: Copy food items directly into the active form above
  const handleCopyDirectToForm = (entry: DailyMenuEntry) => {
    setRice(entry.rice || '');
    setSingleDish(entry.singleDish || '');
    setSpicy(entry.spicy || '');
    setNonSpicy(entry.nonSpicy || '');
    setDessert(entry.dessert || '');
    if (entry.note) {
      setNote(entry.note);
    }
    showToast(
      'คัดลอกรายการอาหารแล้ว',
      `นำเมนูจากวันที่ ${formatThaiDisplay(entry.date)} ใส่ลงในแบบฟอร์มด้านบนเรียบร้อยแล้ว`,
      'success'
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Action: Edit entry
  const handleEditEntry = (entry: DailyMenuEntry) => {
    setSelectedDate(entry.date);
    setRice(entry.rice || '');
    setSingleDish(entry.singleDish || '');
    setSpicy(entry.spicy || '');
    setNonSpicy(entry.nonSpicy || '');
    setDessert(entry.dessert || '');
    setNote(entry.note || '');
    showToast(
      'แก้ไขรายการอาหาร',
      `เปิดข้อมูลวันที่ ${formatThaiDisplay(entry.date)} เพื่อแก้ไข`,
      'info'
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Action: Delete entry
  const handleDeleteEntry = (dateStr: string) => {
    setDeleteConfirmDate(dateStr);
  };

  const executeDeleteEntry = async () => {
    if (!deleteConfirmDate) return;
    const targetDate = deleteConfirmDate;
    setDeleteConfirmDate(null);
    await onDeleteDailyMenu(targetDate);
    showToast('ลบรายการสำเร็จ', `ลบรายการอาหารวันที่ ${formatThaiDisplay(targetDate)} เรียบร้อยแล้ว`, 'info');
    if (selectedDate === targetDate) {
      setRice('');
      setSingleDish('');
      setSpicy('');
      setNonSpicy('');
      setDessert('');
      setNote('');
    }
  };

  // Auto-suggest helper: filter menuBank items based on category and typed keyword
  const getSuggestions = (category: MenuCategory, currentText: string) => {
    const text = currentText.trim().toLowerCase();
    return menuBank
      .filter((m) => m.category === category)
      .filter((m) => !text || m.menuName.toLowerCase().includes(text))
      .slice(0, 6);
  };

  // Auto-suggest for field 5 (ผลไม้-ของหวาน): pulls from both 'ผลไม้' and 'ของหวาน'
  const getDessertSuggestions = (currentText: string) => {
    const text = currentText.trim().toLowerCase();
    return menuBank
      .filter((m) => m.category === 'ผลไม้' || m.category === 'ของหวาน' || m.category === 'ผลไม้-ของหวาน')
      .filter((m) => !text || m.menuName.toLowerCase().includes(text))
      .slice(0, 10);
  };

  // Day navigation helpers
  const handlePrevDay = () => {
    const parts = selectedDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() - 1);
    setSelectedDate(toDateString(d));
  };

  const handleNextDay = () => {
    const parts = selectedDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + 1);
    setSelectedDate(toDateString(d));
  };

  // -------------------------------------------------------------------------
  // Requirement 3: Monthly Menu Randomizer Engine (ระบบสุ่มจัดอาหารกลางวัน)
  // - ความหลากหลายสูง ป้องกันความเบื่อ: แต่ละสัปดาห์ในเดือนมีเมนูที่หลากหลายไม่ซ้ำกัน
  // - เชื่อมโยงกับเดือนที่แล้ว: ตรวจสอบเมนูเดือนก่อนหน้า ลดการสุ่มเมนูที่เพิ่งกินบ่อยในเดือนก่อน โดยเฉพาะสัปดาห์แรก
  // - วันพุธ: อาหารจานเดียว + ขนมหวานหรือผลไม้ (หมุนเวียนไม่ซ้ำกันทุกวันพุธ)
  // - วันจันทร์, อังคาร, พฤหัสบดี, ศุกร์: ข้าว + กับข้าวเผ็ด + กับข้าวไม่เผ็ด + ขนมหวานหรือผลไม้
  // - ของหวาน: สลับ 2 วันต่อสัปดาห์ กับ 1 วันต่อสัปดาห์ วันที่เหลือเป็นผลไม้สด
  // -------------------------------------------------------------------------
  const executeRandomizeMonth = async () => {
    setIsRandomizing(true);
    try {
      // 1. Pull directly from menuBank (คลังเมนู), with intelligent category fallback
      const isDessertName = (name: string) => {
        const n = name.toLowerCase();
        return n.includes('บัวลอย') || n.includes('กล้วยบวชชี') || n.includes('เฉาก๊วย') || 
               n.includes('หวาน') || n.includes('ถั่วเขียว') || n.includes('วุ้น') ||
               n.includes('แกงบวด') || n.includes('ทองหยอด') || n.includes('ฟักทองแกงบวด');
      };

      const getPool = (category: MenuCategory): MenuItem[] => {
        const fromBank = menuBank.filter((m) => m.category === category);
        if (fromBank.length > 0) return fromBank;
        return INITIAL_MENU_BANK.filter((m) => m.category === category);
      };

      const riceItems = getPool('ข้าว');
      const singleDishItems = getPool('อาหารจานเดียว');
      const nonSpicyItems = getPool('อาหารไม่เผ็ด');
      const spicyItems = getPool('อาหารเผ็ด');

      const fruitBank = menuBank.filter((m) => m.category === 'ผลไม้' || (m.category === 'ผลไม้-ของหวาน' && !isDessertName(m.menuName)));
      const fruitItems = fruitBank.length > 0 ? fruitBank : INITIAL_MENU_BANK.filter((m) => m.category === 'ผลไม้');

      const dessertBank = menuBank.filter((m) => m.category === 'ของหวาน' || (m.category === 'ผลไม้-ของหวาน' && isDessertName(m.menuName)));
      const dessertItems = dessertBank.length > 0 ? dessertBank : INITIAL_MENU_BANK.filter((m) => m.category === 'ของหวาน');

      // 2. ดึงข้อมูลเมนูของ "เดือนที่แล้ว" เพื่อนำมาคำนวณความหลากหลาย ให้แตกต่างจากเดือนก่อน
      const prevYear = randomMonth === 1 ? randomYear - 1 : randomYear;
      const prevMonth = randomMonth === 1 ? 12 : randomMonth - 1;
      const prevMonthPrefix = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
      const prevMonthEntries = dailyMenus.filter((m) => m.date.startsWith(prevMonthPrefix));

      const prevMonthDishCounts = new Map<string, number>();
      const prevWedSingleDishes = new Set<string>();

      prevMonthEntries.forEach((entry) => {
        const parts = entry.date.split('-').map(Number);
        const dayOfWeek = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
        if (dayOfWeek === 3 && entry.singleDish) {
          prevWedSingleDishes.add(entry.singleDish.trim());
        }
        [entry.rice, entry.singleDish, entry.nonSpicy, entry.spicy, entry.dessert].forEach((dish) => {
          if (dish && dish.trim()) {
            const clean = dish.trim();
            prevMonthDishCounts.set(clean, (prevMonthDishCounts.get(clean) || 0) + 1);
          }
        });
      });

      // 3. รวบรวมวันทำการเรียน (จันทร์-ศุกร์) ทั้งหมดในเดือนที่เลือก แยกเป็นสัปดาห์
      const daysInMonth = new Date(randomYear, randomMonth, 0).getDate();
      const schoolDaysByWeek: { weekNumber: number; dates: Date[] }[] = [];

      let currentWeek: Date[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(randomYear, randomMonth - 1, day);
        const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat

        // เฉพาะวันจันทร์ (1) ถึง วันศุกร์ (5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          if (dayOfWeek === 1 && currentWeek.length > 0) {
            schoolDaysByWeek.push({ weekNumber: schoolDaysByWeek.length + 1, dates: currentWeek });
            currentWeek = [];
          }
          currentWeek.push(d);
        }
      }
      if (currentWeek.length > 0) {
        schoolDaysByWeek.push({ weekNumber: schoolDaysByWeek.length + 1, dates: currentWeek });
      }

      // ระบบติดตามความถี่และระยะห่างของเมนู เพื่อป้องกันความซ้ำซาก
      const usedInMonthCount = new Map<string, number>();
      const lastUsedSchoolDayIndex = new Map<string, number>();
      const wedSingleDishesInMonth = new Set<string>();
      let totalSchoolDaysCount = 0;

      // ฟังก์ชันสุ่มแบบถ่วงน้ำหนัก (Smart Diverse Picker):
      // - ป้องกันการซ้ำในสัปดาห์เดียวกันเด็ดขาด
      // - หลีกเลี่ยงเมนูที่เพิ่งกินไปในรอบ 1-2 สัปดาห์
      // - ลดความซ้ำจากเมนูที่ออกบ่อยในเดือนที่แล้ว โดยเฉพาะสัปดาห์แรกของเดือนใหม่
      // - อาหารจานเดียววันพุธจะไม่ซ้ำกันทุกวันพุธในเดือนนั้น
      const pickDiverseItem = (
        pool: MenuItem[],
        currentWeekDishes: Set<string>,
        options?: {
          isWednesdaySingleDish?: boolean;
          isWeek1?: boolean;
          schoolDayIndex?: number;
        }
      ): string => {
        if (!pool || pool.length === 0) return '';
        const dayIdx = options?.schoolDayIndex ?? totalSchoolDaysCount;
        const isWed = Boolean(options?.isWednesdaySingleDish);
        const isWk1 = Boolean(options?.isWeek1);

        // 1. กรองเมนูที่ใช้ไปแล้วในสัปดาห์นี้ออก เพื่อให้แต่ละสัปดาห์มีความแปลกใหม่หลากหลาย
        let candidates = pool.filter((item) => !currentWeekDishes.has(item.menuName));
        if (candidates.length === 0) {
          candidates = pool;
        }

        // อาหารจานเดียววันพุธ: หมุนเวียนไม่ซ้ำกันในแต่ละวันพุธของเดือน
        if (isWed && wedSingleDishesInMonth.size < pool.length) {
          const unusedInMonth = candidates.filter((item) => !wedSingleDishesInMonth.has(item.menuName));
          if (unusedInMonth.length > 0) {
            candidates = unusedInMonth;
          }
        }

        // 2. ให้คะแนนความสดใหม่ (Penalty scoring: ยิ่งคะแนนน้อย ยิ่งสดใหม่และน่าเลือก)
        const scored = candidates.map((item) => {
          const name = item.menuName;
          let penalty = 0;

          // ความถี่ในเดือนนี้ (ถ้าเคยกินแล้วจะถูกลดโอกาสลง เพื่อกระจายเมนูอื่นในคลัง)
          const monthFreq = usedInMonthCount.get(name) || 0;
          penalty += monthFreq * 25;

          // ระยะห่างวันทำการ (ป้องกันไม่ให้วนกลับมาเร็วเกินไป)
          if (lastUsedSchoolDayIndex.has(name)) {
            const daysAgo = dayIdx - (lastUsedSchoolDayIndex.get(name) || 0);
            if (daysAgo <= 2) penalty += 60;
            else if (daysAgo <= 5) penalty += 25;
            else if (daysAgo <= 9) penalty += 10;
          }

          // ความหลากหลายข้ามเดือน: เมนูที่เดือนที่แล้วกินบ่อย จะได้คะแนนลดลง
          const prevCount = prevMonthDishCounts.get(name) || 0;
          penalty += prevCount * 4;
          if (isWk1 && prevCount > 0) {
            // สัปดาห์แรกของเดือนใหม่ เปิดด้วยเมนูสดใหม่ที่เดือนก่อนไม่ค่อยได้กิน
            penalty += prevCount * 8;
          }

          // วันพุธจานเดียว: ถ้าเป็นเมนูที่เพิ่งเป็นจานเดียววันพุธเดือนก่อน ให้หลีกเลี่ยง
          if (isWed && prevWedSingleDishes.has(name)) {
            penalty += 20;
          }

          // เพิ่มความสุ่มเป็นธรรมชาติ
          penalty += Math.random() * 3;

          return { name, penalty };
        });

        scored.sort((a, b) => a.penalty - b.penalty);

        // เลือกสุ่มในกลุ่มที่มีความสดใหม่สูงสุด
        const minPenalty = scored[0].penalty;
        const topCandidates = scored.filter((s) => s.penalty <= minPenalty + 3.5);
        const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)].name;

        // บันทึกสถิติเพื่อใช้คำนวณวันถัดไป
        usedInMonthCount.set(chosen, (usedInMonthCount.get(chosen) || 0) + 1);
        lastUsedSchoolDayIndex.set(chosen, dayIdx);
        currentWeekDishes.add(chosen);
        if (isWed) {
          wedSingleDishesInMonth.add(chosen);
        }

        return chosen;
      };

      const generatedEntries: DailyMenuEntry[] = [];

      // 4. วางแผนแต่ละสัปดาห์
      schoolDaysByWeek.forEach((week, weekIdx) => {
        const days = week.dates;
        const weekDishes = new Set<string>();
        const isWeek1 = weekIdx === 0;

        // กำหนดวันของหวาน: สลับ 2 วัน กับ 1 วันต่อสัปดาห์
        const targetDessertCount = (weekIdx % 2 === 0) ? 2 : 1;
        const dessertIndices = new Set<number>();
        const wedIdx = days.findIndex((d) => d.getDay() === 3);

        if (targetDessertCount === 2) {
          if (wedIdx !== -1) {
            dessertIndices.add(wedIdx);
            const otherDays = days.map((_, i) => i).filter((i) => i !== wedIdx);
            const friIdx = days.findIndex((d) => d.getDay() === 5);
            const tueIdx = days.findIndex((d) => d.getDay() === 2);
            if (friIdx !== -1 && otherDays.includes(friIdx)) dessertIndices.add(friIdx);
            else if (tueIdx !== -1 && otherDays.includes(tueIdx)) dessertIndices.add(tueIdx);
            else if (otherDays.length > 0) dessertIndices.add(otherDays[0]);
          } else {
            if (days.length > 0) dessertIndices.add(0);
            if (days.length > 1) dessertIndices.add(days.length - 1);
          }
        } else {
          if (wedIdx !== -1) {
            const isWedDessert = (weekIdx % 4 !== 3);
            if (isWedDessert) dessertIndices.add(wedIdx);
            else {
              const friIdx = days.findIndex((d) => d.getDay() === 5);
              const tueIdx = days.findIndex((d) => d.getDay() === 2);
              if (friIdx !== -1) dessertIndices.add(friIdx);
              else if (tueIdx !== -1) dessertIndices.add(tueIdx);
              else dessertIndices.add(0);
            }
          } else {
            if (days.length > 0) dessertIndices.add(0);
          }
        }

        days.forEach((dateObj, idx) => {
          totalSchoolDaysCount++;
          const dateStr = toDateString(dateObj);
          const dayOfWeek = dateObj.getDay();
          const isWednesday = dayOfWeek === 3;

          let itemRice = '';
          let itemSingleDish = '';
          let itemNonSpicy = '';
          let itemSpicy = '';
          let itemSweet = '';

          const isDessertToday = dessertIndices.has(idx);
          const sweetPool = isDessertToday
            ? (dessertItems.length > 0 ? dessertItems : fruitItems)
            : (fruitItems.length > 0 ? fruitItems : dessertItems);

          itemSweet = pickDiverseItem(sweetPool, weekDishes, {
            schoolDayIndex: totalSchoolDaysCount,
            isWeek1
          });

          if (isWednesday) {
            // วันพุธ: อาหารจานเดียว + ของหวานหรือผลไม้ (หมุนเวียนสดใหม่)
            itemSingleDish = pickDiverseItem(singleDishItems, weekDishes, {
              isWednesdaySingleDish: true,
              schoolDayIndex: totalSchoolDaysCount,
              isWeek1
            });
            itemRice = '';
            itemNonSpicy = '';
            itemSpicy = '';
          } else {
            // วันจันทร์, อังคาร, พฤหัสบดี, ศุกร์: ข้าว + กับข้าวเผ็ด + กับข้าวไม่เผ็ด + ของหวานหรือผลไม้
            itemRice = pickDiverseItem(riceItems, weekDishes, {
              schoolDayIndex: totalSchoolDaysCount,
              isWeek1
            });
            itemNonSpicy = pickDiverseItem(nonSpicyItems, weekDishes, {
              schoolDayIndex: totalSchoolDaysCount,
              isWeek1
            });
            itemSpicy = pickDiverseItem(spicyItems, weekDishes, {
              schoolDayIndex: totalSchoolDaysCount,
              isWeek1
            });
          }

          generatedEntries.push({
            date: dateStr,
            rice: itemRice,
            singleDish: itemSingleDish,
            nonSpicy: itemNonSpicy,
            spicy: itemSpicy,
            dessert: itemSweet,
            note: '',
            photos: []
          });
        });
      });

      // 5. บันทึกลงระบบส่วนกลาง
      if (onBatchSaveDailyMenus) {
        await onBatchSaveDailyMenus(generatedEntries);
      } else {
        for (const entry of generatedEntries) {
          await onSaveDailyMenu(entry);
        }
      }

      // นำมุมมองไปที่วันแรกของเดือนที่สุ่ม และซิงค์เดือนไปยังหน้ารายงาน
      if (generatedEntries.length > 0) {
        setSelectedDate(generatedEntries[0].date);
      }
      if (onActiveMonthYearChange) {
        onActiveMonthYearChange(randomMonth, randomYear);
      }

      showToast(
        'สุ่มจัดอาหารกลางวันสำเร็จ!',
        `จัดเมนูหลากหลาย ${generatedEntries.length} วันทำการ ประจำเดือน ${THAI_MONTH_NAMES[randomMonth - 1]} ${randomYear + 543} เรียบร้อย สามารถดูหน้ารายงาน พิมพ์ หรือแก้ไขได้ทันที`,
        'success'
      );
    } catch (err: any) {
      console.error('Error randomizing monthly menu:', err);
      showToast('เกิดข้อผิดพลาด', err?.message || 'ไม่สามารถสุ่มจัดเมนูได้', 'error');
    } finally {
      setIsRandomizing(false);
    }
  };

  const handleRandomizeMonth = () => {
    // Count school days in this month
    const daysInMonth = new Date(randomYear, randomMonth, 0).getDate();
    let totalSchoolDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(randomYear, randomMonth - 1, day);
      if (d.getDay() >= 1 && d.getDay() <= 5) {
        totalSchoolDays++;
      }
    }

    const monthPrefix = `${randomYear}-${String(randomMonth).padStart(2, '0')}`;
    const existingInMonth = dailyMenus.filter((m) => m.date.startsWith(monthPrefix));
    if (existingInMonth.length > 0) {
      setRandomizeConfirmData({
        count: existingInMonth.length,
        total: totalSchoolDays
      });
      return;
    }

    executeRandomizeMonth();
  };

  // -------------------------------------------------------------------------
  // Calendar Grid Generator for the Popover
  // -------------------------------------------------------------------------
  const calendarDays = React.useMemo(() => {
    const days: { day: number; dateStr: string; isCurrentMonth: boolean; hasMenu: boolean; isMonday: boolean; isSelected: boolean }[] = [];
    const firstDayOfMonth = new Date(calViewYear, calViewMonth - 1, 1).getDay(); // 0 = Sun
    const totalDays = new Date(calViewYear, calViewMonth, 0).getDate();
    const prevMonthDays = new Date(calViewYear, calViewMonth - 1, 0).getDate();

    // Previous month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(calViewYear, calViewMonth - 2, d);
      const str = toDateString(prevDate);
      days.push({
        day: d,
        dateStr: str,
        isCurrentMonth: false,
        hasMenu: dailyMenus.some((m) => m.date === str),
        isMonday: prevDate.getDay() === 1,
        isSelected: str === selectedDate
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const curDate = new Date(calViewYear, calViewMonth - 1, d);
      const str = toDateString(curDate);
      days.push({
        day: d,
        dateStr: str,
        isCurrentMonth: true,
        hasMenu: dailyMenus.some((m) => m.date === str),
        isMonday: curDate.getDay() === 1,
        isSelected: str === selectedDate
      });
    }

    // Next month padding to fill grid
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(calViewYear, calViewMonth, d);
      const str = toDateString(nextDate);
      days.push({
        day: d,
        dateStr: str,
        isCurrentMonth: false,
        hasMenu: dailyMenus.some((m) => m.date === str),
        isMonday: nextDate.getDay() === 1,
        isSelected: str === selectedDate
      });
    }

    return days;
  }, [calViewYear, calViewMonth, dailyMenus, selectedDate]);

  // Mutual exclusion states
  const hasSetMeal = Boolean(rice.trim() || nonSpicy.trim() || spicy.trim());
  const hasSingleDish = Boolean(singleDish.trim());

  // Filtered entries for saved calendar menus based on user's search query (for quick menu copying)
  const filteredCalendarEntries = useMemo(() => {
    if (!calendarSearchQuery.trim()) return dailyMenus;
    const q = calendarSearchQuery.toLowerCase().trim();
    return dailyMenus.filter((entry) => {
      const meal = formatMealList(entry).toLowerCase();
      const thaiDate = formatThaiDisplay(entry.date).toLowerCase();
      const shortDate = formatShortDate(entry.date).toLowerCase();
      const note = (entry.note || '').toLowerCase();
      const rawDate = entry.date.toLowerCase();
      const r = (entry.rice || '').toLowerCase();
      const sd = (entry.singleDish || '').toLowerCase();
      const ns = (entry.nonSpicy || '').toLowerCase();
      const sp = (entry.spicy || '').toLowerCase();
      const ds = (entry.dessert || '').toLowerCase();
      return (
        rawDate.includes(q) ||
        meal.includes(q) ||
        thaiDate.includes(q) ||
        shortDate.includes(q) ||
        note.includes(q) ||
        r.includes(q) ||
        sd.includes(q) ||
        ns.includes(q) ||
        sp.includes(q) ||
        ds.includes(q)
      );
    });
  }, [dailyMenus, calendarSearchQuery]);

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------- */}
      {/* 1. Monthly Randomizer Bar (Requirement 3)                     */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 border border-orange-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Shuffle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                สุ่มจัดอาหารกลางวันทั้งเดือน
                <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-medium">
                  อัตโนมัติ
                </span>
              </h3>
              <p className="text-[11px] text-slate-600 mt-0.5">
                วันพุธจานเดียว 1 วัน/สัปดาห์ &bull; ของหวาน 2 วัน/สัปดาห์ &bull; ที่เหลือเป็นผลไม้สด
              </p>
            </div>
          </div>

          {/* Month & Year Selectors + Action Button */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Unified Month & Year Selector with single Calendar icon (Requirement 2.2) */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <CalendarIcon className="w-4 h-4 text-orange-600 shrink-0" />
              <select
                id="select-random-month"
                value={randomMonth}
                onChange={(e) => setRandomMonth(Number(e.target.value))}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
              >
                {THAI_MONTH_NAMES.map((mName, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {mName}
                  </option>
                ))}
              </select>
              <span className="text-slate-300">|</span>
              <select
                id="select-random-year"
                value={randomYear}
                onChange={(e) => setRandomYear(Number(e.target.value))}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
              >
                {[2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    พ.ศ. {y + 543}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="btn-auto-randomize-month"
              type="button"
              disabled={isRandomizing}
              onClick={handleRandomizeMonth}
              className="px-3.5 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              title="สุ่มจัดเมนูอาหารกลางวันทั้งเดือนตามหลักโภชนาการโรงเรียน"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>{isRandomizing ? 'กำลังจัดเมนู...' : 'สุ่มจัดอาหารกลางวันทั้งเดือน'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Interactive Calendar Header & Picker (Requirement 2)       */}
      {/* ------------------------------------------------------------- */}
      <div className="relative bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Previous day button */}
          <button
            id="btn-prev-day"
            type="button"
            onClick={handlePrevDay}
            className="p-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="วันก่อนหน้า"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Interactive Date Display Button toggling Custom Thai Calendar Popover */}
          <div className="relative" ref={calendarRef}>
            <button
              id="btn-calendar-trigger"
              type="button"
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex items-center gap-2 bg-slate-50 hover:bg-orange-50/80 border border-slate-300 hover:border-orange-500 rounded-xl px-3.5 py-1.5 transition-all cursor-pointer shadow-2xs group"
              title="คลิกเพื่อเปิดปฏิทินเลือกวันที่"
            >
              <CalendarIcon className="w-4 h-4 text-orange-600 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-orange-700 select-none">
                {formatThaiDisplay(selectedDate)}
              </span>
              <CalendarDays className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-500 ml-0.5" />
            </button>

            {/* Custom Interactive Thai Calendar Popover */}
            {isCalendarOpen && (
              <div 
                id="popover-thai-calendar"
                className="absolute left-0 top-full mt-2 z-50 bg-white border border-slate-300 rounded-2xl p-3.5 shadow-xl w-72 sm:w-80 animate-fadeIn"
              >
                {/* Popover Header: Month & Year Controls */}
                <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      if (calViewMonth === 1) {
                        setCalViewMonth(12);
                        setCalViewYear(calViewYear - 1);
                      } else {
                        setCalViewMonth(calViewMonth - 1);
                      }
                    }}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="text-xs font-bold text-slate-900">
                    {THAI_MONTH_NAMES[calViewMonth - 1]} พ.ศ. {calViewYear + 543}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (calViewMonth === 12) {
                        setCalViewMonth(1);
                        setCalViewYear(calViewYear + 1);
                      } else {
                        setCalViewMonth(calViewMonth + 1);
                      }
                    }}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Day of Week Headers (อา. - ส.) */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500 mb-1">
                  <span className="text-rose-500">อา.</span>
                  <span className="text-amber-700 bg-amber-100/60 rounded py-0.5">จ.</span>
                  <span>อ.</span>
                  <span>พ.</span>
                  <span>พฤ.</span>
                  <span>ศ.</span>
                  <span className="text-rose-400">ส.</span>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {calendarDays.map((item, idx) => {
                    const isMon = item.isMonday;
                    const isSel = item.isSelected;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedDate(item.dateStr);
                          setIsCalendarOpen(false);
                        }}
                        className={`relative py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex flex-col items-center justify-center ${
                          isSel
                            ? 'bg-orange-600 text-white font-bold shadow-xs'
                            : item.isCurrentMonth
                            ? isMon
                              ? 'bg-amber-100/70 text-amber-950 hover:bg-amber-200/80 font-semibold'
                              : 'hover:bg-slate-100 text-slate-800'
                            : 'text-slate-300 hover:text-slate-500'
                        }`}
                      >
                        <span>{item.day}</span>
                        {/* Green indicator dot for days with recorded menus */}
                        {item.hasMenu && (
                          <span className={`w-1 h-1 rounded-full mt-0.5 ${
                            isSel ? 'bg-white' : 'bg-emerald-500'
                          }`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Popover Footer */}
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(todayStr);
                      setIsCalendarOpen(false);
                    }}
                    className="text-orange-600 hover:text-orange-800 font-semibold cursor-pointer"
                  >
                    เลือกวันนี้ ({formatThaiDisplay(todayStr).split(' ')[1] || 'วันนี้'})
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            )}
          </div>



          {/* Next day button */}
          <button
            id="btn-next-day"
            type="button"
            onClick={handleNextDay}
            className="p-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="วันถัดไป"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick today & status badges */}
        <div className="flex items-center gap-2">
          {selectedDate !== todayStr && (
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className="text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              กลับสู่วันนี้
            </button>
          )}

          {dailyMenus.some((m) => m.date === selectedDate) ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>บันทึกแล้ว</span>
            </span>
          ) : (
            <span className="inline-flex items-center text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              ยังไม่มีเมนูวันนี้
            </span>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Main Daily Menu Form                                       */}
      {/* ------------------------------------------------------------- */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              รายการอาหารประจำวัน
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              พิมพ์ชื่อเมนู หรือคลิกเลือกจากคลังเมนูด้านล่าง
            </p>
          </div>
          {dailyMenus.some((m) => m.date === selectedDate) && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              บันทึกแล้ว
            </span>
          )}
        </div>

        {/* 2-Column Form Grid for Menu Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* 1. ข้าว (Disabled if singleDish has value) */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                1. ข้าว
                {hasSingleDish && (
                  <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-md border border-rose-200 font-semibold ml-1">
                    (ปิดไม่ให้พิมพ์)
                  </span>
                )}
              </label>
              <span className="text-[10px] text-slate-400">เช่น ข้าวสวย ข้าวกล้อง</span>
            </div>
            <input
              id="input-menu-rice"
              type="text"
              placeholder={hasSingleDish ? "ปิดไม่ให้พิมพ์ (เนื่องจากระบุอาหารจานเดียวแล้ว)" : "พิมพ์ชื่อข้าว เช่น ข้าวสวยหอมมะลิใหม่..."}
              value={rice}
              disabled={hasSingleDish}
              onChange={(e) => {
                const val = e.target.value;
                setRice(val);
                if (val.trim()) {
                  setSingleDish('');
                  if (activeSuggestField === 'singleDish') {
                    setActiveSuggestField(null);
                  }
                }
              }}
              onFocus={() => {
                if (!hasSingleDish) setActiveSuggestField('rice');
              }}
              className={`w-full px-3.5 py-2 text-xs rounded-xl transition-all ${
                hasSingleDish
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none'
                  : 'bg-slate-50/50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500'
              }`}
            />
            {!hasSingleDish && activeSuggestField === 'rice' && (
              <div className="mt-1.5 flex flex-wrap gap-1 p-2 bg-amber-50/70 border border-amber-200 rounded-xl">
                <span className="text-[10px] font-semibold text-amber-900 w-full mb-0.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" /> แนะนำจากคลัง:
                </span>
                {getSuggestions('ข้าว', rice).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setRice(item.menuName);
                      setSingleDish('');
                      setActiveSuggestField(null);
                    }}
                    className="text-[11px] bg-white text-slate-700 hover:text-amber-800 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200/80 transition-colors cursor-pointer"
                  >
                    + {item.menuName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. อาหารจานเดียว (Disabled if rice/non-spicy/spicy has value) */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
                2. อาหารจานเดียว
                {hasSetMeal && (
                  <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-md border border-rose-200 font-semibold ml-1">
                    (ปิดไม่ให้พิมพ์)
                  </span>
                )}
              </label>
              <span className="text-[10px] text-slate-400">เช่น ข้าวมันไก่ ก๋วยเตี๋ยว ผัดซีอิ๊ว (วันพุธ)</span>
            </div>
            <input
              id="input-menu-single-dish"
              type="text"
              placeholder={hasSetMeal ? "ปิดไม่ให้พิมพ์อัตโนมัติ (เนื่องจากระบุข้าวหรือกับข้าวแล้ว)" : "พิมพ์ชื่ออาหารจานเดียว เช่น ข้าวมันไก่ตอนสูตรอนามัย..."}
              value={singleDish}
              disabled={hasSetMeal}
              onChange={(e) => {
                const val = e.target.value;
                setSingleDish(val);
                if (val.trim()) {
                  setRice('');
                  setNonSpicy('');
                  setSpicy('');
                }
              }}
              onFocus={() => {
                if (!hasSetMeal) setActiveSuggestField('singleDish');
              }}
              className={`w-full px-3.5 py-2 text-xs rounded-xl transition-all ${
                hasSetMeal
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none'
                  : 'bg-slate-50/50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500'
              }`}
            />
            {!hasSetMeal && activeSuggestField === 'singleDish' && (
              <div className="mt-1.5 flex flex-wrap gap-1 p-2 bg-orange-50/70 border border-orange-200 rounded-xl">
                <span className="text-[10px] font-semibold text-orange-900 w-full mb-0.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-orange-600" /> แนะนำจากคลัง:
                </span>
                {getSuggestions('อาหารจานเดียว', singleDish).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSingleDish(item.menuName);
                      setRice('');
                      setNonSpicy('');
                      setSpicy('');
                      setActiveSuggestField(null);
                    }}
                    className="text-[11px] bg-white text-slate-700 hover:text-orange-800 hover:bg-orange-100 px-2.5 py-1 rounded-lg border border-orange-200/80 transition-colors cursor-pointer"
                  >
                    + {item.menuName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. อาหารไม่เผ็ด (Disabled if singleDish has value) */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                3. อาหารไม่เผ็ด
                {hasSingleDish && (
                  <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-md border border-rose-200 font-semibold ml-1">
                    (ปิดไม่ให้พิมพ์)
                  </span>
                )}
              </label>
              <span className="text-[10px] text-slate-400">เช่น ต้มจืดเต้าหู้หมูสับ ไข่พะโล้ ไก่ทอด</span>
            </div>
            <input
              id="input-menu-non-spicy"
              type="text"
              placeholder={hasSingleDish ? "ปิดไม่ให้พิมพ์ (เนื่องจากระบุอาหารจานเดียวแล้ว)" : "พิมพ์ชื่ออาหารไม่เผ็ด เช่น ต้มจืดเต้าหู้หมูสับ..."}
              value={nonSpicy}
              disabled={hasSingleDish}
              onChange={(e) => setNonSpicy(e.target.value)}
              onFocus={() => {
                if (!hasSingleDish) setActiveSuggestField('nonSpicy');
              }}
              className={`w-full px-3.5 py-2 text-xs rounded-xl transition-all ${
                hasSingleDish
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none'
                  : 'bg-slate-50/50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
              }`}
            />
            {!hasSingleDish && activeSuggestField === 'nonSpicy' && (
              <div className="mt-1.5 flex flex-wrap gap-1 p-2 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <span className="text-[10px] font-semibold text-emerald-900 w-full mb-0.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" /> แนะนำจากคลัง:
                </span>
                {getSuggestions('อาหารไม่เผ็ด', nonSpicy).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setNonSpicy(item.menuName);
                      setActiveSuggestField(null);
                    }}
                    className="text-[11px] bg-white text-slate-700 hover:text-emerald-800 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200/80 transition-colors cursor-pointer"
                  >
                    + {item.menuName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 4. อาหารเผ็ด (Disabled if singleDish has value) */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                4. อาหารเผ็ด
                {hasSingleDish && (
                  <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-md border border-rose-200 font-semibold ml-1">
                    (ปิดไม่ให้พิมพ์)
                  </span>
                )}
              </label>
              <span className="text-[10px] text-slate-400">เช่น ผัดกะเพราหมู แกงเขียวหวานไก่</span>
            </div>
            <input
              id="input-menu-spicy"
              type="text"
              placeholder={hasSingleDish ? "ปิดไม่ให้พิมพ์ (เนื่องจากระบุอาหารจานเดียวแล้ว)" : "พิมพ์ชื่ออาหารเผ็ด เช่น ผัดกะเพราหมูสับ..."}
              value={spicy}
              disabled={hasSingleDish}
              onChange={(e) => setSpicy(e.target.value)}
              onFocus={() => {
                if (!hasSingleDish) setActiveSuggestField('spicy');
              }}
              className={`w-full px-3.5 py-2 text-xs rounded-xl transition-all ${
                hasSingleDish
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none'
                  : 'bg-slate-50/50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500'
              }`}
            />
            {!hasSingleDish && activeSuggestField === 'spicy' && (
              <div className="mt-1.5 flex flex-wrap gap-1 p-2 bg-rose-50/70 border border-rose-200 rounded-xl">
                <span className="text-[10px] font-semibold text-rose-900 w-full mb-0.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-rose-600" /> แนะนำจากคลัง:
                </span>
                {getSuggestions('อาหารเผ็ด', spicy).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSpicy(item.menuName);
                      setActiveSuggestField(null);
                    }}
                    className="text-[11px] bg-white text-slate-700 hover:text-rose-800 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200/80 transition-colors cursor-pointer"
                  >
                    + {item.menuName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 5. ผลไม้-ของหวาน (Supports both ผลไม้ and ของหวาน) */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
                5. ผลไม้-ของหวาน
              </label>
              <span className="text-[10px] text-slate-400">ดึงได้ทั้งหมวดผลไม้และของหวาน</span>
            </div>
            <input
              id="input-menu-dessert"
              type="text"
              placeholder="พิมพ์ชื่อผลไม้หรือของหวาน เช่น แตงโม หรือ บัวลอย..."
              value={dessert}
              onChange={(e) => setDessert(e.target.value)}
              onFocus={() => setActiveSuggestField('dessert')}
              className="w-full px-3.5 py-2 text-xs bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
            {activeSuggestField === 'dessert' && (
              <div className="mt-1.5 flex flex-wrap gap-1 p-2 bg-purple-50/70 border border-purple-200 rounded-xl">
                <span className="text-[10px] font-semibold text-purple-900 w-full mb-0.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" /> แนะนำจากคลัง:
                </span>
                {getDessertSuggestions(dessert).map((item) => {
                  const isDessert = item.category === 'ของหวาน' || item.menuName.includes('หวาน') || item.menuName.includes('บัวลอย') || item.menuName.includes('กล้วยบวชชี');
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setDessert(item.menuName);
                        setActiveSuggestField(null);
                      }}
                      className="text-[11px] bg-white text-slate-700 hover:text-purple-800 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200/80 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span className={`text-[9px] px-1 py-0.2 rounded font-medium ${
                        isDessert ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'
                      }`}>
                        {isDessert ? 'ของหวาน' : 'ผลไม้'}
                      </span>
                      <span>{item.menuName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 6. หมายเหตุ / บันทึกเพิ่มเติม */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                6. หมายเหตุ / บันทึกเพิ่มเติม
              </label>
              <span className="text-[10px] text-slate-400">เริ่มต้นด้วยช่องเปล่า (ถ้ามี)</span>
            </div>
            <input
              id="input-menu-note"
              type="text"
              placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
            />
          </div>
        </div>

        {/* Action Buttons: Save & Auto-Advance */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            เมื่อบันทึก ระบบจะเลื่อนไปวันถัดไปอัตโนมัติ (ข้ามเสาร์-อาทิตย์ไปวันจันทร์)
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {dailyMenus.some((m) => m.date === selectedDate) && (
              <button
                type="button"
                id="btn-delete-daily-menu"
                onClick={() => handleDeleteEntry(selectedDate)}
                className="px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer"
              >
                ลบเมนูวันนี้
              </button>
            )}

            <button
              type="submit"
              id="btn-save-daily-menu"
              className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึก & ไปวันถัดไป</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>
      </form>

      {/* ------------------------------------------------------------- */}
      {/* 4. Calendar Summary Table of Saved Menus                      */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>ปฏิทินเมนูที่บันทึกแล้วในระบบ</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-semibold">
                {calendarSearchQuery.trim() ? `พบ ${filteredCalendarEntries.length} จาก ${dailyMenus.length} วัน` : `${dailyMenus.length} วัน`}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              ค้นหาเมนูที่ต้องการ แล้วกดปุ่ม <span className="text-blue-600 font-semibold">"คัดลอก"</span> เพื่อนำไปใส่ในวันที่กำลังจัดเมนูด้านบนได้ทันที
            </p>
          </div>

          {/* Search Box for Menus to Copy */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="input-search-calendar-menu"
              value={calendarSearchQuery}
              onChange={(e) => setCalendarSearchQuery(e.target.value)}
              placeholder="ค้นหาเมนูเพื่อคัดลอก (เช่น ข้าวมันไก่, แกงส้ม, ต้มยำ)..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none"
            />
            {calendarSearchQuery && (
              <button
                type="button"
                onClick={() => setCalendarSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                title="ล้างคำค้นหา"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-orange-50/70 border-b border-orange-100 text-orange-950 font-bold">
                <th className="py-2.5 px-3 text-center rounded-l-lg whitespace-nowrap w-36 sm:w-44">วันที่</th>
                <th className="py-2.5 px-4 text-center">รายการอาหาร</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap w-36 sm:w-48">หมายเหตุ</th>
                <th className="py-2.5 px-3 text-center rounded-r-lg whitespace-nowrap w-28">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyMenus.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    ยังไม่มีรายการอาหารที่บันทึกไว้ในระบบ สามารถเริ่มสุ่มหรือกรอกเมนูได้จากด้านบน
                  </td>
                </tr>
              ) : filteredCalendarEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <p className="font-medium text-slate-600">ไม่พบรายการอาหารที่ตรงกับ "{calendarSearchQuery}"</p>
                      <p className="text-xs text-slate-400">ลองค้นหาด้วยชื่อเมนูอื่น หรือกดล้างคำค้นหา</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCalendarEntries.map((entry) => {
                  const isCurrent = entry.date === selectedDate;
                  const parts = entry.date.split('-').map(Number);
                  const d = new Date(parts[0], parts[1] - 1, parts[2]);
                  const isMonday = d.getDay() === 1;
                  const mealString = formatMealList(entry);

                  return (
                    <tr
                      key={entry.date}
                      onClick={() => handleEditEntry(entry)}
                      className={`cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-orange-100/60 font-medium'
                          : isMonday
                          ? 'bg-amber-50/50 hover:bg-amber-100/40'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* 1. วันที่: รูปแบบสั้นเหมือนรายงานพิมพ์ (จ. 1/9/69) พร้อมวันที่เต็ม */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-center">
                        <div className="font-bold text-slate-900 flex items-center justify-center gap-1.5">
                          {isMonday && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="วันจันทร์ (เริ่มต้นสัปดาห์)" />
                          )}
                          <span>{formatShortDate(entry.date)}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {formatThaiDisplay(entry.date)}
                        </div>
                      </td>

                      {/* 2. รายการอาหาร: แสดงตรงตามพิมพ์รายงาน เช่น ข้าวสวย + แกงเผ็ด + แกงจืด + ผลไม้ หรือ ข้าวมันไก่ + ผลไม้ */}
                      <td className="py-2.5 px-4 text-slate-800 font-medium leading-relaxed">
                        {mealString}
                      </td>

                      {/* 3. หมายเหตุ */}
                      <td className="py-2.5 px-3 text-center text-slate-500 text-xs">
                        {entry.note || '-'}
                      </td>

                      {/* 4. จัดการ */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div 
                          className="flex items-center justify-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Copy icon */}
                          <button
                            type="button"
                            id={`btn-copy-to-form-${entry.date}`}
                            onClick={() => {
                              handleCopyDirectToForm(entry);
                              showToast('คัดลอกเมนูสำเร็จ!', `นำเมนูของวันที่ ${formatThaiDisplay(entry.date)} มาใส่ในฟอร์มของวันที่ ${formatThaiDisplay(selectedDate)} แล้ว`, 'success');
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 border border-blue-200/80 rounded-lg transition-all cursor-pointer text-xs font-semibold shadow-2xs"
                            title={`คัดลอกเมนูนี้ไปใส่วันที่ ${formatThaiDisplay(selectedDate)}`}
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">คัดลอก</span>
                          </button>

                          {/* Edit icon */}
                          <button
                            type="button"
                            id={`btn-edit-entry-${entry.date}`}
                            onClick={() => handleEditEntry(entry)}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไขรายการอาหารวันนี้"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Delete icon */}
                          <button
                            type="button"
                            id={`btn-delete-entry-${entry.date}`}
                            onClick={() => handleDeleteEntry(entry.date)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="ลบรายการอาหารวันนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Entry Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmDate)}
        title="ยืนยันการลบรายการอาหาร"
        message={
          deleteConfirmDate
            ? `คุณต้องการลบรายการอาหารวันที่ ${formatThaiDisplay(deleteConfirmDate)} หรือไม่?`
            : ''
        }
        confirmText="ลบรายการ"
        cancelText="ยกเลิก"
        type="danger"
        onConfirm={executeDeleteEntry}
        onCancel={() => setDeleteConfirmDate(null)}
      />

      {/* Randomize Month Overwrite Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(randomizeConfirmData)}
        title="ยืนยันการสุ่มจัดอาหารกลางวันใหม่"
        message={
          randomizeConfirmData
            ? `พบรายการอาหารในเดือน ${THAI_MONTH_NAMES[randomMonth - 1]} ${randomYear + 543} บันทึกอยู่แล้ว ${randomizeConfirmData.count} วัน\n\nต้องการสุ่มจัดเมนูใหม่แทนที่ทั้งหมด (${randomizeConfirmData.total} วันทำการ) หรือไม่?`
            : ''
        }
        confirmText="ยืนยันการจัดใหม่"
        cancelText="ยกเลิก"
        type="info"
        onConfirm={async () => {
          setRandomizeConfirmData(null);
          await executeRandomizeMonth();
        }}
        onCancel={() => setRandomizeConfirmData(null)}
      />
    </div>
  );
};
