import React from 'react';
import { AlertTriangle, Trash2, HelpCircle, RefreshCw } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  type = 'danger',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-3 ${
          type === 'danger' 
            ? 'bg-rose-50 text-rose-600' 
            : type === 'warning'
            ? 'bg-amber-50 text-amber-600'
            : 'bg-blue-50 text-blue-600'
        }`}>
          {type === 'danger' && <Trash2 className="w-5 h-5" />}
          {type === 'warning' && <RefreshCw className="w-5 h-5" />}
          {type === 'info' && <HelpCircle className="w-5 h-5" />}
        </div>
        <h3 className="text-sm font-bold text-center text-slate-900">
          {title}
        </h3>
        <p className="text-xs text-center text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line">
          {message}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            className={`flex-1 py-2 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs ${
              type === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
