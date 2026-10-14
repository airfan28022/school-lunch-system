import React, { useState, useRef } from 'react';
import { SchoolSettings, MenuItem } from '../types';
import { fileToBase64, FALLBACK_IMAGE_URL } from '../services/api';
import { 
  School, 
  Upload, 
  Save, 
  Trash2, 
  Image as ImageIcon,
  CheckCircle,
  RefreshCw,
  ShieldCheck,
  UtensilsCrossed,
  FileSpreadsheet,
  ExternalLink,
  Copy,
  Lock,
  Database,
  Check,
  KeyRound
} from 'lucide-react';
import { MenuRepository } from './MenuRepository';

interface SettingsModalProps {
  settings: SchoolSettings;
  onSaveSettings: (settings: SchoolSettings) => Promise<void> | void;
  onUploadLogo?: (fileData: string, fileName: string, mimeType: string) => Promise<{ logoUrl: string; isDrive: boolean; message?: string }>;
  onTestGasConnection?: (url: string) => Promise<{ success: boolean; message: string }>;
  onSyncGas?: (url: string) => Promise<boolean>;
  showToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  // Menu Repository Props
  menuBank: MenuItem[];
  onAddMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void> | void;
  onUpdateMenuItem: (item: MenuItem) => Promise<void> | void;
  onDeleteMenuItem: (id: string) => Promise<void> | void;
  onSeedPresets: () => void;
  defaultSubTab?: 'menu' | 'school' | 'backend';
  spreadsheetUrl?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings: initialSettings,
  onSaveSettings,
  onUploadLogo,
  onTestGasConnection,
  onSyncGas,
  showToast,
  menuBank,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
  onSeedPresets,
  defaultSubTab = 'menu',
  spreadsheetUrl
}) => {
  // Sub-tab state (Menu Repository vs School Settings vs Backend Database)
  const [activeSubTab, setActiveSubTab] = useState<'menu' | 'school' | 'backend'>(defaultSubTab);

  // Form states
  const [schoolName, setSchoolName] = useState<string>(initialSettings.schoolName || '');
  const [department, setDepartment] = useState<string>(initialSettings.department || '');
  const [logoUrl, setLogoUrl] = useState<string>(initialSettings.logoUrl || '');

  // Interaction states
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isTestingGas, setIsTestingGas] = useState<boolean>(false);
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const fileLogoRef = useRef<HTMLInputElement>(null);

  const isDriveUrl = logoUrl.includes('googleusercontent.com') || logoUrl.includes('drive.google.com');

  const handleTestConnection = async () => {
    if (!onTestGasConnection) return;
    setIsTestingGas(true);
    try {
      const res = await onTestGasConnection(initialSettings.gasWebAppUrl || '');
      if (res.success) {
        showToast('การเชื่อมต่อสำเร็จ', res.message, 'success');
      } else {
        showToast('การเชื่อมต่อขัดข้อง', res.message, 'error');
      }
    } catch (err: any) {
      showToast('การเชื่อมต่อขัดข้อง', err?.message || 'ไม่สามารถติดต่อ Google Apps Script ได้', 'error');
    } finally {
      setIsTestingGas(false);
    }
  };

  const handleTriggerSync = async () => {
    if (!onSyncGas) return;
    setIsManualSyncing(true);
    try {
      const success = await onSyncGas(initialSettings.gasWebAppUrl || '');
      if (success) {
        showToast('ซิงค์ข้อมูลสำเร็จ', 'ข้อมูลทั้งหมดถูกส่งและบันทึกลง Google Sheets เรียบร้อยแล้ว', 'success');
      }
    } catch (err: any) {
      showToast('การซิงค์ขัดข้อง', err?.message || 'ไม่สามารถซิงค์ข้อมูลได้', 'error');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleCopyLink = () => {
    if (!spreadsheetUrl) return;
    navigator.clipboard.writeText(spreadsheetUrl);
    setCopiedLink(true);
    showToast('คัดลอกลิงก์สำเร็จ', 'คัดลอก URL ของ Google Sheets ไปยังคลิปบอร์ดแล้ว', 'info');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SchoolSettings = {
      ...initialSettings,
      schoolName: schoolName.trim(),
      department: department.trim(),
      managerName: '',
      directorName: '',
      logoUrl: logoUrl.trim(),
      gasWebAppUrl: initialSettings.gasWebAppUrl || ''
    };

    await onSaveSettings(updated);
    showToast('บันทึกการตั้งค่าแล้ว', 'อัปเดตข้อมูลโรงเรียนเรียบร้อยแล้ว', 'success');
  };

  const processLogoFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('ไฟล์ไม่ถูกต้อง', 'กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, WebP, SVG)', 'warning');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('ไฟล์มีขนาดใหญ่เกินไป', 'ขนาดไฟล์รูปภาพไม่ควรเกิน 5 MB', 'warning');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const base64 = await fileToBase64(file);
      // Set preview immediately
      setLogoUrl(base64);

      if (onUploadLogo) {
        showToast('กำลังอัปโหลด', 'กำลังบันทึกภาพตราโรงเรียนไปยัง Google Drive...', 'info');
        const res = await onUploadLogo(base64, file.name, file.type);
        if (res && res.logoUrl) {
          setLogoUrl(res.logoUrl);
          if (res.isDrive) {
            showToast('บันทึกลง Google Drive สำเร็จ', 'จัดเก็บไฟล์ตราโรงเรียนใน Google Drive เรียบร้อยแล้ว', 'success');
          } else {
            showToast('อัปโหลดสำเร็จ', res.message || 'บันทึกโลโก้ในระบบเรียบร้อยแล้ว', 'info');
          }
        }
      } else {
        showToast('อัปโหลดโลโก้สำเร็จ', `เลือกไฟล์ ${file.name} เรียบร้อยแล้ว`, 'success');
      }
    } catch (err: any) {
      showToast('ข้อผิดพลาดในการอัปโหลด', err.message || 'ไม่สามารถอัปโหลดไฟล์ภาพได้', 'error');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processLogoFile(files[0]);
    if (fileLogoRef.current) fileLogoRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processLogoFile(files[0]);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    showToast('รีเซ็ตโลโก้', 'ใช้ตราสัญลักษณ์เริ่มต้นของระบบแล้ว', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs within Settings */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 sm:p-2.5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2 w-full lg:w-auto">
          <button
            type="button"
            id="tab-settings-menu"
            onClick={() => setActiveSubTab('menu')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeSubTab === 'menu'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4 shrink-0" />
            <span className="truncate">คลังเมนูอาหาร</span>
            <span className={`text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full font-semibold shrink-0 ${
              activeSubTab === 'menu' ? 'bg-amber-600/30 text-slate-950' : 'bg-slate-200/70 text-slate-700'
            }`}>
              {menuBank.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-settings-school"
            onClick={() => setActiveSubTab('school')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeSubTab === 'school'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <School className="w-4 h-4 shrink-0" />
            <span className="truncate">ข้อมูลสถานศึกษา</span>
          </button>

          <button
            type="button"
            id="tab-settings-backend"
            onClick={() => setActiveSubTab('backend')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeSubTab === 'backend'
                ? 'bg-slate-900 text-amber-400 shadow-xs'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Database className="w-4 h-4 shrink-0 text-emerald-500" />
            <span className="truncate">ระบบหลังบ้าน (Sheets)</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-bold hidden sm:inline">
              Admin
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 px-2 sm:px-3 hidden lg:block">
          {activeSubTab === 'menu' 
            ? 'จัดการรายการอาหาร แยก 6 หมวดหมู่' 
            : activeSubTab === 'school'
            ? 'ตั้งค่าชื่อโรงเรียน สังกัด และตราสัญลักษณ์'
            : 'จัดการฐานข้อมูล Google Sheets และระบบหลังบ้าน'}
        </div>
      </div>

      {/* Tab 1: Menu Repository */}
      {activeSubTab === 'menu' && (
        <MenuRepository
          menuBank={menuBank}
          onAddMenuItem={onAddMenuItem}
          onUpdateMenuItem={onUpdateMenuItem}
          onDeleteMenuItem={onDeleteMenuItem}
          onSeedPresets={onSeedPresets}
        />
      )}

      {/* Tab 2: School Information Form */}
      {activeSubTab === 'school' && (
        <div className="max-w-4xl mx-auto space-y-5">
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-6">
            
            {/* Header Section */}
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                <School className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ข้อมูลสถานศึกษา
                </h3>
                <p className="text-xs text-slate-500">
                  กำหนดชื่อโรงเรียน หน่วยงานต้นสังกัด ผู้บริหาร และตราสัญลักษณ์โรงเรียน
                </p>
              </div>
            </div>

            {/* 1. School Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-amber-600" />
                  ชื่อโรงเรียน / สถานศึกษา <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-school-name"
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="เช่น โรงเรียนเทศบาลพัฒนา"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  สังกัด / หน่วยงานต้นสังกัด <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-department"
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="เช่น สังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษา..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                  required
                />
              </div>
            </div>

            {/* 2. School Logo Section */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <label className="block text-xs font-bold text-slate-800">
                      ตราสัญลักษณ์โรงเรียน (School Logo)
                    </label>
                    {isDriveUrl && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        บันทึกบน Google Drive
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    อัปโหลดรูปภาพตราโรงเรียน เพื่อใช้แสดงผลบนแถบหัวเว็บและส่วนหัวเอกสารพิมพ์รายงาน A4
                  </p>
                </div>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    title="คืนค่าเป็นตราสัญลักษณ์เริ่มต้น"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>คืนค่าเริ่มต้น</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                {/* Logo Preview Card */}
                <div className="sm:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                  <div className="relative w-24 h-24 rounded-2xl bg-white border-2 border-slate-200 overflow-hidden shadow-xs flex items-center justify-center mb-2">
                    {isUploadingLogo ? (
                      <div className="flex flex-col items-center justify-center gap-1 p-2 text-center">
                        <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                        <span className="text-[10px] font-semibold text-amber-600">กำลังอัปโหลด...</span>
                      </div>
                    ) : (
                      <img
                        src={logoUrl || FALLBACK_IMAGE_URL}
                        alt="ตราสัญลักษณ์โรงเรียน"
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL;
                        }}
                      />
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">
                    {logoUrl ? 'โลโก้ที่ใช้งานอยู่' : 'ตราสัญลักษณ์เริ่มต้น'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    {isDriveUrl 
                      ? '☁️ จัดเก็บบน Google Drive เรียบร้อย' 
                      : logoUrl ? 'จัดเก็บในระบบแล้ว' : 'ยังไม่ได้อัปโหลดไฟล์'}
                  </span>
                </div>

                {/* Drag & Drop Upload Zone */}
                <div className="sm:col-span-8">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !isUploadingLogo && fileLogoRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all flex flex-col items-center justify-center gap-2 ${
                      isUploadingLogo 
                        ? 'border-amber-300 bg-amber-50/50 cursor-wait' 
                        : isDragging
                          ? 'border-amber-500 bg-amber-50/80 scale-[1.01] cursor-pointer'
                          : 'border-slate-300 hover:border-amber-400 hover:bg-slate-50/80 bg-white cursor-pointer'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs">
                      {isUploadingLogo ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {isUploadingLogo ? 'กำลังส่งไฟล์ไปยัง Google Drive...' : (
                          <>ลากและวางรูปภาพที่นี่ หรือ <span className="text-amber-600 underline">คลิกเพื่อเลือกไฟล์</span></>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        รองรับไฟล์ภาพ PNG, JPG, WebP, SVG (ขนาดไม่เกิน 5 MB)
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isUploadingLogo}
                      onClick={(e) => {
                        e.stopPropagation();
                        fileLogoRef.current?.click();
                      }}
                      className="mt-1 px-4 py-1.5 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 text-amber-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{isUploadingLogo ? 'กำลังบันทึกภาพ...' : 'เลือกไฟล์รูปภาพ'}</span>
                    </button>

                    <input
                      ref={fileLogoRef}
                      id="input-file-school-logo"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[11px] text-slate-500">
                * ข้อมูลจะถูกบันทึกและซิงค์เชื่อมโยงไปยังทุกอุปกรณ์ ทุกเบราว์เซอร์ และทุกบัญชีโดยอัตโนมัติ
              </p>
              <button
                id="btn-save-school-settings"
                type="submit"
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกข้อมูลโรงเรียน</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Backend & Google Sheets Database */}
      {activeSubTab === 'backend' && (
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Admin Security Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-sm border border-slate-700/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      ระบบจัดการหลังบ้าน & ฐานข้อมูล Google Sheets
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-full">
                      Admin Only
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    ลิงก์และการเข้าถึง Google Sheets ถูกเก็บไว้เฉพาะในระบบหลังบ้านนี้เท่านั้น ไม่แสดงบนหน้าเว็ปหรือแอปทั่วไป เพื่อความปลอดภัยและป้องกันบุคคลภายนอกเข้าถึง
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-emerald-300">ซิงค์อัตโนมัติ 2 ทาง</span>
              </div>
            </div>
          </div>

          {/* Main Google Sheets Access Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Google Sheets ฐานข้อมูลกลางระบบ
                  </h4>
                  <p className="text-xs text-slate-500">
                    สเปรดชีตหลักจัดเก็บข้อมูลเมนู อาหารรายวัน ภาษี และการตั้งค่าทั้งหมด
                  </p>
                </div>
              </div>

              {spreadsheetUrl && (
                <div className="flex items-center gap-2">
                  <a
                    id="btn-backend-open-sheets"
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>เปิด Google Sheets (หลังบ้าน)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    title="คัดลอกลิงก์ Google Sheets"
                    className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                  >
                    {copiedLink ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Structure of Google Sheets Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">แผ่นงาน Settings</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold">ข้อมูลพื้นฐาน</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  ชื่อโรงเรียน สังกัด โลโก้ และการกำหนดค่าระบบ
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">แผ่นงาน MenuBank</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">{menuBank.length} เมนู</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  คลังรายการอาหาร 6 หมวดหมู่ หมวด ราคา และรูปภาพ
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">แผ่นงาน DailyMenu</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 font-semibold">รายวัน & ปฏิทิน</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  แผนอาหารแต่ละวัน วัตถุดิบ รูปภาพจริง และรายการจัดสรร
                </p>
              </div>
            </div>

            {/* Google Apps Script Integration Section */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-slate-800">
                    Google Apps Script Web App API
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    ตัวกลางเชื่อมต่อ API สำหรับอ่าน/เขียนข้อมูลลง Google Sheets แบบเรียลไทม์
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  ออนไลน์พร้อมใช้งาน
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 break-all select-all">
                {initialSettings.gasWebAppUrl || 'https://script.google.com/macros/s/AKfycbzKYFt1-hn2Qq9bnrsQpG9PMhehuuq6yuaE2e6Tq8ogIB1Ft6EQV4FdyzUkL5RxTKqf/exec'}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isTestingGas}
                  onClick={handleTestConnection}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isTestingGas ? 'animate-spin' : ''}`} />
                  <span>{isTestingGas ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ API'}</span>
                </button>

                <button
                  type="button"
                  disabled={isManualSyncing}
                  onClick={handleTriggerSync}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
                  <span>{isManualSyncing ? 'กำลังซิงค์...' : 'บังคับซิงค์ข้อมูลทั้งหมดลง Google Sheets'}</span>
                </button>
              </div>
            </div>

            {/* Admin Credentials Info */}
            <div className="pt-4 border-t border-slate-100 bg-slate-50/70 -mx-5 -mb-6 p-5 sm:p-6 rounded-b-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    ข้อมูลบัญชีผู้ดูแลระบบ (Admin Credentials)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    ID: <strong className="text-slate-800">Admin</strong> &nbsp;|&nbsp; Password: <strong className="text-slate-800">1159551</strong>
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-slate-400">
                ระบบรักษาความปลอดภัย ป้องกันผู้ใช้ทั่วไปเข้าถึง Google Sheets
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
