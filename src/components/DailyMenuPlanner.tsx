import React, { useState, useEffect, useRef } from 'react';
import { DailyMenuEntry, MenuItem, ActivityPhoto, MenuCategory } from '../types';
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
  X
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

export const DailyMenuPlanner: React.FC<DailyMenuPlannerProps> = ({
  dailyMenus,
  menuBank,
  onSaveDailyMenu,
  onBatchSaveDailyMenus,
  onDeleteDailyMenu,
  showToast
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
    if (window.confirm(`ยืนยันการลบรายการอาหารวันที่ ${formatThaiDisplay(dateStr)} หรือไม่?`)) {
      onDeleteDailyMenu(dateStr);
      showToast('ลบรายการสำเร็จ', `ลบรายการอาหารวันที่ ${formatThaiDisplay(dateStr)} เรียบร้อยแล้ว`, 'info');
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
  // Requirement 3: Monthly Menu Randomizer Engine
  // - Single dish: exactly 1 day per week (on Wednesday)
  // - Dessert: 2 days per week
  // - Remaining days: Fruit
  // -------------------------------------------------------------------------
  const handleRandomizeMonth = async () => {
    setIsRandomizing(true);
    try {
      // 1. Classify items from menuBank
      const isDessertName = (name: string) => {
        const n = name.toLowerCase();
        return n.includes('บัวลอย') || n.includes('กล้วยบวชชี') || n.includes('เฉาก๊วย') || 
               n.includes('หวาน') || n.includes('ถั่วเขียว') || n.includes('วุ้น');
      };

      const riceItems = menuBank.filter((m) => m.category === 'ข้าว');
      const singleDishItems = menuBank.filter((m) => m.category === 'อาหารจานเดียว');
      const nonSpicyItems = menuBank.filter((m) => m.category === 'อาหารไม่เผ็ด');
      const spicyItems = menuBank.filter((m) => m.category === 'อาหารเผ็ด');
      const fruitItems = menuBank.filter((m) => m.category === 'ผลไม้' || (m.category === 'ผลไม้-ของหวาน' && !isDessertName(m.menuName)));
      const dessertItems = menuBank.filter((m) => m.category === 'ของหวาน' || (m.category === 'ผลไม้-ของหวาน' && isDessertName(m.menuName)));

      if (singleDishItems.length === 0 && riceItems.length === 0) {
        showToast('คลังเมนูว่าง', 'กรุณาเพิ่มเมนูอาหารในคลังเมนูก่อนสุ่มจัดอาหารกลางวัน', 'warning');
        return;
      }

      // 2. Gather all school days (Mon-Fri) in the selected month & year
      const daysInMonth = new Date(randomYear, randomMonth, 0).getDate();
      const schoolDaysByWeek: { weekNumber: number; dates: Date[] }[] = [];

      let currentWeek: Date[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(randomYear, randomMonth - 1, day);
        const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat

        // Only Monday (1) to Friday (5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          // If Monday and we already have days, start a new week
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

      const totalSchoolDays = schoolDaysByWeek.reduce((sum, w) => sum + w.dates.length, 0);

      // Check for existing entries in this month
      const monthPrefix = `${randomYear}-${String(randomMonth).padStart(2, '0')}`;
      const existingInMonth = dailyMenus.filter((m) => m.date.startsWith(monthPrefix));
      if (existingInMonth.length > 0) {
        const confirmMsg = `พบเมนูในเดือน ${THAI_MONTH_NAMES[randomMonth - 1]} ${randomYear + 543} บันทึกอยู่แล้ว ${existingInMonth.length} วัน\n\nต้องการสุ่มจัดเมนูใหม่แทนที่ทั้งหมด (${totalSchoolDays} วันทำการ) หรือไม่?`;
        if (!window.confirm(confirmMsg)) {
          return;
        }
      }

      // Random picker helper avoiding immediate repeat
      const getRandom = (arr: MenuItem[], prevName?: string): string => {
        if (!arr || arr.length === 0) return '';
        const filtered = arr.filter((x) => x.menuName !== prevName);
        const pool = filtered.length > 0 ? filtered : arr;
        return pool[Math.floor(Math.random() * pool.length)].menuName;
      };

      let lastRice = '';
      let lastSingleDish = '';
      let lastNonSpicy = '';
      let lastSpicy = '';
      let lastDessert = '';
      let lastFruit = '';

      const generatedEntries: DailyMenuEntry[] = [];

      // 3. Process each week applying strict constraints:
      // Requirement: Single dish is ONLY on Wednesday (dayOfWeek === 3)
      // Requirement: Dessert 2 days per week, remainder 3 days is Fruit
      // User request: "ของหวานจะอยู่กับอาหารจานเดียวยิ่งดีเลย" -> Pair dessert with Wednesday single dish!
      schoolDaysByWeek.forEach((week) => {
        const days = week.dates;

        const dessertIndices = new Set<number>();
        const wedIdx = days.findIndex((d) => d.getDay() === 3);

        if (wedIdx !== -1) {
          // Wednesday has Single Dish AND gets Dessert #1!
          dessertIndices.add(wedIdx);

          // Pick 2nd dessert day from remaining school days (prefer Friday, then Tuesday)
          const friIdx = days.findIndex((d) => d.getDay() === 5);
          const tueIdx = days.findIndex((d) => d.getDay() === 2);
          const otherDays = days.map((_, i) => i).filter((i) => i !== wedIdx);

          if (friIdx !== -1 && otherDays.includes(friIdx)) {
            dessertIndices.add(friIdx);
          } else if (tueIdx !== -1 && otherDays.includes(tueIdx)) {
            dessertIndices.add(tueIdx);
          } else if (otherDays.length > 0) {
            dessertIndices.add(otherDays[0]);
          }
        } else {
          // If Wednesday not in this week (e.g. partial week at month boundary)
          if (days.length <= 2) {
            if (days.length > 0) dessertIndices.add(0);
          } else {
            dessertIndices.add(0);
            dessertIndices.add(Math.min(2, days.length - 1));
          }
        }

        days.forEach((dateObj, idx) => {
          const dateStr = toDateString(dateObj);
          const dayOfWeek = dateObj.getDay();

          // Requirement: Single dish 1 day per week, specifically on Wednesday (dayOfWeek === 3)
          const isWednesday = dayOfWeek === 3;

          let itemRice = '';
          let itemSingleDish = '';
          let itemNonSpicy = '';
          let itemSpicy = '';
          let itemSweet = '';

          if (isWednesday) {
            // Wednesday = Single Dish
            itemSingleDish = getRandom(singleDishItems, lastSingleDish);
            lastSingleDish = itemSingleDish;
            itemRice = '';
            itemNonSpicy = '';
            itemSpicy = '';
          } else {
            // Other days = Rice + Non-Spicy + Spicy
            itemRice = getRandom(riceItems, lastRice);
            lastRice = itemRice;
            itemSingleDish = '';
            itemNonSpicy = getRandom(nonSpicyItems, lastNonSpicy);
            lastNonSpicy = itemNonSpicy;
            itemSpicy = getRandom(spicyItems, lastSpicy);
            lastSpicy = itemSpicy;
          }

          // Dessert (2 days/week) vs Fruit (remainder)
          if (dessertIndices.has(idx)) {
            itemSweet = getRandom(dessertItems.length > 0 ? dessertItems : fruitItems, lastDessert);
            lastDessert = itemSweet;
          } else {
            itemSweet = getRandom(fruitItems.length > 0 ? fruitItems : dessertItems, lastFruit);
            lastFruit = itemSweet;
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

      // 4. Save to state and GAS
      if (onBatchSaveDailyMenus) {
        await onBatchSaveDailyMenus(generatedEntries);
      } else {
        for (const entry of generatedEntries) {
          await onSaveDailyMenu(entry);
        }
      }

      // Jump view to the first generated school day
      if (generatedEntries.length > 0) {
        setSelectedDate(generatedEntries[0].date);
      }

      showToast(
        'สุ่มจัดอาหารกลางวันสำเร็จ!',
        `จัดเมนูเรียบร้อย ${generatedEntries.length} วันทำการ ประจำเดือน ${THAI_MONTH_NAMES[randomMonth - 1]} ${randomYear + 543} (วันพุธจานเดียว, ขนมหวาน 2 วัน/สัปดาห์, ผลไม้ส่วนที่เหลือ)`,
        'success'
      );
    } catch (err: any) {
      console.error('Error randomizing monthly menu:', err);
      showToast('เกิดข้อผิดพลาด', err?.message || 'ไม่สามารถสุ่มจัดเมนูได้', 'error');
    } finally {
      setIsRandomizing(false);
    }
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

        {/* 1. ข้าว (Disabled if singleDish has value) */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              1. ข้าว
              {hasSingleDish && (
                <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 font-semibold ml-1">
                  (ปิดไม่ให้พิมพ์ เนื่องจากระบุอาหารจานเดียวแล้ว)
                </span>
              )}
            </label>
            <span className="text-[10px] text-slate-400">เช่น ข้าวสวย ข้าวกล้อง ข้าวไรซ์เบอร์รี่</span>
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
                <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 font-semibold ml-1">
                  (ปิดไม่ให้พิมพ์อัตโนมัติ เนื่องจากระบุข้าวหรือกับข้าวแล้ว)
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
                <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 font-semibold ml-1">
                  (ปิดไม่ให้พิมพ์ เนื่องจากระบุอาหารจานเดียวแล้ว)
                </span>
              )}
            </label>
            <span className="text-[10px] text-slate-400">เช่น ต้มจืดเต้าหู้หมูสับ ไข่พะโล้ ไก่ทอด</span>
          </div>
          <input
            id="input-menu-non-spicy"
            type="text"
            placeholder={hasSingleDish ? "ปิดไม่ให้พิมพ์ (เนื่องจากระบุอาหารจานเดียวแล้ว)" : "พิมพ์ชื่ออาหารไม่เผ็ด เช่น ต้มจืดเต้าหู้หมูสับสาหร่ายวากาเมะ..."}
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
                <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 font-semibold ml-1">
                  (ปิดไม่ให้พิมพ์ เนื่องจากระบุอาหารจานเดียวแล้ว)
                </span>
              )}
            </label>
            <span className="text-[10px] text-slate-400">เช่น ผัดกะเพราหมูสับ แกงเขียวหวานไก่ ผัดพริกแกง</span>
          </div>
          <input
            id="input-menu-spicy"
            type="text"
            placeholder={hasSingleDish ? "ปิดไม่ให้พิมพ์ (เนื่องจากระบุอาหารจานเดียวแล้ว)" : "พิมพ์ชื่ออาหารเผ็ด เช่น ผัดกะเพราหมูสับใบกะเพราบ้าน..."}
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

        {/* 5. ผลไม้-ของหวาน (Requirement 4: Supports both ผลไม้ and ของหวาน) */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
              5. ผลไม้-ของหวาน
            </label>
            <span className="text-[10px] text-slate-400">ดึงได้ทั้งหมวดผลไม้และของหวาน เช่น แตงโม กล้วยน้ำว้า บัวลอย</span>
          </div>
          <input
            id="input-menu-dessert"
            type="text"
            placeholder="พิมพ์ชื่อผลไม้หรือของหวาน เช่น แตงโมกินรี หรือ บัวลอยเผือก..."
            value={dessert}
            onChange={(e) => setDessert(e.target.value)}
            onFocus={() => setActiveSuggestField('dessert')}
            className="w-full px-3.5 py-2 text-xs bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
          />
          {activeSuggestField === 'dessert' && (
            <div className="mt-1.5 flex flex-wrap gap-1 p-2 bg-purple-50/70 border border-purple-200 rounded-xl">
              <span className="text-[10px] font-semibold text-purple-900 w-full mb-0.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-600" /> แนะนำจากคลัง (ผลไม้ และ ของหวาน):
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

        {/* Note / Remarks */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            หมายเหตุ / บันทึกเพิ่มเติม
          </label>
          <input
            id="input-menu-note"
            type="text"
            placeholder="หมายเหตุ (เริ่มต้นด้วยช่องเปล่า)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
          />
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              ปฏิทินเมนูที่บันทึกแล้วในระบบ ({dailyMenus.length} วัน)
            </h3>
            <p className="text-xs text-slate-500">
              คลิกแถวเพื่อดูข้อมูล หรือใช้ไอคอน คัดลอก แก้ไข ลบ ในคอลัมน์ขวาสุด
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-orange-50/70 border-b border-orange-100 text-orange-950 font-bold">
                <th className="py-2.5 px-3 rounded-l-lg">วันที่</th>
                <th className="py-2.5 px-3">ข้าว/จานเดียว</th>
                <th className="py-2.5 px-3">กับข้าว (ไม่เผ็ด / เผ็ด)</th>
                <th className="py-2.5 px-3">ผลไม้-ของหวาน</th>
                <th className="py-2.5 px-3">หมายเหตุ</th>
                <th className="py-2.5 px-3 text-right rounded-r-lg">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyMenus.map((entry) => {
                const isCurrent = entry.date === selectedDate;
                const parts = entry.date.split('-').map(Number);
                const d = new Date(parts[0], parts[1] - 1, parts[2]);
                const isMonday = d.getDay() === 1;

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
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        {isMonday && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="วันจันทร์ (เริ่มต้นสัปดาห์)" />
                        )}
                        <span>{formatThaiDisplay(entry.date)}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{entry.date}</div>
                    </td>
                    <td className="py-2.5 px-3 max-w-[180px] truncate text-slate-700">
                      {entry.singleDish ? (
                        <span className="font-medium text-orange-800">
                          [จานเดียว] {entry.singleDish}
                        </span>
                      ) : entry.rice ? (
                        entry.rice
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-3 max-w-[220px] truncate text-slate-700">
                      {[entry.nonSpicy, entry.spicy].filter(Boolean).join(' + ') || '-'}
                    </td>
                    <td className="py-2.5 px-3 max-w-[160px] truncate text-slate-700">
                      {entry.dessert || '-'}
                    </td>
                    <td className="py-2.5 px-3 max-w-[140px] truncate text-slate-500">
                      {entry.note || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div 
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Copy icon */}
                        <button
                          type="button"
                          id={`btn-copy-to-form-${entry.date}`}
                          onClick={() => handleCopyDirectToForm(entry)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="คัดลอกไปใส่ตรงรายการอาหารเลย"
                        >
                          <Copy className="w-4 h-4" />
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
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
