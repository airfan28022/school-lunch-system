import React from 'react';
import { 
  Calculator, 
  CalendarDays, 
  Printer, 
  Settings 
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'tax' | 'planner' | 'report' | 'settings' | 'repository';
  onTabChange: (tab: 'tax' | 'planner' | 'report' | 'settings' | 'repository') => void;
}

export const MOBILE_NAV_ITEMS = [
  {
    id: 'tax' as const,
    label: 'จัดการภาษี',
    icon: Calculator,
    badge: '1%'
  },
  {
    id: 'planner' as const,
    label: 'จัดการเมนู',
    icon: CalendarDays,
    badge: null
  },
  {
    id: 'report' as const,
    label: 'พิมพ์รายงาน',
    icon: Printer,
    badge: null
  },
  {
    id: 'settings' as const,
    label: 'ตั้งค่า',
    icon: Settings,
    badge: null
  }
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange
}) => {
  return (
    <nav
      id="mobile-bottom-navigation"
      aria-label="เมนูหลักสำหรับอุปกรณ์พกพา"
      className="no-print md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] select-none pb-[max(env(safe-area-inset-bottom,0px),0.25rem)]"
    >
      <div className="grid grid-cols-4 items-center h-15 max-w-lg mx-auto px-1">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === 'settings' && activeTab === 'repository');

          return (
            <button
              key={item.id}
              id={`mobile-bottom-nav-${item.id}`}
              type="button"
              onClick={() => onTabChange(item.id)}
              className="flex flex-col items-center justify-center h-full py-1 relative group cursor-pointer transition-transform active:scale-95"
            >
              {/* Active top line accent */}
              {isActive && (
                <span className="absolute top-0 inset-x-3 h-0.75 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 rounded-b-full shadow-xs" />
              )}

              {/* Icon Container with Pill highlight when active */}
              <div
                className={`w-11 h-7 rounded-full flex items-center justify-center transition-all duration-150 relative ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 font-black shadow-xs scale-105'
                    : 'text-slate-500 group-hover:text-slate-800 group-hover:bg-slate-100/70'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {item.badge && !isActive && (
                  <span className="absolute -top-1 -right-1 px-1 py-0.2 text-[8px] font-black rounded-full bg-amber-500 text-slate-950 border border-white">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[11px] mt-0.5 truncate max-w-[76px] leading-tight transition-colors ${
                  isActive
                    ? 'text-amber-950 font-black'
                    : 'text-slate-500 font-semibold group-hover:text-slate-700'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
