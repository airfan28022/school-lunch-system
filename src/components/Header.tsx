import React, { useState, useEffect } from 'react';
import { SchoolSettings } from '../types';
import { FALLBACK_IMAGE_URL } from '../services/api';
import { 
  UtensilsCrossed, 
  CalendarDays, 
  Printer, 
  Settings, 
  Clock, 
  School, 
  CheckCircle,
  Cloud,
  Database,
  Menu as MenuIcon,
  X,
  RefreshCw
} from 'lucide-react';

interface HeaderProps {
  settings: SchoolSettings;
  activeTab: 'repository' | 'planner' | 'report' | 'settings';
  onTabChange: (tab: 'repository' | 'planner' | 'report' | 'settings') => void;
  isGasConnected: boolean;
  isSyncing?: boolean;
  onManualSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  activeTab,
  onTabChange,
  isGasConnected,
  isSyncing = false,
  onManualSync
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Real-time live clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Thai Date & Time
  const formatThaiDateTime = (date: Date) => {
    const days = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    
    const dayName = days[date.getDay()];
    const dayNum = date.getDate();
    const monthName = months[date.getMonth()];
    const buddhistYear = date.getFullYear() + 543;
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return {
      dateStr: `${dayName}ที่ ${dayNum} ${monthName} พ.ศ. ${buddhistYear}`,
      timeStr: `${hours}:${minutes}:${seconds} น.`
    };
  };

  const { dateStr, timeStr } = formatThaiDateTime(currentTime);

  const mainNavItems = [
    {
      id: 'repository' as const,
      label: 'คลังเมนู',
      icon: UtensilsCrossed
    },
    {
      id: 'planner' as const,
      label: 'จัดการเมนูประจำวัน',
      icon: CalendarDays
    },
    {
      id: 'report' as const,
      label: 'พิมพ์รายงาน',
      icon: Printer
    }
  ];

  return (
    <header className="no-print bg-white shadow-xs sticky top-0 z-40">
      {/* Top Banner: School Section - Yellow Gradient & Narrower */}
      <div className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-300 border-b border-amber-300/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 sm:py-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            
            {/* School Brand & Logo */}
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-white p-0.5 border border-amber-400/90 shrink-0 shadow-2xs flex items-center justify-center">
                <img
                  src={settings.logoUrl || FALLBACK_IMAGE_URL}
                  alt="ตราสัญลักษณ์โรงเรียน"
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL;
                  }}
                />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                  {settings.schoolName || 'ระบบบริหารจัดการอาหารกลางวันโรงเรียน'}
                </h1>
                <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                  {settings.department || 'สังกัดสำนักการศึกษา'}
                </p>
              </div>
            </div>

            {/* Real-time Clock, Settings Icon & Mobile Hamburger */}
            <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-amber-300/60">
              {/* Live Clock Card */}
              <div 
                id="header-live-clock"
                className="flex items-center gap-2 bg-white/90 backdrop-blur-xs border border-amber-400/80 px-3 py-1 rounded-xl shadow-2xs"
              >
                <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0 animate-pulse" />
                <div className="text-right">
                  <div className="text-[11px] font-medium text-slate-700 tracking-tight">
                    {dateStr}
                  </div>
                  <div className="text-xs font-mono font-bold text-amber-900 leading-none">
                    {timeStr}
                  </div>
                </div>
              </div>

              {/* High-speed Realtime Sync Button & Badge */}
              <button
                id="btn-quick-sync"
                onClick={onManualSync}
                disabled={isSyncing}
                title={isSyncing ? 'กำลังซิงค์ข้อมูล...' : 'ซิงค์ข้อมูลทันที'}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-800 border border-amber-400/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer text-xs font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${isSyncing ? 'animate-spin text-amber-500' : ''}`} />
                <span className="hidden xl:inline text-[11px] text-slate-700">
                  {isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูล'}
                </span>
                <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`} />
              </button>

              {/* Top-Right Settings Icon */}
              <button
                id="btn-nav-settings"
                onClick={() => onTabChange('settings')}
                title="ตั้งค่าระบบ"
                aria-label="ตั้งค่าระบบ"
                className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-2xs ${
                  activeTab === 'settings'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white/90 hover:bg-white text-slate-800 hover:text-amber-900 border border-amber-400/80'
                }`}
              >
                <Settings className="w-4.5 h-4.5" />
              </button>

              {/* Mobile menu toggle */}
              <button
                id="btn-mobile-menu-toggle"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl bg-white/90 text-slate-800 hover:bg-white border border-amber-400/80 shadow-2xs"
                aria-label="เมนูหลัก"
              >
                {mobileMenuOpen ? <X className="w-4.5 h-4.5" /> : <MenuIcon className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar - White Bar with Larger Buttons */}
      <div className="bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="hidden md:flex items-center justify-center py-2">
            {/* Center: Main Menus with Larger Buttons */}
            <nav className="flex items-center justify-center gap-2 sm:gap-3">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center gap-2.5 px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md transform scale-[1.02] border border-amber-400/60'
                        : 'text-slate-700 hover:bg-amber-50 hover:text-amber-900 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-slate-950' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-2 shadow-lg animate-fadeIn">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-tab-${item.id}`}
                onClick={() => {
                  onTabChange(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                  isActive
                    ? 'bg-amber-100 text-amber-950 border border-amber-300'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-800' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            id="mobile-nav-tab-settings"
            onClick={() => {
              onTabChange('settings');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
              activeTab === 'settings'
                ? 'bg-amber-100 text-amber-950 border border-amber-300'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-amber-800' : 'text-slate-500'}`} />
              <span>ตั้งค่าระบบ</span>
            </div>
          </button>
        </div>
      )}
    </header>
  );
};
