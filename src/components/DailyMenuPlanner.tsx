import React, { useState, useEffect } from 'react';
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
  CheckCircle2
} from 'lucide-react';

interface DailyMenuPlannerProps {
  dailyMenus: DailyMenuEntry[];
  menuBank: MenuItem[];
  onSaveDailyMenu: (entry: DailyMenuEntry, isAutoAdvance?: boolean) => Promise<boolean> | boolean;
  onDeleteDailyMenu: (dateStr: string) => Promise<void> | void;
  onOpenLightbox?: (photo: ActivityPhoto, allPhotos: ActivityPhoto[], onReplace?: (newPhoto: ActivityPhoto) => void, onDelete?: () => void) => void;
  showToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  gasWebAppUrl?: string;
  onUploadImageToDrive?: (fileData: string, fileName: string, mimeType: string, activityName: string, dateStr: string) => Promise<ActivityPhoto>;
}

export const DailyMenuPlanner: React.FC<DailyMenuPlannerProps> = ({
  dailyMenus,
  menuBank,
  onSaveDailyMenu,
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
  // Default date is today automatically
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  const handleOpenDatePicker = () => {
    if (dateInputRef.current) {
      if ('showPicker' in HTMLInputElement.prototype) {
        try {
          dateInputRef.current.showPicker();
        } catch {
          dateInputRef.current.focus();
        }
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  // Form inputs - note starts as an empty field
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
      // Clear for new entry - note starts empty
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
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const months = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    return `วัน${days[d.getDay()]}ที่ ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
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

  return (
    <div className="space-y-5">
      {/* Date Navigation & Single Unified Calendar Picker on Left */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="btn-prev-day"
            type="button"
            onClick={handlePrevDay}
            className="p-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="วันก่อนหน้า"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Unified Clickable Thai Date Calendar Picker */}
          <div className="relative inline-flex items-center">
            <button
              id="btn-calendar-trigger"
              type="button"
              onClick={handleOpenDatePicker}
              className="relative flex items-center gap-2 bg-slate-50 hover:bg-orange-50/80 border border-slate-300 hover:border-orange-500 rounded-xl px-3.5 py-1.5 transition-all cursor-pointer group shadow-2xs"
              title="คลิกเพื่อเลือกวันที่จากปฏิทิน"
            >
              <CalendarIcon className="w-4 h-4 text-orange-600 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-orange-700 select-none">
                {formatThaiDisplay(selectedDate)}
              </span>
              <input
                ref={dateInputRef}
                id="input-calendar-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer pointer-events-auto"
                title="คลิกเพื่อเลือกวันที่"
              />
            </button>
          </div>

          <button
            id="btn-next-day"
            type="button"
            onClick={handleNextDay}
            className="p-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="วันถัดไป"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {dailyMenus.some((m) => m.date === selectedDate) && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>บันทึกแล้ว</span>
          </span>
        )}
      </div>

      {/* Main Form: Food Items Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              รายการอาหาร
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              พิมพ์เพื่อค้นหาอัตโนมัติ (Auto-suggest) หรือคลิกเลือกจากคลังเมนูด้านล่าง
            </p>
          </div>
          {dailyMenus.some((m) => m.date === selectedDate) && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              บันทึกแล้ว
            </span>
          )}
        </div>

        {/* 1. ข้าว */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              1. ข้าว
            </label>
            <span className="text-[10px] text-slate-400">เช่น ข้าวสวย ข้าวกล้อง ข้าวไรซ์เบอร์รี่</span>
          </div>
          <input
            id="input-menu-rice"
            type="text"
            placeholder="พิมพ์ชื่อข้าว เช่น ข้าวสวยหอมมะลิใหม่..."
            value={rice}
            onChange={(e) => setRice(e.target.value)}
            onFocus={() => setActiveSuggestField('rice')}
            className="w-full px-3.5 py-2 text-xs bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
          />
          {activeSuggestField === 'rice' && (
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

        {/* 2. อาหารจานเดียว */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
              2. อาหารจานเดียว
            </label>
            <span className="text-[10px] text-slate-400">เช่น ข้าวมันไก่ ก๋วยเตี๋ยว ผัดซีอิ๊ว</span>
          </div>
          <input
            id="input-menu-single-dish"
            type="text"
            placeholder="พิมพ์ชื่ออาหารจานเดียว เช่น ข้าวมันไก่ตอนสูตรอนามัย..."
            value={singleDish}
            onChange={(e) => setSingleDish(e.target.value)}
            onFocus={() => setActiveSuggestField('singleDish')}
            className="w-full px-3.5 py-2 text-xs bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
          />
          {activeSuggestField === 'singleDish' && (
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

        {/* 3. อาหารไม่เผ็ด */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              3. อาหารไม่เผ็ด
            </label>
            <span className="text-[10px] text-slate-400">เช่น ต้มจืดเต้าหู้หมูสับ ไข่พะโล้ ไก่ทอด</span>
          </div>
          <input
            id="input-menu-non-spicy"
            type="text"
            placeholder="พิมพ์ชื่ออาหารไม่เผ็ด เช่น ต้มจืดเต้าหู้หมูสับสาหร่ายวากาเมะ..."
            value={nonSpicy}
            onChange={(e) => setNonSpicy(e.target.value)}
            onFocus={() => setActiveSuggestField('nonSpicy')}
            className="w-full px-3.5 py-2 text-xs bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
          />
          {activeSuggestField === 'nonSpicy' && (
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

        {/* 4. อาหารเผ็ด */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              4. อาหารเผ็ด
            </label>
            <span className="text-[10px] text-slate-400">เช่น ผัดกะเพราหมูสับ แกงเขียวหวานไก่ ผัดพริกแกง</span>
          </div>
          <input
            id="input-menu-spicy"
            type="text"
            placeholder="พิมพ์ชื่ออาหารเผ็ด เช่น ผัดกะเพราหมูสับใบกะเพราบ้าน..."
            value={spicy}
            onChange={(e) => setSpicy(e.target.value)}
            onFocus={() => setActiveSuggestField('spicy')}
            className="w-full px-3.5 py-2 text-xs bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
          />
          {activeSuggestField === 'spicy' && (
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

        {/* 5. ผลไม้-ของหวาน */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
              5. ผลไม้-ของหวาน
            </label>
            <span className="text-[10px] text-slate-400">เช่น แตงโม กล้วยน้ำว้า สับปะรด บัวลอย</span>
          </div>
          <input
            id="input-menu-dessert"
            type="text"
            placeholder="พิมพ์ชื่อผลไม้-ของหวาน เช่น แตงโมกินรีหวานฉ่ำ..."
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
              {getSuggestions('ผลไม้-ของหวาน', dessert).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setDessert(item.menuName);
                    setActiveSuggestField(null);
                  }}
                  className="text-[11px] bg-white text-slate-700 hover:text-purple-800 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200/80 transition-colors cursor-pointer"
                >
                  + {item.menuName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Note / Remarks - starts with empty field */}
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

      {/* Calendar Summary Table of Saved Menus */}
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
                return (
                  <tr
                    key={entry.date}
                    onClick={() => handleEditEntry(entry)}
                    className={`cursor-pointer transition-colors ${
                      isCurrent ? 'bg-orange-50/90 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{formatThaiDisplay(entry.date)}</div>
                      <div className="text-[10px] text-slate-400">{entry.date}</div>
                    </td>
                    <td className="py-2.5 px-3 max-w-[180px] truncate text-slate-700">
                      {entry.singleDish || entry.rice || '-'}
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
                        {/* ไอคอน คัดลอก (ไปใส่ตรงรายการอาหารเลย) */}
                        <button
                          type="button"
                          id={`btn-copy-to-form-${entry.date}`}
                          onClick={() => handleCopyDirectToForm(entry)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="คัดลอกไปใส่ตรงรายการอาหารเลย"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* ไอคอน แก้ไข */}
                        <button
                          type="button"
                          id={`btn-edit-entry-${entry.date}`}
                          onClick={() => handleEditEntry(entry)}
                          className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="แก้ไขรายการอาหารวันนี้"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* ไอคอน ลบ */}
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
