import React, { useState, useMemo } from 'react';
import { DailyMenuEntry, SchoolSettings } from '../types';
import { FALLBACK_IMAGE_URL } from '../services/api';
import { 
  Printer, 
  Download, 
  ArrowUpDown, 
  Search, 
  Calendar, 
  Loader2,
  FileCheck
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

interface PrintReportProps {
  dailyMenus: DailyMenuEntry[];
  settings: SchoolSettings;
  showToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const PrintReport: React.FC<PrintReportProps> = ({
  dailyMenus,
  settings,
  showToast
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
   * แปลงวันที่เป็นรูปแบบสั้น เช่น "จ. 1/9/69", "อ. 2/9/69"
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
   * รวมรายการอาหารในวันนั้นให้กระชับ ชัดเจน
   */
  const formatFullMeal = (entry: DailyMenuEntry): string => {
    const items: string[] = [];
    if (entry.singleDish) items.push(entry.singleDish);
    if (entry.rice) items.push(entry.rice);
    if (entry.nonSpicy) items.push(entry.nonSpicy);
    if (entry.spicy) items.push(entry.spicy);
    if (entry.dessert) items.push(entry.dessert);
    return items.join(' | ');
  };

  // Trigger browser native print (defaults to Save as PDF / Print, constrained to 1-page A4)
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

      // Use html2canvas-pro to capture the exact rendered element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      
      // Standard A4 portrait: 210mm x 297mm
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const contentHeight = (canvas.height * pdfWidth) / canvas.width;

      // Ensure strictly 1 page: if content height exceeds A4 height, scale to fit 100% on 1 page
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
  const reportTitle = `รายงานอาหารกลางวัน ประจำเดือน ${thaiMonthName} ${buddhistYear}`;

  return (
    <div className="space-y-5">
      {/* Control Bar: Month/Year selector, Filter, Print & Download PDF (Screen Only) */}
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
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            title="สั่งพิมพ์ออกเครื่องพิมพ์ หรือบันทึกเป็น PDF ผ่านคำสั่งพิมพ์"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>พิมพ์รายงาน (Print A4)</span>
          </button>

          {/* Action Button: Direct Download PDF */}
          <button
            id="btn-download-pdf"
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            title="ดาวน์โหลดเป็นไฟล์ PDF ขนาด A4 แนวตั้ง 1 หน้า/เดือน ทันที"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังสร้าง PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดไฟล์ PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* A4 Printable Sheet Container (Screen Card + Exact Print Format) */}
      <div 
        id="printable-a4-sheet"
        className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm print-page-container mx-auto max-w-[210mm]"
      >
        {/* Printable Header */}
        <div className="print-header flex items-start justify-between gap-4 pb-2.5 mb-2.5 border-b-2 border-slate-900">
          <div className="flex items-center gap-3">
            <img
              src={settings.logoUrl || FALLBACK_IMAGE_URL}
              alt="School Logo"
              crossOrigin="anonymous"
              className="w-12 h-12 object-contain rounded-md"
              onError={(e) => {
                (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL;
              }}
            />
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {reportTitle}
              </h1>
              <p className="text-xs sm:text-sm text-slate-700 font-semibold mt-0.5">
                {settings.schoolName || 'โรงเรียนเทศบาลพัฒนา'}
              </p>
              <p className="text-[10pt] text-slate-600">
                {settings.department || 'สังกัดสำนักงานเขตพื้นที่การศึกษา'}
              </p>
            </div>
          </div>

          <div className="text-right text-[9pt] text-slate-600 shrink-0">
            <div>ผู้รับผิดชอบ: <span className="font-semibold text-slate-900">{settings.managerName || 'หัวหน้างานโภชนาการ'}</span></div>
            <div>พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')}</div>
            <div className="text-[8pt] text-emerald-700 font-medium">รายงานขนาด A4 แนวตั้ง (1 หน้า/เดือน)</div>
          </div>
        </div>

        {/* 3-Column A4 Table:
            1. วันที่ (จ. 1/9/69)
            2. รายการอาหารประจำวัน
            3. หมายเหตุ / ลายมือชื่อ
        */}
        {monthEntries.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
            ไม่มีข้อมูลเมนูอาหารในเดือน {thaiMonthName} {buddhistYear}
          </div>
        ) : (
          <table className="a4-print-table w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold border border-slate-900 text-xs">
                <th className="col-print-date p-2 border border-slate-900 text-center">
                  วันที่
                </th>
                <th className="col-print-menu p-2 border border-slate-900">
                  รายการอาหารประจำวัน
                </th>
                <th className="col-print-note p-2 border border-slate-900 text-center">
                  หมายเหตุ / ลายมือชื่อ
                </th>
              </tr>
            </thead>
            <tbody>
              {monthEntries.map((entry) => {
                const fullMeal = formatFullMeal(entry);
                const shortDate = formatShortDate(entry.date);

                return (
                  <tr key={entry.date} className="border border-slate-800 text-[9pt] leading-tight">
                    {/* 1. วันที่: รูปแบบสั้น เช่น จ. 1/9/69 */}
                    <td className="col-print-date p-1.5 border border-slate-700 font-bold text-center whitespace-nowrap bg-slate-50/50">
                      {shortDate}
                    </td>

                    {/* 2. รายการอาหาร */}
                    <td className="col-print-menu p-1.5 border border-slate-700 text-slate-900">
                      <div className="font-medium">{fullMeal || '-'}</div>
                      {(entry.rice && entry.singleDish) && (
                        <div className="text-[8pt] text-slate-500 mt-0.5">
                          {entry.rice} + {entry.singleDish}
                        </div>
                      )}
                    </td>

                    {/* 3. หมายเหตุ */}
                    <td className="col-print-note p-1.5 border border-slate-700 text-center text-[8pt] text-slate-600">
                      {entry.note || ''}
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
            <p className="text-[10px] text-slate-600">({settings.managerName || 'ผู้จัดทำ / แม่ครัว'})</p>
            <p className="text-[10px] text-slate-500">ผู้จัดทำอาหารกลางวัน</p>
          </div>

          <div className="signature-box flex-1">
            <div className="signature-line border-b border-dotted border-slate-700 h-5 mb-1"></div>
            <p className="font-bold">ลงชื่อ..................................................</p>
            <p className="text-[10px] text-slate-600">(........................................................)</p>
            <p className="text-[10px] text-slate-500">ครูเวรโภชนาการประจำวัน</p>
          </div>

          <div className="signature-box flex-1">
            <div className="signature-line border-b border-dotted border-slate-700 h-5 mb-1"></div>
            <p className="font-bold">ลงชื่อ..................................................</p>
            <p className="text-[10px] text-slate-600">({settings.directorName || 'ผู้อำนวยการโรงเรียน'})</p>
            <p className="text-[10px] text-slate-500">ผู้อำนวยการสถานศึกษา</p>
          </div>
        </div>

        {/* Footer Note for Print Constraint */}
        <div className="mt-3 text-right text-[8pt] text-slate-400 no-print flex items-center justify-end gap-1.5">
          <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>ขนาดเอกสารได้รับการปรับแต่งให้พอดีหน้ากระดาษ A4 แนวตั้ง 1 หน้าต่อ 1 เดือน</span>
        </div>
      </div>
    </div>
  );
};
