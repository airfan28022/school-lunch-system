import React, { useState, useMemo } from 'react';
import { DailyMenuEntry, SchoolSettings, MenuItem } from '../types';
import { 
  Printer, 
  ArrowUpDown, 
  Search, 
  Calendar, 
  Loader2,
  FileCheck,
  Pencil,
  Trash2,
  Plus,
  X,
  Save,
  Sparkles
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

interface PrintReportProps {
  dailyMenus: DailyMenuEntry[];
  settings: SchoolSettings;
  showToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  menuBank?: MenuItem[];
  onSaveDailyMenu?: (entry: DailyMenuEntry) => Promise<boolean> | boolean;
  onDeleteDailyMenu?: (dateStr: string) => Promise<void> | void;
}

export const PrintReport: React.FC<PrintReportProps> = ({
  dailyMenus,
  settings,
  showToast,
  menuBank = [],
  onSaveDailyMenu,
  onDeleteDailyMenu
}) => {
  // Month & Year state
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-12
  
  // Sort and filter
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchFilter, setSearchFilter] = useState<string>('');
  
  // Generating PDF state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Edit Modal State (Requirement 1.8)
  const [editingEntry, setEditingEntry] = useState<DailyMenuEntry | null>(null);
  const [editRice, setEditRice] = useState<string>('');
  const [editSingleDish, setEditSingleDish] = useState<string>('');
  const [editNonSpicy, setEditNonSpicy] = useState<string>('');
  const [editSpicy, setEditSpicy] = useState<string>('');
  const [editDessert, setEditDessert] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');

  // Add New Date Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newDateStr, setNewDateStr] = useState<string>('');

  const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const THAI_DAY_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

  // Current month prefix (YYYY-MM)
  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  // Filter entries belonging to this month
  const monthEntries = useMemo(() => {
    let filtered = dailyMenus.filter((item) => item.date.startsWith(monthKey));

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

    filtered.sort((a, b) => {
      return sortOrder === 'asc' 
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date);
    });

    return filtered;
  }, [dailyMenus, monthKey, searchFilter, sortOrder]);

  /**
   * Format Short Date: e.g. "จ. 1/9/69", "อ. 2/9/69"
   */
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

  /**
   * Requirement 1.7: Format meal list as "ข้าว + ผัดเผ็ด + แกงจืด + ส้ม"
   */
  const formatMealList = (entry: DailyMenuEntry): string => {
    if (entry.singleDish) {
      const parts = [`${entry.singleDish} (อาหารจานเดียว)`];
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
  const handleDeleteRow = async (dateStr: string) => {
    if (window.confirm(`ยืนยันการลบรายการอาหารวันที่ ${formatShortDate(dateStr)} หรือไม่?`)) {
      if (onDeleteDailyMenu) {
        await onDeleteDailyMenu(dateStr);
        showToast('ลบรายการสำเร็จ', `ลบเมนูวันที่ ${formatShortDate(dateStr)} เรียบร้อยแล้ว`, 'info');
      }
      if (editingEntry?.date === dateStr) {
        setEditingEntry(null);
      }
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

  // Generate & direct download A4 Portrait PDF file
  const handleDownloadPdf = async () => {
    const element = document.getElementById('printable-a4-sheet');
    if (!element) return;

    if (monthEntries.length === 0) {
      showToast('ไม่มีข้อมูล', 'ไม่มีรายการอาหารในเดือนที่เลือกสำหรับสร้าง PDF', 'warning');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      showToast('กำลังจัดเตรียม PDF...', 'ระบบกำลังประมวลผลหน้ากระดาษ A4 แนวตั้ง กรุณารอสักครู่', 'info');

      // Use html2canvas-pro with ignoreElements to exclude any .no-print elements
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        ignoreElements: (el) => el.classList.contains('no-print')
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const contentHeight = (canvas.height * pdfWidth) / canvas.width;

      if (contentHeight > pdfHeight) {
        const scaleFactor = pdfHeight / contentHeight;
        const fittedWidth = pdfWidth * scaleFactor;
        const xOffset = (pdfWidth - fittedWidth) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, 0, fittedWidth, pdfHeight);
      } else {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, contentHeight);
      }

      const thaiMonthName = THAI_MONTHS[selectedMonth - 1];
      const buddhistYear = selectedYear + 543;
      const filename = `รายงานอาหารกลางวัน_${thaiMonthName}_${buddhistYear}.pdf`;
      pdf.save(filename);

      showToast('ดาวน์โหลด PDF สำเร็จ', `ดาวน์โหลดไฟล์ ${filename} เรียบร้อยแล้ว (ขนาด A4 แนวตั้ง)`, 'success');
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast('เปิดคำสั่งพิมพ์', 'เปิดหน้าต่างพิมพ์เพื่อให้คุณบันทึกเป็น PDF ได้ทันที', 'info');
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const thaiMonthName = THAI_MONTHS[selectedMonth - 1];
  const buddhistYear = selectedYear + 543;

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------- */}
      {/* Control Bar: Screen Only                                      */}
      {/* ------------------------------------------------------------- */}
      <div className="no-print bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Month & Year Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold">เลือกเดือน:</span>
          </div>

          <select
            id="select-report-month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            {THAI_MONTHS.map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>

          <select
            id="select-report-year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
              <option key={y} value={y}>
                พ.ศ. {y + 543} ({y})
              </option>
            ))}
          </select>

          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            พบ {monthEntries.length} วัน
          </span>

          <button
            type="button"
            onClick={() => {
              setNewDateStr(`${monthKey}-01`);
              setIsAddModalOpen(true);
            }}
            className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
            title="เพิ่มเมนูวันใหม่ในเดือนนี้"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มวันในเดือนนี้</span>
          </button>
        </div>

        {/* Right: Search, Sort & Action Buttons */}
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

          <button
            id="btn-toggle-sort"
            type="button"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            title="สลับเรียงลำดับ วันที่ ก่อน-หลัง"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{sortOrder === 'asc' ? 'วันที่ 1 &rarr; 31' : 'วันที่ 31 &rarr; 1'}</span>
          </button>

          {/* Action Button: Print */}
          <button
            id="btn-print-action"
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            title="สั่งพิมพ์ A4 (Print)"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>พิมพ์</span>
          </button>

          {/* Action Button: PDF */}
          <button
            id="btn-download-pdf"
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            title="พิมพ์ / บันทึกไฟล์ PDF ขนาด A4 แนวตั้ง"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>ประมวลผล PDF...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>PDF (A4)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* A4 Printable Sheet Container                                  */}
      {/* ------------------------------------------------------------- */}
      <div 
        id="printable-a4-sheet"
        className="bg-white p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-sm print-page-container mx-auto max-w-[210mm]"
      >
        {/* Printable Header:
            1.1 เอาโลโก้ออก
            1.2 รายงานอาหารกลางวัน ประจำเดือน... ให้อยู่บรรทัดบนแรกตรงกลาง
            1.3 เอาออกชื่อผู้รับผิดชอบทั้งหมด
            1.4 เอาออกพิมพ์เมื่อ...
            1.5 เอาออกสังกัด...
            1.6 เอาออกคำว่าตารางเมนูอาหารกลางวัน
        */}
        <div className="print-header text-center pb-2.5 mb-3 border-b-2 border-slate-900">
          <h1 className="text-base sm:text-xl font-bold text-slate-900 text-center tracking-tight">
            รายงานอาหารกลางวัน ประจำเดือน {thaiMonthName} {buddhistYear}
          </h1>
          {settings.schoolName && (
            <p className="text-xs sm:text-sm font-semibold text-slate-700 text-center mt-0.5">
              {settings.schoolName}
            </p>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Table: 3 Main Columns (วันที่, รายการอาหาร, หมายเหตุ)          */}
        {/* ------------------------------------------------------------- */}
        {monthEntries.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
            ไม่มีข้อมูลเมนูอาหารในเดือน {thaiMonthName} {buddhistYear}
          </div>
        ) : (
          <table className="a4-print-table w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold border border-slate-900 text-[9pt]">
                {/* 1. วันที่ */}
                <th className="col-print-date p-1.5 border border-slate-900 text-center">
                  วันที่
                </th>

                {/* 2. รายการอาหาร */}
                <th className="col-print-menu p-1.5 border border-slate-900">
                  รายการอาหาร
                </th>

                {/* 3. หมายเหตุ */}
                <th className="col-print-note p-1.5 border border-slate-900 text-center">
                  หมายเหตุ
                </th>

                {/* Screen-Only Edit Action Column (1.8) */}
                <th className="no-print col-print-action p-1.5 border border-slate-300 text-center w-16 bg-slate-50 text-slate-600">
                  แก้ไข
                </th>
              </tr>
            </thead>
            <tbody>
              {monthEntries.map((entry) => {
                const shortDate = formatShortDate(entry.date);
                const parts = entry.date.split('-').map(Number);
                const d = new Date(parts[0], parts[1] - 1, parts[2]);
                const isMonday = d.getDay() === 1;
                const mealString = formatMealList(entry);

                return (
                  <tr 
                    key={entry.date} 
                    className={`border border-slate-800 text-[8.5pt] leading-tight ${
                      isMonday ? 'print-monday-row bg-amber-100/70 border-t-2 border-amber-400' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {/* 1. วันที่: รูปแบบสั้น เช่น จ. 1/9/69 */}
                    <td className={`col-print-date p-1 border border-slate-700 font-bold text-center whitespace-nowrap ${
                      isMonday ? 'bg-amber-200/60 text-amber-950' : 'bg-slate-50/40 text-slate-900'
                    }`}>
                      {shortDate}
                    </td>

                    {/* 2. รายการอาหาร เช่น ข้าว + ผัดเผ็ด + แกงจืด + ส้ม */}
                    <td className="col-print-menu p-1.5 border border-slate-700 text-slate-900 font-medium">
                      {mealString}
                    </td>

                    {/* 3. หมายเหตุ */}
                    <td className="col-print-note p-1 border border-slate-700 text-center text-[7.5pt] text-slate-600">
                      {entry.note || ''}
                    </td>

                    {/* Screen-Only Edit & Delete Actions (1.8) */}
                    <td className="no-print col-print-action p-1 border border-slate-300 text-center whitespace-nowrap bg-white">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(entry)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          title="แก้ไขรายการอาหารวันนี้"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(entry.date)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="ลบเมนูวันนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Signature Box Section (Bottom of A4) */}
        <div className="print-signature-section mt-5 pt-2 flex justify-between gap-4 text-center text-xs text-slate-800">
          <div className="signature-box flex-1">
            <div className="signature-line border-b border-dotted border-slate-700 h-5 mb-1"></div>
            <p className="font-bold">ลงชื่อ..................................................</p>
            <p className="text-[10px] text-slate-500">(........................................................)</p>
            <p className="text-[10px] text-slate-500">ผู้จัดทำอาหารกลางวัน</p>
          </div>

          <div className="signature-box flex-1">
            <div className="signature-line border-b border-dotted border-slate-700 h-5 mb-1"></div>
            <p className="font-bold">ลงชื่อ..................................................</p>
            <p className="text-[10px] text-slate-500">(........................................................)</p>
            <p className="text-[10px] text-slate-500">ครูเวรโภชนาการประจำวัน</p>
          </div>

          <div className="signature-box flex-1">
            <div className="signature-line border-b border-dotted border-slate-700 h-5 mb-1"></div>
            <p className="font-bold">ลงชื่อ..................................................</p>
            <p className="text-[10px] text-slate-500">(........................................................)</p>
            <p className="text-[10px] text-slate-500">ผู้อำนวยการสถานศึกษา</p>
          </div>
        </div>

        {/* Footer Note for Print Constraint */}
        <div className="mt-3 text-right text-[8pt] text-slate-400 no-print flex items-center justify-end gap-1.5">
          <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>ขนาดเอกสารได้รับการปรับแต่งให้พอดีหน้ากระดาษ A4 แนวตั้ง 1 หน้าต่อ 1 เดือน</span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Edit Entry Modal (Requirement 1.8)                            */}
      {/* ------------------------------------------------------------- */}
      {editingEntry && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
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

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              {/* 1. ข้าว */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. ข้าว
                </label>
                <input
                  type="text"
                  placeholder="เช่น ข้าวสวยหอมมะลิ..."
                  value={editRice}
                  onChange={(e) => {
                    setEditRice(e.target.value);
                    if (e.target.value.trim()) setEditSingleDish('');
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* 2. อาหารจานเดียว */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. อาหารจานเดียว (ถ้ามี ช่องข้าวและกับข้าวจะถูกล้าง)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ข้าวมันไก่ตอน..."
                  value={editSingleDish}
                  onChange={(e) => {
                    setEditSingleDish(e.target.value);
                    if (e.target.value.trim()) {
                      setEditRice('');
                      setEditNonSpicy('');
                      setEditSpicy('');
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* 3. อาหารไม่เผ็ด */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. อาหารไม่เผ็ด
                </label>
                <input
                  type="text"
                  placeholder="เช่น ต้มจืดเต้าหู้หมูสับ..."
                  value={editNonSpicy}
                  onChange={(e) => setEditNonSpicy(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* 4. อาหารเผ็ด */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4. อาหารเผ็ด
                </label>
                <input
                  type="text"
                  placeholder="เช่น ผัดกะเพราหมูสับ..."
                  value={editSpicy}
                  onChange={(e) => setEditSpicy(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* 5. ผลไม้-ของหวาน */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  5. ผลไม้-ของหวาน
                </label>
                <input
                  type="text"
                  placeholder="เช่น ส้มเขียวหวาน หรือ บัวลอย..."
                  value={editDessert}
                  onChange={(e) => setEditDessert(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
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
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Modal Buttons */}
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
    </div>
  );
};
