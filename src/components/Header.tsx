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
  X
} from 'lucide-react';

interface HeaderProps {
  settings: SchoolSettings;
  activeTab: 'repository' | 'planner' | 'report' | 'settings';
  onTabChange: (tab: 'repository' | 'planner' | 'report' | 'settings') => void;
  isGasConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  activeTab,
  onTabChange,
  isGasConnected
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
    <header className="no-print bg-white border-b border-orange-100 shadow-xs sticky top-0 z-40">
      {/* Top Banner with School Name, Logo & Live Clock & Top-Right Settings */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* School Brand & Logo */}
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-orange-100 border border-orange-200 shrink-0 shadow-xs flex items-center justify-center">
              <img
                src={settings.logoUrl || FALLBACK_IMAGE_URL}
                alt="ตราสัญลักษณ์โรงเรียน"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL;
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-800">
                  <School className="w-3 h-3 mr-1" />
                  ระบบโภชนาการโรงเรียน
                </span>
                {isGasConnected ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                    <Cloud className="w-3 h-3 mr-1" />
                    Google Sheets & Drive
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                    <Database className="w-3 h-3 mr-1" />
                    Local Storage
                  </span>
                )}
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {settings.schoolName || 'ระบบบริหารจัดการอาหารกลางวันโรงเรียน'}
              </h1>
              <p className="text-xs text-slate-500 line-clamp-1">
                {settings.department || 'สังกัดสำนักการศึกษา'} &bull; ผู้รับผิดชอบ: <span className="text-slate-700 font-medium">{settings.managerName || 'หัวหน้างานโภชนาการ'}</span>
              </p>
            </div>
          </div>

          {/* Real-time Clock, Settings Icon Only & Mobile Hamburger */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            {/* Live Clock Card */}
            <div 
              id="header-live-clock"
              className="flex items-center gap-2 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 px-3 py-1.5 rounded-xl shadow-2xs"
            >
              <Clock className="w-4 h-4 text-orange-600 shrink-0 animate-pulse" />
              <div className="text-right">
                <div className="text-[11px] font-medium text-slate-700 tracking-tight">
                  {dateStr}
                </div>
                <div className="text-xs font-mono font-bold text-orange-700 leading-none">
                  {timeStr}
                </div>
              </div>
            </div>

            {/* Top-Right Settings Icon Only */}
            <button
              id="btn-nav-settings"
              onClick={() => onTabChange('settings')}
              title="ตั้งค่าระบบ"
              aria-label="ตั้งค่าระบบ"
              className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                activeTab === 'settings'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-orange-600 hover:bg-orange-100/70 border border-slate-200/80'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Mobile menu toggle */}
            <button
              id="btn-mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-orange-50 border border-slate-200"
              aria-label="เมนูหลัก"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar - Centered 3 Main Menus */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-amber-600 text-white shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="hidden md:flex items-center justify-center py-1.5">
            {/* Center: Exactly 3 Main Menus */}
            <nav className="flex items-center justify-center gap-2 sm:gap-4">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer shadow-2xs ${
                      isActive
                        ? 'bg-white text-orange-700 shadow-md transform scale-[1.02]'
                        : 'text-white/95 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-white'}`} />
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
        <div className="md:hidden bg-white border-b border-orange-200 px-4 py-3 space-y-1.5 shadow-lg animate-fadeIn">
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
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-orange-700 border border-orange-200'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-slate-500'}`} />
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
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === 'settings'
                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className={`w-4 h-4 ${activeTab === 'settings' ? 'text-orange-600' : 'text-slate-500'}`} />
              <span>ตั้งค่าระบบ</span>
            </div>
            <span className="text-[11px] text-slate-400 font-normal">Google Drive / Sheets</span>
          </button>
        </div>
      )}
    </header>
  );
};
