import React from 'react';
import { SchoolSettings } from '../types';
import { FALLBACK_IMAGE_URL } from '../services/api';
import { 
  Settings, 
  LogOut,
  User
} from 'lucide-react';

interface HeaderProps {
  settings: SchoolSettings;
  activeTab: 'repository' | 'planner' | 'report' | 'tax' | 'settings';
  onTabChange: (tab: 'repository' | 'planner' | 'report' | 'tax' | 'settings') => void;
  isGasConnected?: boolean;
  isSyncing?: boolean;
  isRealtimeConnected?: boolean;
  onManualSync?: () => void;
  onLogout?: () => void;
  username?: string;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  activeTab,
  onTabChange,
  onLogout,
  username = 'Admin'
}) => {
  return (
    <header className="no-print bg-white shadow-xs sticky top-0 z-40">
      {/* Top Banner: School Section - Ultra-compact on mobile to maximize content area */}
      <div className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-300 border-b border-amber-300/80">
        <div className="max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 py-1 sm:py-2">
          <div className="flex flex-row items-center justify-between gap-2">
            
            {/* School Brand & Logo */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="relative w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl overflow-hidden bg-white p-0.5 border border-amber-400/90 shrink-0 shadow-2xs flex items-center justify-center">
                <img
                  src={settings.logoUrl || FALLBACK_IMAGE_URL}
                  alt="ตราสัญลักษณ์โรงเรียน"
                  className="w-full h-full object-cover rounded-md sm:rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL;
                  }}
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-lg font-extrabold text-slate-900 leading-tight truncate">
                  {settings.schoolName || 'ระบบบริหารจัดการอาหารกลางวันโรงเรียน'}
                </h1>
                {/* Department: Hidden on mobile to save vertical space, visible on tablet/desktop */}
                <p className="hidden sm:block text-xs font-semibold text-slate-800 line-clamp-1">
                  {settings.department || 'สังกัดสำนักการศึกษา'}
                </p>
              </div>
            </div>

            {/* Top-Right Settings & User Controls */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">


              {/* Top-Right Settings Icon */}
              <button
                id="btn-nav-settings"
                onClick={() => onTabChange('settings')}
                title="ตั้งค่าระบบ (ข้อมูลโรงเรียนและคลังเมนูอาหาร)"
                aria-label="ตั้งค่าระบบ"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs font-semibold text-xs ${
                  activeTab === 'settings'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white/90 hover:bg-white text-slate-800 hover:text-amber-900 border border-amber-400/80'
                }`}
              >
                <Settings className={`w-4 h-4 ${activeTab === 'settings' ? 'text-amber-400 animate-spin-slow' : 'text-slate-700'}`} />
                <span className="hidden sm:inline font-bold">ตั้งค่า</span>
              </button>

              {/* User Profile & Logout Button */}
              {onLogout && (
                <button
                  id="btn-logout"
                  onClick={onLogout}
                  title={`ออกจากระบบ (${username})`}
                  aria-label="ออกจากระบบ"
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-white/90 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-amber-400/80 hover:border-rose-300 shadow-2xs transition-all cursor-pointer text-xs font-semibold"
                >
                  <User className="w-3.5 h-3.5 text-amber-700 hidden sm:inline" />
                  <span className="hidden lg:inline font-bold text-slate-800">{username}</span>
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span className="text-[11px] text-rose-600 font-bold">ออก</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

