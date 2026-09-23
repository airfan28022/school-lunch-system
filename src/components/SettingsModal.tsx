import React, { useState, useRef } from 'react';
import { SchoolSettings } from '../types';
import { fileToBase64, FALLBACK_IMAGE_URL } from '../services/api';
import { FULL_CODE_GS } from '../services/gasCode';
import { 
  School, 
  Upload, 
  Save, 
  Trash2, 
  Image as ImageIcon,
  Cloud,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  HardDrive
} from 'lucide-react';

interface SettingsModalProps {
  settings: SchoolSettings;
  onSaveSettings: (settings: SchoolSettings) => Promise<void> | void;
  onUploadLogo?: (fileData: string, fileName: string, mimeType: string) => Promise<{ logoUrl: string; isDrive: boolean; message?: string }>;
  onTestGasConnection?: (url: string) => Promise<{ success: boolean; message: string }>;
  onSyncGas?: (url: string) => Promise<boolean>;
  showToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings: initialSettings,
  onSaveSettings,
  onUploadLogo,
  onTestGasConnection,
  onSyncGas,
  showToast
}) => {
  // Form states
  const [schoolName, setSchoolName] = useState<string>(initialSettings.schoolName || '');
  const [department, setDepartment] = useState<string>(initialSettings.department || '');
  const [logoUrl, setLogoUrl] = useState<string>(initialSettings.logoUrl || '');
  const [gasWebAppUrl, setGasWebAppUrl] = useState<string>(initialSettings.gasWebAppUrl || '');

  // Interaction states
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
  const [isTestingGas, setIsTestingGas] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showScriptCode, setShowScriptCode] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileLogoRef = useRef<HTMLInputElement>(null);

  const isDriveUrl = logoUrl.includes('googleusercontent.com') || logoUrl.includes('drive.google.com');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SchoolSettings = {
      ...initialSettings,
      schoolName: schoolName.trim(),
      department: department.trim(),
      logoUrl: logoUrl.trim(),
      gasWebAppUrl: gasWebAppUrl.trim()
    };

    await onSaveSettings(updated);
    showToast('บันทึกการตั้งค่าแล้ว', 'อัปเดตข้อมูลและบันทึกซิงค์ไปยังทุกเครื่องเรียบร้อยแล้ว', 'success');
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
            showToast('บันทึกลง Google Drive สำเร็จ', 'จัดเก็บไฟล์ตราโรงเรียนใน Google Drive และอัปเดตลิงก์ตรงแล้ว', 'success');
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

  const handleTestConnection = async () => {
    if (!gasWebAppUrl.trim()) {
      showToast('กรุณาระบุ URL', 'โปรดระบุ Web App URL ของ Google Apps Script ก่อนทดสอบ', 'warning');
      return;
    }

    setIsTestingGas(true);
    try {
      if (onTestGasConnection) {
        const res = await onTestGasConnection(gasWebAppUrl.trim());
        if (res.success) {
          showToast('เชื่อมต่อสำเร็จ', res.message || 'สามารถสื่อสารกับ Google Apps Script ได้เรียบร้อย', 'success');
        } else {
          showToast('เชื่อมต่อไม่สำเร็จ', res.message || 'กรุณาตรวจสอบ URL หรือการตั้งค่าสิทธิ์ Anyone', 'error');
        }
      }
    } catch (err: any) {
      showToast('ข้อผิดพลาด', err.message || 'ไม่สามารถเชื่อมต่อได้', 'error');
    } finally {
      setIsTestingGas(false);
    }
  };

  const handleManualSync = async () => {
    if (!gasWebAppUrl.trim()) {
      showToast('ยังไม่มี URL', 'กรุณาระบุ Web App URL ก่อนทำการซิงค์', 'warning');
      return;
    }

    setIsSyncing(true);
    try {
      if (onSyncGas) {
        const success = await onSyncGas(gasWebAppUrl.trim());
        if (success) {
          showToast('ซิงค์ข้อมูลสำเร็จ', 'ดึงข้อมูลล่าสุดจาก Google Sheets และ Google Drive เรียบร้อย', 'success');
        } else {
          showToast('ซิงค์ไม่สำเร็จ', 'ไม่สามารถดึงข้อมูลจาก Google Sheets ได้', 'error');
        }
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการซิงค์', err.message || 'เชื่อมต่อขัดข้อง', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const copyScriptToClipboard = () => {
    navigator.clipboard.writeText(FULL_CODE_GS).then(() => {
      setCopiedScript(true);
      showToast('คัดลอกสำเร็จ', 'คัดลอกโค้ด Google Apps Script (Code.gs) ลงคลิปบอร์ดแล้ว', 'success');
      setTimeout(() => setCopiedScript(false), 2500);
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Settings Form */}
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
              กำหนดชื่อโรงเรียน หน่วยงานต้นสังกัด ตราสัญลักษณ์ และการซิงค์ข้อมูลคลาวด์
            </p>
          </div>
        </div>

        {/* 1. School Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
              required
            />
          </div>

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
                อัปโหลดรูปภาพตราโรงเรียน เพื่อใช้แสดงผลบนแถบหัวเว็บและส่วนหัวเอกสารพิมพ์รายงาน A4 (จัดเก็บใน Google Drive อัตโนมัติ)
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
                  <p className="text-[10px] text-emerald-600 font-medium mt-1">
                    ระบบจะบันทึกรูปภาพตราโรงเรียนลง Google Drive โฟลเดอร์ SchoolLogo โดยตรง
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

        {/* 3. Google Drive & Google Sheets Cloud Sync Section */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-sky-600" />
                <label className="block text-xs font-bold text-slate-800">
                  การเชื่อมต่อ Google Drive & Google Sheets (ซิงค์ทุกเครื่องและบันทึกไฟล์ภาพ)
                </label>
              </div>
              <p className="text-[11px] text-slate-500">
                เมื่อเชื่อมต่อแล้ว ข้อมูลเมนูและการตั้งค่าจะซิงค์หากันทุกอุปกรณ์ ทุกเบราว์เซอร์ และรูปภาพทั้งหมดจะถูกบันทึกลง Google Drive
              </p>
            </div>

            {/* Status indicator */}
            <div>
              {gasWebAppUrl ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>เปิดใช้งานคลาวด์แล้ว</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <span>โหมดเซิร์ฟเวอร์ส่วนกลาง</span>
                </span>
              )}
            </div>
          </div>

          {/* Web App URL Input with Action Buttons */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
            <label className="block text-xs font-semibold text-slate-700">
              Google Apps Script Web App URL
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="input-gas-url"
                type="url"
                value={gasWebAppUrl}
                onChange={(e) => setGasWebAppUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono transition-all"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingGas || !gasWebAppUrl.trim()}
                  className="px-3 py-2 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingGas ? 'animate-spin' : ''}`} />
                  <span>{isTestingGas ? 'กำลังทดสอบ...' : 'ทดสอบเชื่อมต่อ'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing || !gasWebAppUrl.trim()}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Cloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ทันที'}</span>
                </button>
              </div>
            </div>

            {/* Quick helper guide */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                โฟลเดอร์ Google Drive: <code className="text-[10px] bg-slate-200/70 px-1 py-0.5 rounded text-slate-700">13hIUaTSAcZgA_smhKD6PSjuXwkr4ZsiI</code>
              </span>
              <button
                type="button"
                onClick={() => setShowScriptCode(!showScriptCode)}
                className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{showScriptCode ? 'ซ่อนคู่มือโค้ดสคริปต์' : 'ดูวิธีติดตั้งสคริปต์ (Code.gs)'}</span>
                {showScriptCode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Collapsible Script Code & Setup Instructions */}
            {showScriptCode && (
              <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                <div className="bg-amber-50/80 border border-amber-200/70 rounded-xl p-3 text-[11px] text-amber-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1">
                    <span>ขั้นตอนติดตั้งง่ายๆ 3 ขั้นตอน:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-amber-800">
                    <li>เปิด Google Sheet ของท่าน &rarr; เมนู <b>ส่วนขยาย (Extensions)</b> &rarr; <b>Apps Script</b></li>
                    <li>วางโค้ดด้านล่างลงในไฟล์ <b>Code.gs</b> แล้วกดบันทึก</li>
                    <li>กดปุ่ม <b>ทำให้ใช้งานได้ (Deploy)</b> &rarr; <b>การทำให้ใช้งานได้รายการใหม่ (New deployment)</b> &rarr; ประเภท <b>Web app</b> &rarr; เลือก Who has access เป็น <b>Anyone (ทุกคน)</b> แล้วคัดลอก Web App URL มาใส่ในช่องด้านบน</li>
                  </ol>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">โค้ด Apps Script Backend (Code.gs):</span>
                  <button
                    type="button"
                    onClick={copyScriptToClipboard}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'คัดลอกโค้ดแล้ว!' : 'คัดลอกโค้ดทั้งหมด'}</span>
                  </button>
                </div>

                <pre className="max-h-48 overflow-y-auto p-3 bg-slate-900 text-slate-200 rounded-xl text-[10px] font-mono leading-relaxed border border-slate-800">
                  {FULL_CODE_GS.slice(0, 1500)}
                  {'\n... (กดปุ่มคัดลอกโค้ดทั้งหมดเพื่อนำไปใช้งาน)'}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            * ข้อมูลจะถูกบันทึกและซิงค์เชื่อมโยงไปยังทุกอุปกรณ์ ทุกเบราว์เซอร์ และทุกบัญชีทันที
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
  );
};
