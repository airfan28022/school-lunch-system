import React from 'react';
import { ToastNotification } from '../types';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationToastProps {
  notifications: ToastNotification[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notifications,
  onDismiss
}) => {
  return (
    <div 
      id="toast-notification-container"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      <AnimatePresence>
        {notifications.map((item) => {
          let bgColor = 'bg-white border-slate-200 text-slate-800 shadow-xl';
          let icon = <Info className="w-5 h-5 text-blue-500 shrink-0" />;

          if (item.type === 'success') {
            bgColor = 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-emerald-100/50 shadow-lg';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
          } else if (item.type === 'warning') {
            bgColor = 'bg-amber-50 border-amber-300 text-amber-950 shadow-amber-100/50 shadow-lg';
            icon = <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
          } else if (item.type === 'error') {
            bgColor = 'bg-rose-50 border-rose-300 text-rose-950 shadow-rose-100/50 shadow-lg';
            icon = <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />;
          }

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto p-4 rounded-xl border flex items-start gap-3 relative ${bgColor}`}
            >
              <div className="mt-0.5">{icon}</div>
              <div className="flex-1 pr-4">
                <h4 className="text-sm font-semibold leading-tight">{item.title}</h4>
                {item.message && (
                  <p className="text-xs mt-1 text-slate-600 leading-relaxed font-normal">{item.message}</p>
                )}
              </div>
              <button
                id={`btn-dismiss-toast-${item.id}`}
                onClick={() => onDismiss(item.id)}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 transition-colors p-1"
                aria-label="ปิดการแจ้งเตือน"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
