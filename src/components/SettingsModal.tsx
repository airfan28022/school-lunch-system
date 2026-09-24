import React, { useState, useRef } from 'react';
import { SchoolSettings } from '../types';
import { fileToBase64, FALLBACK_IMAGE_URL } from '../services/api';
import { 
  School, 
  Upload, 
  Save, 
  Trash2, 
  Image as ImageIcon,
  CheckCircle,
  RefreshCw,
  User,
  ShieldCheck
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
  showToast
}) => {
  // Form states
  const [schoolName, setSchoolName] = useState<string>(initialSettings.schoolName || '');
  const [department, setDepartment] = useState<string>(initialSettings.department || '');
  const [managerName, setManagerName] = useState<string>(initialSettings.managerName || '');
  const [directorName, setDirectorName] = useState<string>(initialSettings.directorName || '');
  const [logoUrl, setLogoUrl] = useState<string>(initialSettings.logoUrl || '');

  // Interaction states
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileLogoRef = useRef<HTMLInputElement>(null);

  const isDriveUrl = logoUrl.includes('googleusercontent.com') || logoUrl.includes('drive.google.com');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SchoolSettings = {
      ...initialSettings,
      schoolName: schoolName.trim(),
      department: department.trim(),
      managerName: managerName.trim(),
      directorName: directorName.trim(),
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-600" />
              ผู้จัดทำ / หัวหน้างานโภชนาการ
            </label>
            <input
              id="input-manager-name"
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="เช่น นางกาญจนา มงคลสุข (หัวหน้างานโภชนาการโรงเรียน)"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-600" />
              ผู้อำนวยการสถานศึกษา / ผู้บริหาร
            </label>
            <input
              id="input-director-name"
              type="text"
              value={directorName}
              onChange={(e) => setDirectorName(e.target.value)}
              placeholder="เช่น นายประเสริฐ วัฒนาภิรมย์ (ผู้อำนวยการสถานศึกษา)"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
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
  );
};
