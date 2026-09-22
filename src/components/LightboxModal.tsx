import React, { useState } from 'react';
import { ActivityPhoto } from '../types';
import { formatDriveDirectUrl, FALLBACK_IMAGE_URL, fileToBase64 } from '../services/api';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  RefreshCw, 
  Download, 
  ExternalLink,
  FolderOpen
} from 'lucide-react';

interface LightboxModalProps {
  photo: ActivityPhoto;
  allPhotos: ActivityPhoto[];
  onClose: () => void;
  onDelete?: () => void;
  onReplace?: (newPhoto: ActivityPhoto) => void;
  showToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  photo: initialPhoto,
  allPhotos,
  onClose,
  onDelete,
  onReplace,
  showToast
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const idx = allPhotos.findIndex((p) => p.url === initialPhoto.url || p.fileId === initialPhoto.fileId);
    return idx >= 0 ? idx : 0;
  });

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const currentPhoto = allPhotos[currentIndex] || initialPhoto;
  const directUrl = formatDriveDirectUrl(currentPhoto.url);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.3, 2.5));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.3, 0.7));
  const handleResetZoom = () => setZoomLevel(1);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : allPhotos.length - 1));
    handleResetZoom();
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < allPhotos.length - 1 ? prev + 1 : 0));
    handleResetZoom();
  };

  const handleReplaceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      const base64 = await fileToBase64(file);
      const replacedPhoto: ActivityPhoto = {
        url: base64,
        fileId: 'replaced_' + Date.now(),
        name: file.name,
        uploadedAt: new Date().toLocaleString('th-TH')
      };

      if (onReplace) {
        onReplace(replacedPhoto);
      }
      showToast('แทนที่รูปภาพสำเร็จ', `อัปโหลด ${file.name} เข้ามาแทนที่รูปเดิมแล้ว`, 'success');
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถเปลี่ยนรูปภาพได้', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
      {/* Top Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-10">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm drop-shadow-md">
            {currentPhoto.name || 'ภาพกิจกรรมอาหารกลางวัน'}
          </span>
          {allPhotos.length > 1 && (
            <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
              {currentIndex + 1} / {allPhotos.length}
            </span>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="ย่อ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="text-xs px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono"
            title="รีเซ็ตขนาด"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="ขยาย"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Admin: Replace Image */}
          {onReplace && (
            <label className="p-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer transition-colors flex items-center gap-1 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">เปลี่ยนรูป</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleReplaceUpload}
                className="hidden"
              />
            </label>
          )}

          {/* Admin: Delete Image */}
          {onDelete && (
            <button
              onClick={() => {
                if (window.confirm('คุณต้องการลบรูปภาพนี้ใช่หรือไม่?')) {
                  onDelete();
                  onClose();
                }
              }}
              className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1 text-xs"
              title="ลบรูปภาพนี้"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ลบรูป</span>
            </button>
          )}

          {/* Close button */}
          <button
            id="btn-close-lightbox"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white ml-2 transition-colors"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {allPhotos.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-xs transition-all z-10"
            title="รูปก่อนหน้า"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-xs transition-all z-10"
            title="รูปถัดไป"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Image Stage */}
      <div className="w-full h-full flex items-center justify-center p-8 overflow-hidden">
        <img
          src={directUrl}
          alt={currentPhoto.name || 'อาหารกลางวัน'}
          style={{ transform: `scale(${zoomLevel})` }}
          className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl transition-transform duration-200"
          onError={(e) => {
            (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL;
          }}
        />
      </div>

      {/* Bottom Metadata Info */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row items-center justify-between text-xs text-white/70 bg-black/40 px-4 py-2 rounded-xl backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-3.5 h-3.5 text-orange-400" />
          <span>โฟลเดอร์ Google Drive: <span className="font-mono text-orange-300">13hIUaTSAcZgA_smhKD6PSjuXwkr4ZsiI</span></span>
        </div>
        <div className="mt-1 sm:mt-0 font-mono text-[11px]">
          Direct Link: {directUrl.startsWith('https://lh3.googleusercontent.com') ? 'lh3.googleusercontent.com/d/...' : 'Local Preview'}
        </div>
      </div>
    </div>
  );
};
