import React, { useState, useRef } from 'react';
import { SchoolSettings } from '../types';
import { fileToBase64, FALLBACK_IMAGE_URL } from '../services/api';
import { FULL_CODE_GS } from '../services/gasCode';
import { 
  Settings, 
  School, 
  Upload, 
  Check, 
  Copy, 
  Code, 
  Cloud, 
  Layers, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Download, 
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Server
} from 'lucide-react';

interface SettingsModalProps {
  settings: SchoolSettings;
  onSaveSettings: (settings: SchoolSettings) => Promise<void> | void;
  onTestGasConnection: (url: string) => Promise<{ success: boolean; message: string }>;
  showToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings: initialSettings,
  onSaveSettings,
  onTestGasConnection,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'backend'>('profile');
  const [backendSubTab, setBackendSubTab] = useState<'gas' | 'code' | 'cloudflare'>('gas');

  // Form states
  const [schoolName, setSchoolName] = useState<string>(initialSettings.schoolName || '');
  const [department, setDepartment] = useState<string>(initialSettings.department || '');
  const [managerName, setManagerName] = useState<string>(initialSettings.managerName || '');
  const [directorName, setDirectorName] = useState<string>(initialSettings.directorName || '');
  const [logoUrl, setLogoUrl] = useState<string>(initialSettings.logoUrl || '');
  const [gasWebAppUrl, setGasWebAppUrl] = useState<string>(initialSettings.gasWebAppUrl || '');

  const [isTestingGas, setIsTestingGas] = useState<boolean>(false);
  const [gasTestResult, setGasTestResult] = useState<'success' | 'failed' | null>(null);
  const [gasTestMessage, setGasTestMessage] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Logo upload state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileLogoRef = useRef<HTMLInputElement>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SchoolSettings = {
      schoolName: schoolName.trim(),
      department: department.trim(),
      managerName: managerName.trim(),
      directorName: directorName.trim(),
      logoUrl: logoUrl.trim(),
      gasWebAppUrl: gasWebAppUrl.trim()
    };

    await onSaveSettings(updated);
    showToast('บันทึกการตั้งค่าแล้ว', 'อัปเดตข้อมูลโรงเรียนและระบบเรียบร้อยแล้ว', 'success');
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

    try {
      const base64 = await fileToBase64(file);
      setLogoUrl(base64);
      showToast('อัปโหลดโลโก้สำเร็จ', `เลือกไฟล์ ${file.name} เรียบร้อยแล้ว`, 'success');
    } catch {
      showToast('ข้อผิดพลาด', 'ไม่สามารถอ่านไฟล์รูปภาพได้', 'error');
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

  const handleTestConnection = async () => {
    let cleanUrl = gasWebAppUrl.trim();
    if (!cleanUrl) {
      showToast('กรุณาระบุ URL', 'โปรดวาง Google Apps Script Web App URL ก่อนทดสอบ', 'warning');
      return;
    }

    if (cleanUrl.includes('script.google.com') && cleanUrl.includes('/edit')) {
      showToast('URL ไม่ถูกต้อง', 'URL นี้เป็นหน้าแก้ไขสคริปต์ ไม่ใช่ Web App URL', 'warning');
      setGasTestResult('failed');
      setGasTestMessage('URL ที่ระบุเป็นหน้าแก้ไขโค้ด (Editor) โปรดกดปุ่ม Deploy > New deployment > Web app ใน Google Apps Script เพื่อคัดลอก URL ที่ลงท้ายด้วย /exec');
      return;
    }

    if (cleanUrl.includes('/macros/s/') && cleanUrl.endsWith('/dev')) {
      cleanUrl = cleanUrl.replace(/\/dev$/, '/exec');
      setGasWebAppUrl(cleanUrl);
      showToast('ปรับ URL อัตโนมัติ', 'เปลี่ยนจาก /dev เป็น /exec เรียบร้อยแล้ว', 'info');
    }

    setIsTestingGas(true);
    setGasTestResult(null);
    setGasTestMessage('');

    const res = await onTestGasConnection(cleanUrl);
    setIsTestingGas(false);
    setGasTestResult(res.success ? 'success' : 'failed');
    setGasTestMessage(res.message);

    if (res.success) {
      showToast('เชื่อมต่อสำเร็จ!', res.message, 'success');
    } else {
      showToast('การเชื่อมต่อไม่สำเร็จ', res.message, 'warning');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(FULL_CODE_GS);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
    showToast('คัดลอกโค้ดสำเร็จ', 'คัดลอกโค้ด Code.gs ทั้งหมดลงในคลิปบอร์ดแล้ว', 'success');
  };

  const handleDownloadCodeFile = () => {
    const blob = new Blob([FULL_CODE_GS], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Code.gs';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('ดาวน์โหลดสำเร็จ', 'ดาวน์โหลดไฟล์ Code.gs เรียบร้อยแล้ว', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-100 text-sm font-medium mb-1">
              <Settings className="w-4 h-4" />
              <span>การตั้งค่าระบบ (System Settings & Cloud Integration)</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              ตั้งค่าโรงเรียน, Google Sheets & Drive และ Cloudflare Deploy
            </h2>
            <p className="text-blue-100 text-sm mt-1 max-w-2xl">
              กำหนดข้อมูลสถานศึกษา อัปโหลดโลโก้โรงเรียน และเชื่อมต่อ Web App API กับ Google Apps Script
            </p>
          </div>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          id="tab-btn-profile"
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <School className="w-4 h-4" />
          <span>ข้อมูลโรงเรียน & อัปโหลดโลโก้</span>
        </button>

        <button
          id="tab-btn-backend"
          type="button"
          onClick={() => setActiveTab('backend')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'backend'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Server className="w-4 h-4 text-amber-400" />
          <span>ระบบหลังบ้าน (Backend & Deploy)</span>
        </button>
      </div>

      {/* Tab 1: Profile & Logo Upload */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            ข้อมูลสถานศึกษาและผู้ลงนาม
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* School Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อโรงเรียน / สถานศึกษา <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-school-name"
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="เช่น โรงเรียนเทศบาลพัฒนา"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สังกัด / หน่วยงานต้นสังกัด <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="เช่น สังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษา..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Manager Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อ-สกุล ผู้จัดการระบบ / หัวหน้างานโภชนาการ <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-manager-name"
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="เช่น นางสาวมาลี วงศ์สว่าง"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Director Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อ-สกุล ผู้อำนวยการโรงเรียน (สำหรับรายงาน A4)
              </label>
              <input
                id="input-director-name"
                type="text"
                value={directorName}
                onChange={(e) => setDirectorName(e.target.value)}
                placeholder="เช่น นายสมเกียรติ สุขเกษม"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* School Logo Section (Pure Upload - No Text URL) */}
          <div className="pt-5 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  ตราสัญลักษณ์โรงเรียน (School Logo)
                </label>
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
                  <img
                    src={logoUrl || FALLBACK_IMAGE_URL}
                    alt="ตราสัญลักษณ์โรงเรียน"
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL;
                    }}
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-700">
                  {logoUrl ? 'โลโก้ที่ใช้งานอยู่' : 'ตราสัญลักษณ์เริ่มต้น'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {logoUrl ? 'ไฟล์อัปโหลดสำเร็จ' : 'ยังไม่ได้อัปโหลดไฟล์'}
                </span>
              </div>

              {/* Drag & Drop Upload Zone */}
              <div className="sm:col-span-8">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileLogoRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/80 scale-[1.01]'
                      : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80 bg-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                    <Upload className="w-5 h-5" />
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      ลากและวางรูปภาพที่นี่ หรือ <span className="text-blue-600 underline">คลิกเพื่อเลือกไฟล์</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      รองรับไฟล์ภาพ PNG, JPG, WebP, SVG (ขนาดไม่เกิน 5 MB)
                    </p>
                    <p className="text-[10px] text-emerald-600 font-medium mt-1">
                      แนะนำ: ไฟล์ PNG ที่มีพื้นหลังโปร่งใส (Transparent)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileLogoRef.current?.click();
                    }}
                    className="mt-1 px-4 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>เลือกไฟล์รูปภาพ</span>
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

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              id="btn-save-school-settings"
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกข้อมูลโรงเรียน</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Backend System (GAS Connection, Code.gs, Cloudflare Deploy) */}
      {activeTab === 'backend' && (
        <div className="space-y-4">
          {/* Sub-navigation for Backend System */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
            <button
              id="subtab-btn-gas"
              type="button"
              onClick={() => setBackendSubTab('gas')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                backendSubTab === 'gas'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>1. เชื่อมต่อ Google Apps Script (GAS)</span>
            </button>

            <button
              id="subtab-btn-code"
              type="button"
              onClick={() => setBackendSubTab('code')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                backendSubTab === 'code'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>2. โค้ด Code.gs</span>
            </button>

            <button
              id="subtab-btn-cloudflare"
              type="button"
              onClick={() => setBackendSubTab('cloudflare')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                backendSubTab === 'cloudflare'
                  ? 'bg-white text-orange-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3. วิธี Deploy บน Cloudflare Pages</span>
            </button>
          </div>

          {/* Sub-view 1: GAS Connector Form */}
          {backendSubTab === 'gas' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    เชื่อมต่อ Google Apps Script Web App (GAS)
                  </h3>
                  <p className="text-xs text-slate-500">
                    นำ Web App URL ที่ได้จากการกด "Deploy &gt; New deployment &gt; Web app" ใน Apps Script มาวางที่นี่
                  </p>
                </div>
              </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Google Apps Script Exec URL (Web App URL):
            </label>
            <div className="flex gap-2">
              <input
                id="input-gas-url"
                type="url"
                value={gasWebAppUrl}
                onChange={(e) => setGasWebAppUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                id="btn-test-gas-conn"
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingGas || !gasWebAppUrl.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {isTestingGas ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
              </button>
            </div>

            {gasTestResult === 'success' && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">การเชื่อมต่อ Google Sheets & Drive สำเร็จ!</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">{gasTestMessage || 'ข้อมูลจะถูกซิงค์ผ่านคลาวด์แบบเรียลไทม์'}</p>
                </div>
              </div>
            )}

            {gasTestResult === 'failed' && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">การเชื่อมต่อไม่สำเร็จ</p>
                    <p className="text-[11px] text-rose-700 leading-relaxed">
                      {gasTestMessage || 'ไม่สามารถติดต่อ Google Apps Script ได้'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-rose-200/60 flex flex-wrap items-center gap-2">
                  <a
                    href={`${gasWebAppUrl.trim().replace(/\/dev$/, '/exec')}${gasWebAppUrl.includes('?') ? '&' : '?'}action=ping`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-rose-600" />
                    <span>คลิกเพื่อทดสอบเปิดในแท็บใหม่ (ยืนยันสิทธิ์ Google)</span>
                  </a>
                  <span className="text-[11px] text-rose-600">
                    *หากยังไม่เคยกดยืนยันสิทธิ์ ให้คลิกปุ่มนี้แล้วกดยอมรับสิทธิ์ในหน้าต่าง Google ก่อนทดสอบอีกครั้ง
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-600">
            <h4 className="font-bold text-slate-800">ข้อมูล Google Drive & Sheets ของระบบ:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Parent Folder ID:</strong> <code className="bg-white px-1.5 py-0.5 rounded border text-orange-700">13hIUaTSAcZgA_smhKD6PSjuXwkr4ZsiI</code> (หรือให้สร้างให้อัตโนมัติในไดรฟ์ของท่าน)</li>
              <li><strong>โครงสร้างโฟลเดอร์กิจกรรม:</strong> <code className="bg-white px-1.5 py-0.5 rounded border">[ชื่อกิจกรรม]_[YYYY-MM-DD]</code></li>
              <li><strong>Direct Image Link:</strong> <code className="bg-white px-1.5 py-0.5 rounded border">https://lh3.googleusercontent.com/d/[FILE_ID]</code></li>
              <li><strong>ชีตอัตโนมัติ 3 ชีต:</strong> Settings, MenuBank, DailyMenu (ระบบจะสร้างและจัดรูปแบบให้อัตโนมัติ)</li>
            </ul>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              id="btn-save-gas-url"
              onClick={handleSave}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่า URL</span>
            </button>
          </div>
        </div>
      )}

      {/* Sub-view 2: Complete Code.gs Viewer & Downloader */}
      {backendSubTab === 'code' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-600" />
                <span>โค้ด Google Apps Script (Code.gs) ฉบับสมบูรณ์</span>
              </h3>
              <p className="text-xs text-slate-500">
                โค้ดนี้รองรับการเชื่อมต่อและเก็บข้อมูลลงใน Google Drive และ Google Sheets อย่างสมบูรณ์
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-copy-code-gs"
                type="button"
                onClick={handleCopyCode}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="คัดลอกโค้ด Code.gs ทั้งหมดลงคลิปบอร์ด"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'คัดลอกโค้ดสำเร็จ!' : 'คัดลอกโค้ดทั้งหมด'}</span>
              </button>

              <button
                id="btn-download-code-gs"
                type="button"
                onClick={handleDownloadCodeFile}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="ดาวน์โหลดไฟล์ Code.gs ลงเครื่อง"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลดไฟล์ Code.gs</span>
              </button>
            </div>
          </div>

          {/* Setup Guide */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-950 space-y-1">
            <p className="font-bold">ขั้นตอนการติดตั้งใน Google Apps Script:</p>
            <ol className="list-decimal pl-5 space-y-0.5 text-blue-900">
              <li>สร้าง Google Sheet ใหม่ หรือเปิด Google Drive &gt; สร้าง Google Sheet</li>
              <li>ไปที่เมนู <strong>ส่วนขยาย (Extensions) &gt; Apps Script</strong></li>
              <li>ลบโค้ดเริ่มต้นทั้งหมดในไฟล์ <code className="bg-white px-1 py-0.5 rounded font-mono">Code.gs</code> แล้ววางโค้ดด้านล่างนี้ลงไป</li>
              <li>กดปุ่ม <strong>การทำให้ใช้งานได้ (Deploy) &gt; การทำให้ใช้งานได้ใหม่ (New deployment)</strong></li>
              <li>เลือกประเภท: <strong>เว็บแอป (Web App)</strong> &rarr; ตั้งค่า <strong>ผู้มีสิทธิ์เข้าถึง (Who has access): ทุกคน (Anyone)</strong></li>
              <li>คัดลอก Web App URL มาใส่ในเมนู <strong>"1. เชื่อมต่อ Google Apps Script"</strong></li>
            </ol>
          </div>

          {/* Full Code Box */}
          <div className="relative">
            <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-[460px] leading-relaxed selection:bg-blue-600 selection:text-white border border-slate-800">
              {FULL_CODE_GS}
            </pre>
          </div>
        </div>
      )}

      {/* Sub-view 3: Cloudflare Pages Deployment Guide */}
      {backendSubTab === 'cloudflare' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b pb-3 flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-600" />
            ขั้นตอนการ Deploy ผ่าน Cloudflare Pages
          </h3>

          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-xl space-y-1.5">
              <h4 className="font-bold text-orange-950 text-sm">ขั้นตอนที่ 1: เตรียม Google Apps Script (Backend)</h4>
              <p>1. ไปที่ <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">script.google.com</a> แล้วกด New Project</p>
              <p>2. คัดลอกโค้ดจากเมนู <strong>2. โค้ด Code.gs</strong> ไปวางทั้งหมด</p>
              <p>3. กดปุ่ม <strong>Deploy &gt; New deployment</strong> เลือกประเภทเป็น <strong>Web app</strong></p>
              <p>4. ตั้งค่า <strong>Execute as: Me</strong> และ <strong>Who has access: Anyone (ทุกคน)</strong> แล้วกด Deploy</p>
              <p>5. คัดลอก <strong>Web app URL</strong> ที่ได้มาวางในเมนู <strong>"1. เชื่อมต่อ Google Apps Script"</strong> ของระบบนี้</p>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
              <h4 className="font-bold text-blue-950 text-sm">ขั้นตอนที่ 2: Deploy Frontend บน Cloudflare Pages</h4>
              <p>1. ไปที่ <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">Cloudflare Dashboard</a> &gt; Workers &amp; Pages &gt; Create application &gt; Pages</p>
              <p>2. เชื่อมต่อกับ Git Repository ของโปรเจกต์นี้ (GitHub หรือ GitLab)</p>
              <p>3. ตั้งค่า Build Settings:</p>
              <ul className="list-disc pl-5 font-mono text-[11px] text-slate-800 space-y-0.5">
                <li>Framework preset: <strong>Vite</strong></li>
                <li>Build command: <strong>npm run build</strong></li>
                <li>Build output directory: <strong>dist</strong></li>
              </ul>
              <p>4. กด <strong>Save and Deploy</strong> ภายในไม่กี่วินาที เว็บแอปพลิเคชันจะออนไลน์บน Cloudflare Pages ด้วยความเร็วสูง!</p>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
};
