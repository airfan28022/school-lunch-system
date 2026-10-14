import { 
  Calculator, 
  CalendarDays, 
  Printer, 
  Settings,
  ShieldCheck,
  ChevronRight,
  LogOut,
  FileSpreadsheet
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'planner' | 'repository' | 'report' | 'tax' | 'settings';
  onTabChange: (tab: 'planner' | 'repository' | 'report' | 'tax' | 'settings') => void;
  onLogout?: () => void;
  username?: string;
  spreadsheetUrl?: string;
}

export const SIDEBAR_NAV_ITEMS = [
  {
    id: 'tax' as const,
    label: 'จัดการภาษี',
    subtitle: 'หัก ณ ที่จ่าย 1%',
    icon: Calculator,
    badge: 'ใหม่'
  },
  {
    id: 'planner' as const,
    label: 'จัดการเมนูประจำวัน',
    subtitle: 'บันทึกอาหารและภาพกิจกรรม',
    icon: CalendarDays,
    badge: null
  },
  {
    id: 'report' as const,
    label: 'พิมพ์รายงาน',
    subtitle: 'พิมพ์บันทึกข้อความและเมนู',
    icon: Printer,
    badge: null
  }
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onLogout,
  username = 'Admin',
  spreadsheetUrl
}) => {
  return (
    <aside 
      aria-label="เมนูหลักด้านซ้าย"
      className="hidden md:flex flex-col justify-between w-64 lg:w-72 shrink-0 bg-white border-r border-slate-200/90 sticky top-[57px] sm:top-[61px] h-[calc(100vh-61px)] p-4 self-start z-30 select-none shadow-xs"
    >
      {/* Top: Menu Items Stacked Vertically */}
      <div className="space-y-4">
        <div className="px-2 pt-1 pb-1 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-black tracking-wider uppercase text-slate-400">
            เมนูการทำงาน
          </span>
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            3 เมนูหลัก
          </span>
        </div>

        {/* Navigation buttons arranged vertically long down the left */}
        <nav className="space-y-2">
          {SIDEBAR_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => onTabChange(item.id)}
                className={`w-full group flex items-center justify-between p-3 rounded-2xl text-left transition-all duration-150 cursor-pointer border ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black shadow-md border-amber-500 scale-[1.01]'
                    : 'bg-white hover:bg-amber-50/70 text-slate-700 hover:text-amber-950 border-slate-100 hover:border-amber-200 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                      isActive
                        ? 'bg-slate-950 text-amber-300 shadow-xs'
                        : 'bg-slate-100 group-hover:bg-amber-100 text-slate-600 group-hover:text-amber-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black truncate leading-tight">
                      {item.label}
                    </div>
                    <div
                      className={`text-[11px] truncate mt-0.5 font-medium ${
                        isActive ? 'text-slate-900/80' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 ml-2">
                  {item.badge && !isActive && (
                    <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${
                      isActive ? 'text-slate-950 translate-x-0.5' : 'text-slate-300 group-hover:text-amber-700'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Settings Shortcut, Sheets Link & Logout */}
      <div className="pt-3 border-t border-slate-100 space-y-1.5">
        <button
          type="button"
          onClick={() => onTabChange('settings')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Settings className="w-4 h-4 text-slate-500" />
          <span className="flex-1 text-left">ตั้งค่าระบบและคลังเมนู</span>
        </button>

        {spreadsheetUrl && (
          <a
            href={spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="เปิด Google Sheets ฐานข้อมูลกลาง"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="flex-1 text-left">เปิด Google Sheets</span>
          </a>
        )}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title={`ออกจากระบบ (${username})`}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span className="flex-1 text-left">ออกจากระบบ ({username})</span>
          </button>
        )}

        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-[10px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="line-clamp-1">บันทึกอัตโนมัติ & ซิงค์ปลอดภัย</span>
        </div>
      </div>
    </aside>
  );
};
