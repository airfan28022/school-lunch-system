import React, { useState, useEffect, useMemo } from 'react';
import { TaxRecord, SchoolSettings } from '../types';
import { saveServerData } from '../services/api';
import { 
  Calculator, 
  Calendar as CalendarIcon, 
  Users, 
  Coins, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Trash2, 
  Printer, 
  X, 
  Receipt,
  Search,
  History,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface TaxManagementProps {
  settings: SchoolSettings;
  showToast: (title: string, description: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  records?: TaxRecord[];
  onSaveRecords?: (records: TaxRecord[]) => void;
}

// Preset rates according to requirement: 22, 24, 27, 36 (Default is 27)
const PRESET_RATES = [22, 24, 27, 36];
const STORAGE_KEY_TAX_RECORDS = 'thai_school_lunch_tax_records_v1';
const STORAGE_KEY_STUDENT_HISTORY = 'thai_school_lunch_student_history_v1';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const TaxManagement: React.FC<TaxManagementProps> = ({ 
  settings, 
  showToast,
  records: externalRecords,
  onSaveRecords 
}) => {
  // Current date for default month
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // Helper date string YYYY-MM-DD
  const toDateStr = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Default start date = 1st of current month, end date = last day of current month
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const defaultStartDate = toDateStr(currentYear, currentMonth, 1);
  const defaultEndDate = toDateStr(currentYear, currentMonth, lastDayOfMonth);

  // Modal State for "+" Pop-up
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // --- Form States inside Modal ---
  // 1. Rate per person: Default 27 always
  const [ratePerPerson, setRatePerPerson] = useState<number>(27);
  const [customRateInput, setCustomRateInput] = useState<string>('');
  const [isCustomRateActive, setIsCustomRateActive] = useState<boolean>(false);

  // 2. Student Count
  const [studentCountInput, setStudentCountInput] = useState<string>('150');

  // Student count history
  const [studentHistory, setStudentHistory] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STUDENT_HISTORY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load student count history', e);
    }
    return [120, 150, 185, 210];
  });

  // 3. Date Selection via Single Calendar (Interactive 2-click range)
  const [calendarViewYear, setCalendarViewYear] = useState<number>(currentYear);
  const [calendarViewMonth, setCalendarViewMonth] = useState<number>(currentMonth);
  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(defaultEndDate);
  // Track picking state: null = not in progress, string = first click selected start date
  const [rangeSelectingStart, setRangeSelectingStart] = useState<string | null>(null);

  // 4. Note
  const [noteInput, setNoteInput] = useState<string>(() => {
    return `ประจำเดือน${THAI_MONTHS[currentMonth]} ${currentYear + 543}`;
  });

  // --- Records Table State ---
  const [records, setRecords] = useState<TaxRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TAX_RECORDS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load tax records', e);
    }
    // Default initial sample records for current month
    const sampleStartDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const sampleEndDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-15`;
    const sampleTotal = 27 * 150 * 11;
    const sampleTax = Math.round(sampleTotal * 0.01 * 100) / 100;

    return [
      {
        id: 'tax_sample_1',
        startDate: sampleStartDate,
        endDate: sampleEndDate,
        daysCount: 11,
        studentCount: 150,
        ratePerPerson: 27,
        totalAmount: sampleTotal,
        taxRatePercent: 1,
        taxAmount: sampleTax,
        netAmount: sampleTotal - sampleTax,
        isPaid: true,
        paidAt: new Date().toISOString(),
        note: 'งวดที่ 1 (วันที่ 1 - 15)',
        createdAt: new Date().toISOString()
      }
    ];
  });

  // UI Table Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);

  // Helper to commit updates triggered by user actions only
  const commitRecordsUpdate = (newRecords: TaxRecord[]) => {
    setRecords(newRecords);
    try {
      localStorage.setItem(STORAGE_KEY_TAX_RECORDS, JSON.stringify(newRecords));
    } catch (e) {
      console.error('Failed to save tax records', e);
    }
    if (onSaveRecords) {
      onSaveRecords(newRecords);
    } else {
      saveServerData({ taxRecords: newRecords });
    }
  };

  // Sync records from external central store (Google Sheets / Server) ONLY when content actually differs
  useEffect(() => {
    if (externalRecords && Array.isArray(externalRecords) && externalRecords.length > 0) {
      setRecords((prev) => {
        if (prev === externalRecords) return prev;
        if (prev.length === externalRecords.length && JSON.stringify(prev) === JSON.stringify(externalRecords)) {
          return prev;
        }
        return externalRecords;
      });
    }
  }, [externalRecords]);

  // Sync records to localStorage cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TAX_RECORDS, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save tax records to cache', e);
    }
  }, [records]);

  // Sync student history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STUDENT_HISTORY, JSON.stringify(studentHistory));
    } catch (e) {
      console.error('Failed to save student history', e);
    }
  }, [studentHistory]);

  // Requirement 1: Calculate ONLY Monday-Friday (จันทร์-ศุกร์) in background
  const calculatedWeekdays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return 0;
    }

    let weekdays = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      // Monday is 1, Friday is 5. Exclude Sunday (0) and Saturday (6)
      if (day !== 0 && day !== 6) {
        weekdays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return weekdays;
  }, [startDate, endDate]);

  const effectiveDays = calculatedWeekdays;

  // Effective rate per person
  const effectiveRate = useMemo(() => {
    if (isCustomRateActive) {
      const parsed = parseFloat(customRateInput);
      return isNaN(parsed) || parsed <= 0 ? 27 : parsed;
    }
    return ratePerPerson;
  }, [isCustomRateActive, customRateInput, ratePerPerson]);

  // Effective student count
  const effectiveStudentCount = useMemo(() => {
    const parsed = parseInt(studentCountInput, 10);
    return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
  }, [studentCountInput]);

  // Formula: ratePerPerson * studentCount * weekdays (Back-end)
  const totalAmount = useMemo(() => {
    return Math.round(effectiveRate * effectiveStudentCount * effectiveDays * 100) / 100;
  }, [effectiveRate, effectiveStudentCount, effectiveDays]);

  // 1% Withholding Tax: totalAmount * 0.01 (Foreground display)
  const taxAmount = useMemo(() => {
    return Math.round(totalAmount * 0.01 * 100) / 100;
  }, [totalAmount]);

  // Helper formatting numbers
  const formatBaht = (amount: number) => {
    return amount.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Helper formatting Thai date
  const formatThaiDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      return `${day} ${THAI_MONTHS_SHORT[month - 1]} ${year + 543}`;
    } catch {
      return dateString;
    }
  };

  // Handle Preset Rate Selection
  const handleSelectPresetRate = (rate: number) => {
    setRatePerPerson(rate);
    setIsCustomRateActive(false);
    setCustomRateInput('');
  };

  // Handle Custom Rate Input
  const handleCustomRateChange = (val: string) => {
    setCustomRateInput(val);
    if (val.trim() !== '') {
      setIsCustomRateActive(true);
    } else {
      setIsCustomRateActive(false);
      setRatePerPerson(27);
    }
  };

  // Handle Select Student Count from History
  const handleSelectStudentHistory = (count: number) => {
    setStudentCountInput(String(count));
  };

  // Handle Delete a number from history
  const handleRemoveStudentHistory = (count: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setStudentHistory(prev => prev.filter(c => c !== count));
  };

  // Requirement 3: Calendar 2-click date range logic
  // "ปรับตรงปฏิทินให้เหลือแค่ 1 ปฏิทินโดยให้กด2ครั้ง กด1ครั้งอีกวันหนึ่ง และกด1ครั้งอีกวันหนึ่ง เช่น กดที่ 5 และกดที่ 9 รวม 5 วัน ถ้ากดที่เดิม 2 ครั้ง แสดงว่าเป็นวันเดียว"
  const handleCalendarDayClick = (dateStr: string) => {
    if (!rangeSelectingStart) {
      // First click: sets temporary start date
      setRangeSelectingStart(dateStr);
      setStartDate(dateStr);
      setEndDate(dateStr);
    } else {
      // Second click:
      // If clicking same day: startDate = dateStr, endDate = dateStr (1 day)
      // If clicking earlier date or later date: order them chronologically
      if (dateStr === rangeSelectingStart) {
        setStartDate(dateStr);
        setEndDate(dateStr);
      } else if (dateStr < rangeSelectingStart) {
        setStartDate(dateStr);
        setEndDate(rangeSelectingStart);
      } else {
        setStartDate(rangeSelectingStart);
        setEndDate(dateStr);
      }
      setRangeSelectingStart(null);
    }
  };

  // Calendar month navigation
  const handlePrevMonth = () => {
    if (calendarViewMonth === 0) {
      setCalendarViewMonth(11);
      setCalendarViewYear(calendarViewYear - 1);
    } else {
      setCalendarViewMonth(calendarViewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarViewMonth === 11) {
      setCalendarViewMonth(0);
      setCalendarViewYear(calendarViewYear + 1);
    } else {
      setCalendarViewMonth(calendarViewMonth + 1);
    }
  };

  // Handle Add Record from Modal Form
  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();

    if (effectiveStudentCount <= 0) {
      showToast('กรุณาระบุจำนวนนักเรียน', 'จำนวนนักเรียนต้องมากกว่า 0 คน', 'warning');
      return;
    }

    if (effectiveDays <= 0) {
      showToast('ไม่พบวันทำการจันทร์-ศุกร์', 'ช่วงวันที่เลือกไม่มีวันจันทร์-ศุกร์สำหรับการคำนวณอาหารกลางวัน', 'warning');
      return;
    }

    // Save student count to history (keep top 8 recent)
    if (effectiveStudentCount > 0) {
      setStudentHistory(prev => {
        const filtered = prev.filter(c => c !== effectiveStudentCount);
        return [effectiveStudentCount, ...filtered].slice(0, 8);
      });
    }

    const newRecord: TaxRecord = {
      id: `tax_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      startDate,
      endDate,
      daysCount: effectiveDays,
      studentCount: effectiveStudentCount,
      ratePerPerson: effectiveRate,
      totalAmount,
      taxRatePercent: 1,
      taxAmount,
      netAmount: totalAmount - taxAmount,
      isPaid: false,
      note: noteInput.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    const updated = [newRecord, ...records];
    commitRecordsUpdate(updated);
    setIsAddModalOpen(false);
    showToast(
      'เพิ่มรายการคำนวณภาษีสำเร็จ',
      `บันทึกภาษี 1% จำนวน ${formatBaht(taxAmount)} บาท ลงในตารางเรียบร้อยแล้ว`,
      'success'
    );
  };

  // Handle Toggle Paid Status on Record
  const handleTogglePaidStatus = (id: string) => {
    const updated = records.map(item => {
      if (item.id === id) {
        const nextState = !item.isPaid;
        showToast(
          nextState ? 'อัปเดตเป็น: จ่ายภาษีแล้ว' : 'อัปเดตเป็น: ยังไม่จ่ายภาษี',
          `งวดวันที่ ${formatThaiDate(item.startDate)} - ${formatThaiDate(item.endDate)}`,
          nextState ? 'success' : 'info'
        );
        return {
          ...item,
          isPaid: nextState,
          paidAt: nextState ? new Date().toISOString() : undefined
        };
      }
      return item;
    });
    commitRecordsUpdate(updated);
  };

  // Handle Delete Record
  const handleDeleteRecord = (id: string) => {
    const updated = records.filter(item => item.id !== id);
    commitRecordsUpdate(updated);
    setDeleteRecordId(null);
    showToast('ลบรายการสำเร็จ', 'ข้อมูลรายการภาษีถูกลบเรียบร้อยแล้ว', 'info');
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Filtered Records for Table
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Filter status
      if (statusFilter === 'paid' && !record.isPaid) return false;
      if (statusFilter === 'unpaid' && record.isPaid) return false;

      // Filter search
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchesDate = record.startDate.includes(term) || record.endDate.includes(term);
        const matchesNote = record.note ? record.note.toLowerCase().includes(term) : false;
        const matchesRate = String(record.ratePerPerson).includes(term);
        const matchesStudent = String(record.studentCount).includes(term);
        return matchesDate || matchesNote || matchesRate || matchesStudent;
      }

      return true;
    });
  }, [records, statusFilter, searchTerm]);

  // Aggregate sums for table footer
  const tableTotals = useMemo(() => {
    return filteredRecords.reduce(
      (acc, curr) => {
        acc.totalDays += curr.daysCount;
        acc.totalAmount += curr.totalAmount;
        acc.totalTax += curr.taxAmount;
        if (curr.isPaid) {
          acc.paidTax += curr.taxAmount;
          acc.paidCount += 1;
        } else {
          acc.unpaidTax += curr.taxAmount;
          acc.unpaidCount += 1;
        }
        return acc;
      },
      {
        totalDays: 0,
        totalAmount: 0,
        totalTax: 0,
        paidTax: 0,
        unpaidTax: 0,
        paidCount: 0,
        unpaidCount: 0
      }
    );
  }, [filteredRecords]);

  // Calendar Grid Generation for calendarViewMonth & calendarViewYear
  const calendarDaysMatrix = useMemo(() => {
    const firstDayIndex = new Date(calendarViewYear, calendarViewMonth, 1).getDay(); // 0 is Sun, 1 is Mon...
    const daysInMonth = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
    
    const days: { day: number; dateStr: string; isWeekend: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = toDateStr(calendarViewYear, calendarViewMonth, d);
      const dayOfWeek = new Date(calendarViewYear, calendarViewMonth, d).getDay();
      days.push({
        day: d,
        dateStr: dStr,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });
    }
    return { firstDayIndex, days };
  }, [calendarViewYear, calendarViewMonth]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Action Buttons */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs border border-amber-300">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                จัดการภาษี
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                หัก ณ ที่จ่าย 1%
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: "+" Pop-up Button & Print */}
        <div className="flex items-center gap-2.5 no-print w-full sm:w-auto">
          {/* Main "+" Pop-up Trigger Button */}
          <button
            type="button"
            id="btn-open-tax-add-modal"
            onClick={() => {
              setRangeSelectingStart(null);
              setIsAddModalOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black text-sm shadow-sm hover:shadow transition-all cursor-pointer border border-amber-400 active:scale-[0.98]"
            title="กดเพื่อเปิดหน้าต่างคำนวณและเพิ่มรายการภาษีงวดใหม่"
          >
            <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
            <span>เพิ่มรายการคำนวณภาษี</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-200 shrink-0"
            title="พิมพ์ตารางรายงานภาษี"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">พิมพ์รายงานภาษี</span>
          </button>
        </div>
      </div>

      {/* 2. Tax Records Table Only (displays the table of recorded items) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3.5 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-2.5">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              ตารางประวัติการจ่ายภาษี
            </h3>
            <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
              {filteredRecords.length} รายการ
            </span>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 no-print w-full md:w-auto">
            {/* Status Filter */}
            <div className="grid grid-cols-3 sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer text-center ${
                  statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('unpaid')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer text-center truncate ${
                  statusFilter === 'unpaid' ? 'bg-amber-500 text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ยังไม่จ่าย ({records.filter(r => !r.isPaid).length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('paid')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer text-center truncate ${
                  statusFilter === 'paid' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                จ่ายแล้ว ({records.filter(r => r.isPaid).length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาวันที่, หมายเหตุ..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-amber-500 outline-none font-medium"
              />
            </div>
          </div>
        </div>

        {/* Desktop Table View (md and above) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-[11px]">
                <th className="py-3 px-3.5">ลำดับ</th>
                <th className="py-3 px-3.5">ช่วงวันที่ (เริ่มต้น - สิ้นสุด)</th>
                <th className="py-3 px-3.5 text-center">จำนวนวัน</th>
                <th className="py-3 px-3.5 text-center">นักเรียน</th>
                <th className="py-3 px-3.5 text-right">ค่าอาหาร/คน</th>
                <th className="py-3 px-3.5 text-right">ยอดเงินรวม</th>
                <th className="py-3 px-3.5 text-right bg-amber-50/60 text-amber-950 font-black">
                  ภาษี 1% ที่ต้องจ่าย
                </th>
                <th className="py-3 px-3.5 text-center">
                  สถานะ (คลิกเพื่อสลับ)
                </th>
                <th className="py-3 px-3.5 text-center no-print">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm text-slate-600">ไม่พบรายการภาษี</p>
                    <p className="text-xs mt-1 text-slate-400">
                      กดปุ่ม <strong>"+ เพิ่มรายการคำนวณภาษี"</strong> ด้านบนเพื่อบันทึกรายการภาษีงวดใหม่
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setRangeSelectingStart(null);
                        setIsAddModalOpen(true);
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>เปิดแบบฟอร์มคำนวณภาษี</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => {
                  return (
                    <tr 
                      key={record.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        record.isPaid ? 'bg-white' : 'bg-amber-50/25'
                      }`}
                    >
                      {/* Index */}
                      <td className="py-3.5 px-3.5 font-bold text-slate-400">
                        {index + 1}
                      </td>

                      {/* Date Range & Note */}
                      <td className="py-3.5 px-3.5">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{formatThaiDate(record.startDate)}</span>
                          <span className="text-slate-400 font-normal">ถึง</span>
                          <span>{formatThaiDate(record.endDate)}</span>
                        </div>
                        {record.note && (
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {record.note}
                          </div>
                        )}
                      </td>

                      {/* Days Count */}
                      <td className="py-3.5 px-3.5 text-center font-bold text-slate-700">
                        {record.daysCount} วัน
                      </td>

                      {/* Student Count */}
                      <td className="py-3.5 px-3.5 text-center font-extrabold text-slate-900">
                        {record.studentCount.toLocaleString()} คน
                      </td>

                      {/* Rate Per Person */}
                      <td className="py-3.5 px-3.5 text-right font-medium text-slate-600">
                        {record.ratePerPerson} บาท
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-3.5 text-right font-mono font-bold text-slate-900">
                        {formatBaht(record.totalAmount)}
                      </td>

                      {/* 1% Tax to pay */}
                      <td className="py-3.5 px-3.5 text-right font-mono font-black text-amber-900 bg-amber-50/40 text-sm">
                        {formatBaht(record.taxAmount)}
                      </td>

                      {/* Interactive Paid Status Button */}
                      <td className="py-3.5 px-3.5 text-center">
                        <button
                          type="button"
                          id={`btn-tax-status-${record.id}`}
                          onClick={() => handleTogglePaidStatus(record.id)}
                          title={record.isPaid ? 'คลิกเพื่อเปลี่ยนเป็น: ยังไม่จ่าย' : 'คลิกเพื่อเปลี่ยนเป็น: จ่ายภาษีแล้ว'}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-2xs border ${
                            record.isPaid
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20'
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
                          }`}
                        >
                          {record.isPaid ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              <span>จ่ายภาษีแล้ว</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                              <span>ยังไม่จ่าย</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Delete Action */}
                      <td className="py-3.5 px-3.5 text-center no-print">
                        <button
                          type="button"
                          onClick={() => setDeleteRecordId(record.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer Summary (Strictly no ยอดสุทธิ) */}
            {filteredRecords.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/80 border-t-2 border-slate-300 font-extrabold text-slate-900">
                  <td colSpan={2} className="py-3.5 px-3.5 text-right font-black">
                    รวมทั้งสิ้น ({filteredRecords.length} รายการ):
                  </td>
                  <td className="py-3.5 px-3.5 text-center font-bold">
                    {tableTotals.totalDays} วัน
                  </td>
                  <td colSpan={2}></td>
                  <td className="py-3.5 px-3.5 text-right font-mono font-bold">
                    {formatBaht(tableTotals.totalAmount)}
                  </td>
                  <td className="py-3.5 px-3.5 text-right font-mono font-black text-amber-950 bg-amber-100/60 text-sm">
                    {formatBaht(tableTotals.totalTax)}
                  </td>
                  <td colSpan={2} className="py-3.5 px-3.5 text-center text-[11px] text-slate-600">
                    <span className="text-emerald-700 font-bold">จ่ายแล้ว: {formatBaht(tableTotals.paidTax)}</span>
                    <span className="mx-1">/</span>
                    <span className="text-amber-700 font-bold">ยังไม่จ่าย: {formatBaht(tableTotals.unpaidTax)}</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Mobile View: Zero-scroll Responsive Cards (md:hidden) */}
        <div className="block md:hidden p-2.5 space-y-2.5">
          {filteredRecords.length === 0 ? (
            <div className="py-8 px-3 text-center text-slate-400">
              <Receipt className="w-7 h-7 mx-auto mb-1.5 text-slate-300" />
              <p className="font-bold text-xs text-slate-700">ไม่พบรายการภาษี</p>
              <p className="text-[11px] mt-1 text-slate-400">
                กดปุ่ม <strong>"+ เพิ่มรายการคำนวณภาษี"</strong> ด้านบนเพื่อบันทึกรายการภาษีงวดใหม่
              </p>
              <button
                type="button"
                onClick={() => {
                  setRangeSelectingStart(null);
                  setIsAddModalOpen(true);
                }}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เปิดแบบฟอร์มคำนวณภาษี</span>
              </button>
            </div>
          ) : (
            <>
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className={`rounded-xl border p-2.5 transition-all space-y-2 ${
                    record.isPaid
                      ? 'bg-white border-slate-200/90 shadow-2xs'
                      : 'bg-amber-50/40 border-amber-200/90 shadow-2xs'
                  }`}
                >
                  {/* Top row: Date Range + Delete (Removed installment index number badge) */}
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-slate-900 leading-snug">
                        {formatThaiDate(record.startDate)}
                        <span className="text-slate-400 font-normal mx-1">ถึง</span>
                        {formatThaiDate(record.endDate)}
                      </div>
                      {record.note && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {record.note}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeleteRecordId(record.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                      title="ลบรายการนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Middle row: 3 Compact Metric Badges (Slimmer padding) */}
                  <div className="grid grid-cols-3 gap-1 text-center bg-slate-50/90 rounded-lg p-1.5 border border-slate-200/70">
                    <div className="px-0.5 py-0.5">
                      <span className="text-[9.5px] text-slate-500 font-medium block">จำนวนวัน</span>
                      <span className="text-[11.5px] font-black text-slate-800">{record.daysCount} วัน</span>
                    </div>
                    <div className="px-0.5 py-0.5 border-x border-slate-200/80">
                      <span className="text-[9.5px] text-slate-500 font-medium block">นักเรียน</span>
                      <span className="text-[11.5px] font-black text-slate-900">{record.studentCount.toLocaleString()} คน</span>
                    </div>
                    <div className="px-0.5 py-0.5">
                      <span className="text-[9.5px] text-slate-500 font-medium block">ค่าอาหาร</span>
                      <span className="text-[11.5px] font-black text-slate-700">{record.ratePerPerson} บ./คน</span>
                    </div>
                  </div>

                  {/* Money row: Total Meal Amount & 1% Tax Highlight */}
                  <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-slate-100">
                    <div className="min-w-0">
                      <span className="text-[9.5px] text-slate-500 font-medium block">ยอดเงินรวม</span>
                      <span className="text-[11px] font-bold font-mono text-slate-700">
                        {formatBaht(record.totalAmount)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9.5px] text-amber-800 font-extrabold block">
                        ภาษี 1% ที่ต้องจ่าย
                      </span>
                      <span className="text-xs font-black font-mono text-amber-950 bg-amber-100/90 px-1.5 py-0.5 rounded-md border border-amber-300 inline-block">
                        {formatBaht(record.taxAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Bottom row: Interactive Paid Status Button (Compact) */}
                  <div>
                    <button
                      type="button"
                      id={`btn-tax-status-mobile-${record.id}`}
                      onClick={() => handleTogglePaidStatus(record.id)}
                      className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg font-black text-xs transition-all cursor-pointer shadow-2xs border ${
                        record.isPaid
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20'
                          : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300 active:scale-[0.99]'
                      }`}
                      title={record.isPaid ? 'คลิกเพื่อเปลี่ยนเป็น: ยังไม่จ่าย' : 'คลิกเพื่อเปลี่ยนเป็น: จ่ายภาษีแล้ว'}
                    >
                      {record.isPaid ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <span>จ่ายภาษีแล้ว (คลิกเพื่อสลับ)</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                          <span>ยังไม่จ่าย (คลิกเพื่อบันทึกว่าจ่ายแล้ว)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {/* Mobile Summary Card (Compact) */}
              <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-3 shadow-sm space-y-1.5 mt-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold border-b border-slate-700/80 pb-1.5">
                  <span>รวมทั้งหมด ({filteredRecords.length} รายการ)</span>
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-400 font-black text-[11px]">
                    {tableTotals.totalDays} วันทำการ
                  </span>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <div>
                    <span className="text-[9.5px] text-slate-400 block">ยอดค่าอาหารรวม</span>
                    <span className="text-[11.5px] font-mono font-bold text-slate-200">
                      {formatBaht(tableTotals.totalAmount)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9.5px] text-amber-300 font-extrabold block">
                      รวมภาษี 1% ที่ต้องจ่าย
                    </span>
                    <span className="text-sm font-black font-mono text-amber-400">
                      {formatBaht(tableTotals.totalTax)}
                    </span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-700/80 flex items-center justify-between text-[10.5px]">
                  <span className="text-emerald-400 font-bold">
                    ✓ จ่ายแล้ว: {formatBaht(tableTotals.paidTax)}
                  </span>
                  <span className="text-amber-300 font-bold">
                    ⏳ ยังไม่จ่าย: {formatBaht(tableTotals.unpaidTax)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Pop-up Modal Dialog for Inputting Tax Record */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn no-print overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-scaleUp">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 px-5 sm:px-6 py-4 border-b border-amber-300 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white p-2 text-slate-950 flex items-center justify-center shadow-xs">
                  <Calculator className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-950 leading-tight">
                    คำนวณและบันทึกภาษีอาหารกลางวัน
                  </h3>
                  <p className="text-xs font-semibold text-slate-800">
                    คำนวณวันทำการจันทร์-ศุกร์อัตโนมัติ หักภาษี 1%
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddRecord} className="p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto">
              
              {/* Field 1: Meal Rate Selector (22, 24, 27, 36 + Custom, Default 27 always) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-600" />
                    อัตราค่าอาหารต่อคน (บาท/คน) <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    ค่าเริ่มต้น: 27 บาท เสมอ
                  </span>
                </label>

                {/* 4 Preset Buttons + Custom input */}
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_RATES.map((rate) => {
                    const isSelected = !isCustomRateActive && ratePerPerson === rate;
                    return (
                      <button
                        key={rate}
                        type="button"
                        id={`modal-btn-tax-rate-${rate}`}
                        onClick={() => handleSelectPresetRate(rate)}
                        className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl font-extrabold text-sm transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs transform scale-[1.03]'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {rate} <span className="text-xs font-normal">บาท</span>
                        {rate === 27 && (
                          <span className="ml-1 text-[10px] bg-black/10 px-1.5 py-0.5 rounded font-bold">
                            มาตรฐาน
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Custom rate input */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:border-amber-500 focus-within:bg-white transition-all">
                    <span className="text-xs font-semibold text-slate-500">อื่นๆ:</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={customRateInput}
                      onChange={(e) => handleCustomRateChange(e.target.value)}
                      placeholder="กรอกเอง"
                      className="w-18 text-xs font-bold bg-transparent outline-none text-slate-800"
                    />
                    <span className="text-xs text-slate-500">บาท</span>
                  </div>
                </div>

                {isCustomRateActive && customRateInput && (
                  <p className="text-[11px] text-amber-700 font-medium">
                    ✦ ใช้อัตรากำหนดเอง: <strong>{customRateInput} บาท/คน</strong>
                  </p>
                )}
              </div>

              {/* Field 2: Student Count + History Chips */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                    จำนวนนักเรียน (คน) <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    กรอกตัวเลขจำนวนนักเรียน
                  </span>
                </label>

                <div className="relative">
                  <input
                    id="modal-input-tax-student-count"
                    type="number"
                    min="1"
                    value={studentCountInput}
                    onChange={(e) => setStudentCountInput(e.target.value)}
                    placeholder="เช่น 150"
                    className="w-full pl-3.5 pr-14 py-2.5 text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    คน
                  </span>
                </div>

                {/* History Chips of previously entered student counts */}
                {studentHistory.length > 0 && (
                  <div className="pt-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-semibold mb-1">
                      <History className="w-3 h-3 text-slate-400" />
                      <span>ประวัติจำนวนนักเรียนที่เคยกรอก (คลิกเพื่อเลือกทันที):</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {studentHistory.map((count) => {
                        const isCurrent = studentCountInput === String(count);
                        return (
                          <div
                            key={count}
                            onClick={() => handleSelectStudentHistory(count)}
                            className={`group flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                              isCurrent
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border-slate-200'
                            }`}
                          >
                            <span>{count} คน</span>
                            <button
                              type="button"
                              onClick={(e) => handleRemoveStudentHistory(count, e)}
                              title="ลบตัวเลขนี้จากประวัติ"
                              className="opacity-0 group-hover:opacity-100 hover:text-rose-600 ml-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Field 3: Requirement 3 - Single Calendar (Interactive 2-click Range) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-amber-600" />
                    เลือกช่วงวันที่ <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {rangeSelectingStart ? (
                      <span className="text-amber-700 font-bold animate-pulse">
                        ✦ คลิกวันที่ 2 เพื่อกำหนดช่วงสิ้นสุด (หรือคลิกซ้ำเพื่อเลือกวันเดียว)
                      </span>
                    ) : (
                      'กด 2 ครั้งเพื่อเลือกช่วงวัน (คลิกซ้ำวันเดิม = วันเดียว)'
                    )}
                  </span>
                </div>

                {/* Single Monthly Calendar Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                  {/* Calendar Month Navigation Header */}
                  <div className="flex items-center justify-between px-1">
                    <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                      <span className="text-sm font-black text-amber-950">
                        {THAI_MONTHS[calendarViewMonth]} {calendarViewYear + 543}
                      </span>
                      {calendarViewYear === currentYear && calendarViewMonth === currentMonth && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                          เดือนปัจจุบัน
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors"
                        title="เดือนก่อนหน้า"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCalendarViewMonth(currentMonth);
                          setCalendarViewYear(currentYear);
                        }}
                        className="px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md cursor-pointer"
                        title="กลับมาเดือนปัจจุบัน"
                      >
                        วันนี้
                      </button>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors"
                        title="เดือนถัดไป"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Day of Week Header (Mon-Fri emphasized) */}
                  <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-500 border-b border-slate-200/80 pb-1">
                    <span className="text-rose-400">อา</span>
                    <span className="text-slate-700">จ</span>
                    <span className="text-slate-700">อ</span>
                    <span className="text-slate-700">พ</span>
                    <span className="text-slate-700">พฤ</span>
                    <span className="text-slate-700">ศ</span>
                    <span className="text-indigo-400">ส</span>
                  </div>

                  {/* Calendar Dates Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty placeholder cells for offset before 1st of month */}
                    {Array.from({ length: calendarDaysMatrix.firstDayIndex }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-8" />
                    ))}

                    {/* Day Cells */}
                    {calendarDaysMatrix.days.map(({ day, dateStr, isWeekend }) => {
                      const isStart = startDate === dateStr;
                      const isEnd = endDate === dateStr;
                      const isInRange = startDate && endDate && dateStr >= startDate && dateStr <= endDate;
                      const isSelectingThisStart = rangeSelectingStart === dateStr;

                      let cellStyle = 'bg-white hover:bg-amber-100 text-slate-800 border-slate-200';
                      if (isStart || isEnd || isSelectingThisStart) {
                        cellStyle = 'bg-amber-500 text-slate-950 font-black shadow-xs border-amber-600 scale-[1.04] z-10';
                      } else if (isInRange) {
                        cellStyle = isWeekend 
                          ? 'bg-amber-100/60 text-slate-700 border-amber-200' 
                          : 'bg-amber-200/90 text-amber-950 font-bold border-amber-300';
                      } else if (isWeekend) {
                        cellStyle = 'bg-slate-100/60 text-slate-400 border-transparent hover:bg-slate-200/70';
                      }

                      return (
                        <button
                          key={dateStr}
                          type="button"
                          onClick={() => handleCalendarDayClick(dateStr)}
                          className={`h-8 rounded-lg text-xs flex flex-col items-center justify-center transition-all cursor-pointer border relative ${cellStyle}`}
                          title={`${formatThaiDate(dateStr)}${isWeekend ? ' (เสาร์-อาทิตย์ ไม่นับคำนวณ)' : ' (จันทร์-ศุกร์ นับคำนวณ)'}`}
                        >
                          <span className="leading-none">{day}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Range Display Info Banner */}
                  <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs gap-1.5">
                    <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <span className="text-slate-500 font-normal">ช่วงที่เลือก:</span>
                      <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-900 font-black">
                        {startDate === endDate ? (
                          formatThaiDate(startDate)
                        ) : (
                          `${formatThaiDate(startDate)} - ${formatThaiDate(endDate)}`
                        )}
                      </span>
                    </div>

                    {/* Quick Reset to Full Current Month */}
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate(defaultStartDate);
                        setEndDate(defaultEndDate);
                        setRangeSelectingStart(null);
                        setCalendarViewMonth(currentMonth);
                        setCalendarViewYear(currentYear);
                      }}
                      className="text-[11px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                    >
                      เลือกทั้งเดือนนี้
                    </button>
                  </div>
                </div>
              </div>

              {/* Field 4: Note / Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุ / ชื่องวด (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="เช่น งวดที่ 1 ประจำเดือน..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
                />
              </div>

              {/* Requirement 2: Display ONLY 1% Withholding Tax Amount (Calculations handled in background) */}
              <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 p-4 rounded-2xl shadow-sm border border-amber-400 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-slate-950" />
                    <span>ยอดหักภาษี 1% ที่ต้องจ่าย:</span>
                  </span>
                  <span className="text-[11px] bg-black/10 px-2 py-0.5 rounded font-black">
                    หัก ณ ที่จ่าย 1%
                  </span>
                </div>

                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-950 pt-0.5">
                  {formatBaht(taxAmount)} <span className="text-sm font-bold">บาท</span>
                </div>

                <p className="text-[11px] text-slate-900/80 font-medium pt-1">
                  คำนวณหัก 1% จากยอดค่าอาหารกลางวัน (คำนวณเฉพาะวันทำการจันทร์-ศุกร์ ในระบบหลังบ้าน)
                </p>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  id="modal-btn-tax-submit"
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-2 active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>บันทึกรายการภาษีลงตาราง</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Delete Confirmation Modal */}
      {deleteRecordId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn no-print">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">ยืนยันการลบรายการภาษี</h4>
                <p className="text-xs text-slate-500">ข้อมูลรายการนี้จะถูกลบออกจากตาราง</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteRecordId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRecord(deleteRecordId)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
