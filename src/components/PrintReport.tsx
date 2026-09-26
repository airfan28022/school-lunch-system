import React, { useState, useMemo } from 'react';
import { DailyMenuEntry, SchoolSettings, MenuItem } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { generateMonthlyMenu } from '../services/menuRandomizer';
import { 
  Printer, 
  Search, 
  Calendar, 
  Pencil, 
  Trash2, 
  Plus, 
  X, 
  Save, 
  Sparkles 
} from 'lucide-react';

interface PrintReportProps {
  dailyMenus: DailyMenuEntry[];
  settings: SchoolSettings;
  showToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  menuBank?: MenuItem[];
  onSaveDailyMenu?: (entry: DailyMenuEntry) => Promise<boolean> | boolean;
  onDeleteDailyMenu?: (dateStr: string) => Promise<void> | void;
  onBatchDeleteDailyMenus?: (dates: string[]) => Promise<void> | void;
  onBatchSaveDailyMenus?: (entries: DailyMenuEntry[]) => Promise<boolean> | boolean;
  initialMonth?: number;
  initialYear?: number;
  onNavigateToPlanner?: (date?: string) => void;
}

export const PrintReport: React.FC<PrintReportProps> = ({
  dailyMenus,
  settings,
  showToast,
  menuBank = [],
  onSaveDailyMenu,
  onDeleteDailyMenu,
  onBatchDeleteDailyMenus,
  onBatchSaveDailyMenus,
  initialMonth,
  initialYear,
  onNavigateToPlanner
}) => {
  const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const THAI_DAY_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

  // 1. รวมเดือนทั้งหมดที่มีเมนูอยู่ในระบบ เพื่อสร้างแท็บเลือกเดือนแบบด่วนและช่วยเลือกเดือนอัตโนมัติ
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, { year: number; month: number; count: number }>();
    dailyMenus.forEach((item) => {
      const parts = item.date.split('-');
      if (parts.length >= 2) {
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const key = `${y}-${String(m).padStart(2, '0')}`;
        const existing = monthMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          monthMap.set(key, { year: y, month: m, count: 1 });
        }
      }
    });

    const list = Array.from(monthMap.entries()).map(([key, val]) => ({
      key,
      year: val.year,
      month: val.month,
      count: val.count,
      label: `${THAI_MONTHS[val.month - 1]} ${val.year + 543}`
    }));

    // เรียงลำดับจากเดือนล่าสุดไปหาเดือนก่อนหน้า
    list.sort((a, b) => b.key.localeCompare(a.key));
    return list;
  }, [dailyMenus]);

  // กำหนดเดือนและปีเริ่มต้น:
  // ลำดับ 1: ใช้จาก initialYear / initialMonth ถ้ามีส่งเข้ามา (เช่น เพิ่งกดสุ่มในหน้าจัดการ)
  // ลำดับ 2: ถ้ามีเมนูในระบบ ให้เลือกเดือนล่าสุดที่มีข้อมูล
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (initialYear) return initialYear;
    return new Date().getFullYear();
  });

  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    if (initialMonth) return initialMonth;
    return new Date().getMonth() + 1;
  });

  // ซิงค์เมื่อ initialMonth หรือ initialYear จากภายนอกเปลี่ยน (เช่น ผู้ใช้เพิ่งกดสุ่มเดือนใหม่)
  React.useEffect(() => {
    if (initialMonth) setSelectedMonth(initialMonth);
    if (initialYear) setSelectedYear(initialYear);
  }, [initialMonth, initialYear]);
  
  // Filter by search
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Edit Modal State (Requirement 1.1 & 1.8)
  const [editingEntry, setEditingEntry] = useState<DailyMenuEntry | null>(null);
  const [editRice, setEditRice] = useState<string>('');
  const [editSingleDish, setEditSingleDish] = useState<string>('');
  const [editNonSpicy, setEditNonSpicy] = useState<string>('');
  const [editSpicy, setEditSpicy] = useState<string>('');
  const [editDessert, setEditDessert] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');

  // Active field focus for suggestion display
  const [activeField, setActiveField] = useState<string | null>(null);

  // Add New Date Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newDateStr, setNewDateStr] = useState<string>('');
  const [deletingDateStr, setDeletingDateStr] = useState<string | null>(null);

  // Month Deletion & Randomize States (User Requirements)
  const [isDeleteMonthModalOpen, setIsDeleteMonthModalOpen] = useState<boolean>(false);
  const [isRandomizeConfirmOpen, setIsRandomizeConfirmOpen] = useState<boolean>(false);
  const [isRandomizing, setIsRandomizing] = useState<boolean>(false);

  // รายการปีทั้งหมดที่สามารถเลือกได้
  const availableYears = useMemo(() => {
    const currentY = new Date().getFullYear();
    const set = new Set<number>([currentY - 1, currentY, currentY + 1, currentY + 2, selectedYear]);
    dailyMenus.forEach((m) => {
      const y = Number(m.date.split('-')[0]);
      if (y) set.add(y);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [dailyMenus, selectedYear]);

  // Current month prefix (YYYY-MM)
  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  // Filter entries belonging to this month, ALWAYS sorted from day 1 to day 31 (Requirement 1.5)
  // Deduplicate strictly by date so no duplicate days can ever exist in the report table
  const monthEntries = useMemo(() => {
    const map = new Map<string, DailyMenuEntry>();
    dailyMenus.forEach((item) => {
      if (item && item.date) {
        const cleanDate = item.date.trim().slice(0, 10);
        if (cleanDate.startsWith(monthKey) && /^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
          map.set(cleanDate, { ...item, date: cleanDate });
        }
      }
    });
    let filtered = Array.from(map.values());

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      filtered = filtered.filter((item) => 
        item.date.includes(q) ||
        item.rice.toLowerCase().includes(q) ||
        item.singleDish.toLowerCase().includes(q) ||
        item.spicy.toLowerCase().includes(q) ||
        item.nonSpicy.toLowerCase().includes(q) ||
        item.dessert.toLowerCase().includes(q) ||
        (item.note && item.note.toLowerCase().includes(q))
      );
    }

    // Always sort ascending from day 1 of month
    filtered.sort((a, b) => a.date.localeCompare(b.date));

    return filtered;
  }, [dailyMenus, monthKey, searchFilter]);

  /**
   * Format Short Date: e.g. "จ. 1/9/69", "อ. 2/9/69"
   */
  const formatShortDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-').map(Number);
    const y = parts[0] > 2400 ? parts[0] - 543 : parts[0];
    const d = new Date(y, parts[1] - 1, parts[2], 12, 0, 0);
    const dayShort = THAI_DAY_SHORT[d.getDay()];
    const dateNum = d.getDate();
    const monthNum = d.getMonth() + 1;
    const yearShort = String(y + 543).slice(-2);
    return `${dayShort} ${dateNum}/${monthNum}/${yearShort}`;
  };

  /**
   * Requirement 1.7 & User Request 3:
   * Format meal list as "ข้าว + ผัดเผ็ด + แกงจืด + ส้ม" or "ข้าวมันไก่ตอน + ผลไม้"
   * Removed "(อาหารจานเดียว)" from printed/displayed table string
   */
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

  // Open Edit Modal for a day
  const handleOpenEdit = (entry: DailyMenuEntry) => {
    setEditingEntry(entry);
    setEditRice(entry.rice || '');
    setEditSingleDish(entry.singleDish || '');
    setEditNonSpicy(entry.nonSpicy || '');
    setEditSpicy(entry.spicy || '');
    setEditDessert(entry.dessert || '');
    setEditNote(entry.note || '');
    setActiveField(null);
  };

  // Save changes from Edit Modal
  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingEntry) return;

    const updated: DailyMenuEntry = {
      ...editingEntry,
      rice: editRice.trim(),
      singleDish: editSingleDish.trim(),
      nonSpicy: editNonSpicy.trim(),
      spicy: editSpicy.trim(),
      dessert: editDessert.trim(),
      note: editNote.trim(),
      lastModified: new Date().toISOString()
    };

    if (onSaveDailyMenu) {
      await onSaveDailyMenu(updated);
      showToast('บันทึกการแก้ไขสำเร็จ', `อัปเดตรายการอาหารวันที่ ${formatShortDate(updated.date)} เรียบร้อยแล้ว`, 'success');
    }
    setEditingEntry(null);
  };

  // Delete row
  const handleDeleteRow = (dateStr: string) => {
    setDeletingDateStr(dateStr);
  };

  const executeDeleteRow = async () => {
    if (!deletingDateStr) return;
    const targetDate = deletingDateStr;
    setDeletingDateStr(null);
    if (onDeleteDailyMenu) {
      await onDeleteDailyMenu(targetDate);
      showToast('ลบรายการสำเร็จ', `ลบเมนูวันที่ ${formatShortDate(targetDate)} เรียบร้อยแล้ว`, 'info');
    }
    if (editingEntry?.date === targetDate) {
      setEditingEntry(null);
    }
  };

  // Requirement Fix 1: Delete all entries in the currently viewed month
  const executeDeleteWholeMonth = async () => {
    setIsDeleteMonthModalOpen(false);
    const targetDates = monthEntries.map((e) => e.date);
    if (targetDates.length === 0) return;

    if (onBatchDeleteDailyMenus) {
      await onBatchDeleteDailyMenus(targetDates);
    } else if (onDeleteDailyMenu) {
      for (const d of targetDates) {
        await onDeleteDailyMenu(d);
      }
    }
    showToast(
      'ลบรายการทั้งเดือนเรียบร้อย',
      `ลบเมนูอาหารประจำเดือน ${thaiMonthName} ${buddhistYear} ทั้งหมด ${targetDates.length} วันแล้ว`,
      'info'
    );
  };

  // Requirement Fix 2: Randomize menu for currently viewed month
  const executeRandomizeCurrentMonth = async () => {
    setIsRandomizeConfirmOpen(false);
    setIsRandomizing(true);
    try {
      const generatedEntries = generateMonthlyMenu(selectedMonth, selectedYear, menuBank, dailyMenus);
      if (onBatchSaveDailyMenus) {
        await onBatchSaveDailyMenus(generatedEntries);
      } else if (onSaveDailyMenu) {
        for (const entry of generatedEntries) {
          await onSaveDailyMenu(entry);
        }
      }
      showToast(
        'สุ่มจัดอาหารกลางวันสำเร็จ!',
        `จัดเมนูอาหารประจำเดือน ${thaiMonthName} ${buddhistYear} ทั้งหมด ${generatedEntries.length} วันทำการ เรียบร้อยแล้ว`,
        'success'
      );
    } catch (err: any) {
      console.error('Error randomizing monthly menu from report:', err);
      showToast('เกิดข้อผิดพลาด', err?.message || 'ไม่สามารถสุ่มจัดเมนูได้', 'error');
    } finally {
      setIsRandomizing(false);
    }
  };

  const handleRandomizeMonthClick = () => {
    if (monthEntries.length > 0) {
      setIsRandomizeConfirmOpen(true);
    } else {
      executeRandomizeCurrentMonth();
    }
  };

  // Add new day entry in this month
  const handleAddNewDay = async () => {
    if (!newDateStr) {
      showToast('กรุณาระบุวันที่', 'โปรดเลือกวันที่ต้องการเพิ่มรายการอาหาร', 'warning');
      return;
    }
    const newEntry: DailyMenuEntry = {
      date: newDateStr,
      rice: '',
      singleDish: '',
      nonSpicy: '',
      spicy: '',
      dessert: '',
      note: '',
      photos: [],
      lastModified: new Date().toISOString()
    };

    setIsAddModalOpen(false);
    handleOpenEdit(newEntry);
  };

  // Trigger browser native print
  const handlePrint = () => {
    window.print();
  };

  /**
   * Requirement 1.1: Auto-suggestions from MenuBank for each field
   */
  const getSuggestions = (categoryFilter: (cat: string) => boolean, query: string) => {
    const q = query.trim().toLowerCase();
    return menuBank
      .filter((m) => categoryFilter(m.category))
      .filter((m) => !q || m.menuName.toLowerCase().includes(q))
      .slice(0, 8);
  };

  const riceSuggestions = useMemo(() => 
    getSuggestions((cat) => cat === 'ข้าว', editRice),
    [menuBank, editRice]
  );

  const singleDishSuggestions = useMemo(() => 
    getSuggestions((cat) => cat === 'อาหารจานเดียว', editSingleDish),
    [menuBank, editSingleDish]
  );

  const nonSpicySuggestions = useMemo(() => 
    getSuggestions((cat) => cat === 'อาหารไม่เผ็ด', editNonSpicy),
    [menuBank, editNonSpicy]
  );

  const spicySuggestions = useMemo(() => 
    getSuggestions((cat) => cat === 'อาหารเผ็ด', editSpicy),
    [menuBank, editSpicy]
  );

  const dessertSuggestions = useMemo(() => 
    getSuggestions(
      (cat) => cat === 'ผลไม้' || cat === 'ของหวาน' || cat === 'ผลไม้-ของหวาน',
      editDessert
    ),
    [menuBank, editDessert]
  );

  const thaiMonthName = THAI_MONTHS[selectedMonth - 1];
  const buddhistYear = selectedYear + 543;

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------- */}
      {/* Control Bar: Screen Only                                      */}
      {/* ------------------------------------------------------------- */}
      <div className="no-print bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Unified Month & Year Selector with Calendar Icon (Requirement 2.2 & 1.5) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <select
              id="select-report-month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
            >
              {THAI_MONTHS.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
            <span className="text-slate-300">|</span>
            <select
              id="select-report-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  พ.ศ. {y + 543} ({y})
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            พบ {monthEntries.length} วัน
          </span>

          {/* สุ่มจัดอาหารเดือนนี้ (Requirement Fix 2) */}
          <button
            type="button"
            id="btn-randomize-report-month"
            onClick={handleRandomizeMonthClick}
            disabled={isRandomizing}
            className="px-2.5 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 rounded-xl border border-amber-300 flex items-center gap-1 transition-all cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50"
            title={`สุ่มจัดเมนูอาหารกลางวันทั้งเดือน ${thaiMonthName} ${buddhistYear} ตามหลักโภชนาการ`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{isRandomizing ? 'กำลังจัดเมนู...' : 'สุ่มจัดอาหารเดือนนี้'}</span>
          </button>

          {/* ลบรายการทั้งเดือน: เปลี่ยนเป็นไอคอนขยะตามที่ผู้ใช้ร้องขอ */}
          {monthEntries.length > 0 && (
            <button
              type="button"
              id="btn-delete-report-month"
              onClick={() => setIsDeleteMonthModalOpen(true)}
              className="p-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 rounded-xl border border-rose-200 flex items-center justify-center transition-colors cursor-pointer"
              title={`ลบรายการอาหารทั้งหมดในเดือน ${thaiMonthName} ${buddhistYear} (${monthEntries.length} วัน)`}
              aria-label={`ลบรายการอาหารทั้งหมดในเดือน ${thaiMonthName} ${buddhistYear}`}
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setNewDateStr(`${monthKey}-01`);
              setIsAddModalOpen(true);
            }}
            className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
            title="เพิ่มเมนูวันใหม่"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มวัน</span>
          </button>
        </div>

        {/* Right: Search & Action Buttons (Sort button removed as requested in 1.5) */}
        <div className="flex flex-wrap items-center gap-2.5 justify-start lg:justify-end">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-filter-report"
              type="text"
              placeholder="ค้นหารายการ..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 w-36 sm:w-44"
            />
          </div>

          {/* Action Button: Print / Save as PDF via Browser */}
          <button
            id="btn-print-action"
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            title="สั่งพิมพ์ A4 หรือบันทึกเป็นไฟล์ PDF"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* A4 Printable Sheet Container (Requirement 1.2 Font & Space)   */}
      {/* ------------------------------------------------------------- */}
      <div 
        id="printable-a4-sheet"
        className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm print-page-container mx-auto max-w-[210mm]"
      >
        {/* Printable Header:
            1.1 เอาโลโก้ออก
            1.2 รายงานอาหารกลางวัน ประจำเดือน... ให้อยู่บรรทัดบนแรกตรงกลาง
            1.3 เอาออกชื่อผู้รับผิดชอบทั้งหมด
            1.4 เอาออกพิมพ์เมื่อ...
            1.5 เอาออกสังกัด...
            1.6 เอาออกคำว่าตารางเมนูอาหารกลางวัน
        */}
        <div className="print-header text-center pb-3 mb-4 border-b-2 border-slate-900">
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 text-center tracking-tight leading-snug">
            รายงานอาหารกลางวัน ประจำเดือน {thaiMonthName} {buddhistYear}
          </h1>
          {settings.schoolName && (
            <p className="text-xs sm:text-sm font-semibold text-slate-700 text-center mt-1">
              {settings.schoolName}
            </p>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Table: 3 Main Columns (วันที่, รายการอาหาร, หมายเหตุ)          */}
        {/* ------------------------------------------------------------- */}
        {monthEntries.length === 0 ? (
          <div>
            {/* Minimal line for printer */}
            <div className="screen-only text-center py-12 px-6 border-2 border-dashed border-amber-200 bg-amber-50/60 rounded-2xl text-slate-700 space-y-3 my-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                ยังไม่มีรายการอาหารในเดือน {thaiMonthName} {buddhistYear}
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                หากคุณเพิ่งสุ่มจัดอาหารกลางวัน หรือต้องการดูรายงานของเดือนอื่น สามารถคลิกเลือกเดือนที่มีข้อมูลด้านล่างนี้ได้ทันที:
              </p>

              {availableMonths.length > 0 && (
                <div className="pt-2 flex flex-wrap justify-center gap-2">
                  {availableMonths.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        setSelectedYear(m.year);
                        setSelectedMonth(m.month);
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>เปิดรายงานเดือน {m.label}</span>
                      <span className="bg-emerald-700 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                        {m.count} วัน
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-amber-200/60 mt-3 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  id="btn-randomize-empty-state"
                  onClick={executeRandomizeCurrentMonth}
                  disabled={isRandomizing}
                  className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>{isRandomizing ? 'กำลังสุ่มจัดอาหาร...' : `สุ่มจัดอาหารกลางวันเดือน ${thaiMonthName} ${buddhistYear} ทันที`}</span>
                </button>

                {onNavigateToPlanner && (
                  <button
                    type="button"
                    onClick={() => onNavigateToPlanner(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`)}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>ไปหน้าสุ่มจัดอาหารกลางวัน</span>
                  </button>
                )}
              </div>
            </div>

            {/* Print Fallback */}
            <div className="hidden print:block text-center py-16 border border-dashed border-slate-300 rounded-xl text-slate-600 text-sm">
              ไม่มีข้อมูลเมนูอาหารในเดือน {thaiMonthName} {buddhistYear}
            </div>
          </div>
        ) : (
          <table className="a4-print-table w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold border border-slate-900 text-xs sm:text-sm">
                {/* 1. วันที่ */}
                <th className="col-print-date p-2 sm:p-2.5 border border-slate-900 text-center">
                  วันที่
                </th>

                {/* 2. รายการอาหาร: หัวข้ออยู่ตรงกลางตาม Requirement 1.4 */}
                <th className="col-print-menu p-2.5 sm:p-3 border border-slate-900 text-center">
                  รายการอาหาร
                </th>

                {/* 3. หมายเหตุ */}
                <th className="col-print-note p-2 sm:p-2.5 border border-slate-900 text-center">
                  หมายเหตุ
                </th>

                {/* Screen-Only Edit Action Column (1.8) */}
                <th className="no-print col-print-action p-2 border border-slate-300 text-center w-16 bg-slate-50 text-slate-600">
                  แก้ไข
                </th>
              </tr>
            </thead>
            <tbody>
              {monthEntries.map((entry) => {
                const shortDate = formatShortDate(entry.date);
                const parts = entry.date.split('-').map(Number);
                const entryY = parts[0] > 2400 ? parts[0] - 543 : parts[0];
                const d = new Date(entryY, parts[1] - 1, parts[2], 12, 0, 0);
                const isMonday = d.getDay() === 1;
                const mealString = formatMealList(entry);

                return (
                  <tr 
                    key={entry.date} 
                    className={`border border-slate-800 text-xs sm:text-sm leading-normal ${
                      isMonday ? 'print-monday-row bg-amber-100/70 border-t-2 border-amber-400' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {/* 1. วันที่: รูปแบบสั้น เช่น จ. 1/9/69 */}
                    <td className={`col-print-date p-2 sm:p-2.5 border border-slate-700 font-bold text-center whitespace-nowrap ${
                      isMonday ? 'bg-amber-200/60 text-amber-950' : 'bg-slate-50/40 text-slate-900'
                    }`}>
                      {shortDate}
                    </td>

                    {/* 2. รายการอาหาร เช่น ข้าวสวย + ผัดเผ็ด + แกงจืด + ส้ม */}
                    <td className="col-print-menu p-2.5 sm:p-3 border border-slate-700 text-slate-900 font-medium">
                      {mealString}
                    </td>

                    {/* 3. หมายเหตุ */}
                    <td className="col-print-note p-2 border border-slate-700 text-center text-xs text-slate-600">
                      {entry.note || ''}
                    </td>

                    {/* Screen-Only Edit & Delete Actions (1.8) */}
                    <td className="no-print col-print-action p-2 border border-slate-300 text-center whitespace-nowrap bg-white">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(entry)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="แก้ไขรายการอาหารวันนี้"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(entry.date)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="ลบเมนูวันนี้"
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
        )}

        {/* 1.3 เอาออกตรงลงชื่อทั้งหมด ทั้ง 3 การลงชื่อ (Completely removed signature section) */}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Edit Entry Modal (Requirement 1.1 Connected to MenuBank)     */}
      {/* ------------------------------------------------------------- */}
      {editingEntry && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-orange-600" />
                  แก้ไขรายการอาหาร
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  วันที่: {formatShortDate(editingEntry.date)} ({editingEntry.date})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Requirement 2: Mutual exclusion for Edit Modal */}
            {(() => {
              const isSetMealFilled = Boolean(editRice.trim() || editNonSpicy.trim() || editSpicy.trim());
              const isSingleDishFilled = Boolean(editSingleDish.trim());

              return (
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  {/* 1. ข้าว (เชื่อมต่อกับคลังเมนู) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                        1. ข้าว
                        {isSingleDishFilled && (
                          <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 font-semibold ml-1">
                            (ปิดไม่ให้กรอก เนื่องจากระบุอาหารจานเดียวแล้ว)
                          </span>
                        )}
                      </label>
                      {riceSuggestions.length > 0 && !isSingleDishFilled && (
                        <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                          <Sparkles className="w-3 h-3" />
                          ในคลัง: {riceSuggestions.length} รายการ
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder={isSingleDishFilled ? "ปิดไม่ให้กรอก (เนื่องจากระบุอาหารจานเดียวแล้ว)" : "พิมพ์ค้นหาหรือเลือกจากคลังเมนู..."}
                      value={editRice}
                      disabled={isSingleDishFilled}
                      onFocus={() => {
                        if (!isSingleDishFilled) setActiveField('rice');
                      }}
                      onChange={(e) => {
                        setEditRice(e.target.value);
                        if (e.target.value.trim()) setEditSingleDish('');
                      }}
                      className={`w-full px-3 py-2 text-xs rounded-xl transition-all ${
                        isSingleDishFilled
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none'
                          : 'bg-slate-50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-orange-500'
                      }`}
                    />
                    {/* Suggestions pill list */}
                    {riceSuggestions.length > 0 && !isSingleDishFilled && (
                      <div className="flex flex-wrap gap-1 mt-1.5 p-1.5 bg-amber-50/50 rounded-xl border border-amber-200/60 max-h-24 overflow-y-auto">
                        {riceSuggestions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setEditRice(item.menuName);
                              setEditSingleDish('');
                            }}
                            className={`px-2 py-0.5 text-[11px] rounded-lg border transition-colors cursor-pointer ${
                              editRice === item.menuName 
                                ? 'bg-amber-600 text-white border-amber-600 font-bold' 
                                : 'bg-white hover:bg-amber-100 hover:border-amber-300 text-slate-700 border-slate-200'
                            }`}
                          >
                            {item.menuName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. อาหารจานเดียว (เชื่อมต่อกับคลังเมนู) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
                        2. อาหารจานเดียว
                        {isSetMealFilled && (
                          <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 font-semibold ml-1">
                            (ปิดไม่ให้กรอก เนื่องจากระบุข้าวหรือกับข้าวแล้ว)
                          </span>
                        )}
                      </label>
                      {singleDishSuggestions.length > 0 && !isSetMealFilled && (
                        <span className="text-[10px] text-orange-600 flex items-center gap-0.5">
                          <Sparkles className="w-3 h-3" />
                          ในคลัง: {singleDishSuggestions.length} รายการ
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder={isSetMealFilled ? "ปิดไม่ให้กรอก (เนื่องจากระบุข้าวหรือกับข้าวแล้ว)" : "เช่น ข้าวมันไก่ตอน, ก๋วยเตี๋ยวหมูสับ..."}
                      value={editSingleDish}
                      disabled={isSetMealFilled}
                      onFocus={() => {
                        if (!isSetMealFilled) setActiveField('singleDish');
                      }}
                      onChange={(e) => {
                        setEditSingleDish(e.target.value);
                        if (e.target.value.trim()) {
                          setEditRice('');
                          setEditNonSpicy('');
                          setEditSpicy('');
                        }
                      }}
                      className={`w-full px-3 py-2 text-xs rounded-xl transition-all ${
                        isSetMealFilled
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none'
                          : 'bg-slate-50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-orange-500'
                      }`}
                    />
                    {singleDishSuggestions.length > 0 && !isSetMealFilled && (
                      <div className="flex flex-wrap gap-1 mt-1.5 p-1.5 bg-orange-50/50 rounded-xl border border-orange-200/60 max-h-24 overflow-y-auto">
                        {singleDishSuggestions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setEditSingleDish(item.menuName);
                              setEditRice('');
                              setEditNonSpicy('');
                              setEditSpicy('');
                            }}
                            className={`px-2 py-0.5 text-[11px] rounded-lg border transition-colors cursor-pointer ${
                              editSingleDish === item.menuName 
                                ? 'bg-orange-600 text-white border-orange-600 font-bold' 
                                : 'bg-white hover:bg-orange-100 hover:border-orange-300 text-slate-700 border-slate-200'
                            }`}
                          >
                            {item.menuName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3. อาหารไม่เผ็ด (เชื่อมต่อกับคลังเมนู) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                        3. อาหารไม่เผ็ด
                        {isSingleDishFilled && (
                          <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 font-semibold ml-1">
                            (ปิดไม่ให้กรอก เนื่องจากระบุอาหารจานเดียวแล้ว)
                          </span>
                        )}
                      </label>
                      {nonSpicySuggestions.length > 0 && !isSingleDishFilled && (
                        <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                          <Sparkles className="w-3 h-3" />
                          ในคลัง: {nonSpicySuggestions.length} รายการ
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder={isSingleDishFilled ? "ปิดไม่ให้กรอก (เนื่องจากระบุอาหารจานเดียวแล้ว)" : "เช่น ต้มจืดเต้าหู้หมูสับ, ไข่พะโล้..."}
                      value={editNonSpicy}
                      onFocus={() => {
                        if (!isSingleDishFilled) setActiveField('nonSpicy');
                      }}
                      disabled={isSingleDishFilled}
                      onChange={(e) => {
                        setEditNonSpicy(e.target.value);
                        if (e.target.value.trim()) setEditSingleDish('');
                      }}
                      className={`w-full px-3 py-2 text-xs rounded-xl transition-all ${
                        isSingleDishFilled
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none'
                          : 'bg-slate-50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-orange-500'
                      }`}
                    />
                    {nonSpicySuggestions.length > 0 && !isSingleDishFilled && (
                      <div className="flex flex-wrap gap-1 mt-1.5 p-1.5 bg-emerald-50/50 rounded-xl border border-emerald-200/60 max-h-24 overflow-y-auto">
                        {nonSpicySuggestions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setEditNonSpicy(item.menuName);
                              setEditSingleDish('');
                            }}
                            className={`px-2 py-0.5 text-[11px] rounded-lg border transition-colors cursor-pointer ${
                              editNonSpicy === item.menuName 
                                ? 'bg-emerald-600 text-white border-emerald-600 font-bold' 
                                : 'bg-white hover:bg-emerald-100 hover:border-emerald-300 text-slate-700 border-slate-200'
                            }`}
                          >
                            {item.menuName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 4. อาหารเผ็ด (เชื่อมต่อกับคลังเมนู) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                        4. อาหารเผ็ด
                        {isSingleDishFilled && (
                          <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 font-semibold ml-1">
                            (ปิดไม่ให้กรอก เนื่องจากระบุอาหารจานเดียวแล้ว)
                          </span>
                        )}
                      </label>
                      {spicySuggestions.length > 0 && !isSingleDishFilled && (
                        <span className="text-[10px] text-rose-600 flex items-center gap-0.5">
                          <Sparkles className="w-3 h-3" />
                          ในคลัง: {spicySuggestions.length} รายการ
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder={isSingleDishFilled ? "ปิดไม่ให้กรอก (เนื่องจากระบุอาหารจานเดียวแล้ว)" : "เช่น ผัดกะเพราหมูสับ, แกงส้มชะอมกุ้ง..."}
                      value={editSpicy}
                      onFocus={() => {
                        if (!isSingleDishFilled) setActiveField('spicy');
                      }}
                      disabled={isSingleDishFilled}
                      onChange={(e) => {
                        setEditSpicy(e.target.value);
                        if (e.target.value.trim()) setEditSingleDish('');
                      }}
                      className={`w-full px-3 py-2 text-xs rounded-xl transition-all ${
                        isSingleDishFilled
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none'
                          : 'bg-slate-50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-orange-500'
                      }`}
                    />
                    {spicySuggestions.length > 0 && !isSingleDishFilled && (
                      <div className="flex flex-wrap gap-1 mt-1.5 p-1.5 bg-rose-50/50 rounded-xl border border-rose-200/60 max-h-24 overflow-y-auto">
                        {spicySuggestions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setEditSpicy(item.menuName);
                              setEditSingleDish('');
                            }}
                            className={`px-2 py-0.5 text-[11px] rounded-lg border transition-colors cursor-pointer ${
                              editSpicy === item.menuName 
                                ? 'bg-rose-600 text-white border-rose-600 font-bold' 
                                : 'bg-white hover:bg-rose-100 hover:border-rose-300 text-slate-700 border-slate-200'
                            }`}
                          >
                            {item.menuName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

              {/* 5. ผลไม้-ของหวาน (เชื่อมต่อกับคลังเมนู) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    5. ผลไม้-ของหวาน
                  </label>
                  {dessertSuggestions.length > 0 && (
                    <span className="text-[10px] text-teal-600 flex items-center gap-0.5">
                      <Sparkles className="w-3 h-3" />
                      ในคลัง: {dessertSuggestions.length} รายการ
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="เช่น ส้มเขียวหวาน, บัวลอยเผือก..."
                  value={editDessert}
                  onFocus={() => setActiveField('dessert')}
                  onChange={(e) => setEditDessert(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
                {dessertSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5 p-1.5 bg-teal-50/50 rounded-xl border border-teal-200/60 max-h-24 overflow-y-auto">
                    {dessertSuggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setEditDessert(item.menuName)}
                        className={`px-2 py-0.5 text-[11px] rounded-lg border transition-colors cursor-pointer ${
                          editDessert === item.menuName 
                            ? 'bg-teal-600 text-white border-teal-600 font-bold' 
                            : 'bg-white hover:bg-teal-100 hover:border-teal-300 text-slate-700 border-slate-200'
                        }`}
                      >
                        {item.menuName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 6. หมายเหตุ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  6. หมายเหตุ
                </label>
                <input
                  type="text"
                  placeholder="หมายเหตุเพิ่มเติม..."
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteRow(editingEntry.date)}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                >
                  ลบเมนูวันนี้
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingEntry(null)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>บันทึกการแก้ไข</span>
                  </button>
                </div>
              </div>
            </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Add New Date Modal                                            */}
      {/* ------------------------------------------------------------- */}
      {isAddModalOpen && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                เพิ่มเมนูวันใหม่
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกวันที่ในเดือน {thaiMonthName} {buddhistYear}
                </label>
                <input
                  type="date"
                  value={newDateStr}
                  onChange={(e) => setNewDateStr(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleAddNewDay}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  ต่อไป (ใส่รายการอาหาร)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Confirm Delete Entry Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingDateStr)}
        title="ยืนยันการลบรายการอาหาร"
        message={deletingDateStr ? `คุณต้องการลบข้อมูลเมนูอาหารประจำวันที่ ${formatShortDate(deletingDateStr)} ใช่หรือไม่?` : ''}
        confirmText="ยืนยันการลบ"
        cancelText="ยกเลิก"
        type="danger"
        onConfirm={executeDeleteRow}
        onCancel={() => setDeletingDateStr(null)}
      />

      {/* Confirm Delete Whole Month Modal (Requirement Fix 1) */}
      <ConfirmModal
        isOpen={isDeleteMonthModalOpen}
        title="ยืนยันการลบรายการอาหารทั้งเดือน"
        message={`คุณต้องการลบข้อมูลเมนูอาหารทั้งหมดในเดือน ${thaiMonthName} ${buddhistYear} จำนวน ${monthEntries.length} วัน ใช่หรือไม่?\n\nรายการอาหารทั้งหมดในเดือนนี้จะถูกลบออกจากระบบและไม่สามารถกู้คืนได้`}
        confirmText={`ยืนยันการลบทั้งเดือน (${monthEntries.length} วัน)`}
        cancelText="ยกเลิก"
        type="danger"
        onConfirm={executeDeleteWholeMonth}
        onCancel={() => setIsDeleteMonthModalOpen(false)}
      />

      {/* Confirm Randomize Month Modal (Requirement Fix 2) */}
      <ConfirmModal
        isOpen={isRandomizeConfirmOpen}
        title="ยืนยันการสุ่มจัดอาหารกลางวันใหม่"
        message={`พบรายการอาหารในเดือน ${thaiMonthName} ${buddhistYear} บันทึกอยู่แล้ว ${monthEntries.length} วัน\n\nต้องการสุ่มจัดเมนูใหม่แทนที่ทั้งหมด หรือไม่?`}
        confirmText="ยืนยันการจัดใหม่"
        cancelText="ยกเลิก"
        type="info"
        onConfirm={executeRandomizeCurrentMonth}
        onCancel={() => setIsRandomizeConfirmOpen(false)}
      />
    </div>
  );
};
