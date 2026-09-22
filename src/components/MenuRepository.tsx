import React, { useState, useMemo } from 'react';
import { MenuItem, MenuCategory, MENU_CATEGORIES } from '../types';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Sparkles, 
  ChefHat,
  Filter,
  CheckCircle2,
  UtensilsCrossed
} from 'lucide-react';

interface MenuRepositoryProps {
  menuBank: MenuItem[];
  onAddMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void> | void;
  onUpdateMenuItem: (item: MenuItem) => Promise<void> | void;
  onDeleteMenuItem: (id: string) => Promise<void> | void;
  onSeedPresets: () => void;
}

// 5 Strict Categories
const STRICT_CATEGORIES: MenuCategory[] = [
  'ข้าว',
  'อาหารจานเดียว',
  'อาหารไม่เผ็ด',
  'อาหารเผ็ด',
  'ผลไม้-ของหวาน'
];

// Aesthetic category card themes
const CATEGORY_THEMES: Record<MenuCategory, {
  headerBg: string;
  headerBorder: string;
  headerText: string;
  badgeBg: string;
  badgeText: string;
  cardBorder: string;
  hoverBg: string;
  addBtnHover: string;
}> = {
  'ข้าว': {
    headerBg: 'bg-amber-500/10',
    headerBorder: 'border-amber-200',
    headerText: 'text-amber-900',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    cardBorder: 'border-amber-200/80',
    hoverBg: 'hover:bg-amber-50/80',
    addBtnHover: 'hover:bg-amber-100 text-amber-700'
  },
  'อาหารจานเดียว': {
    headerBg: 'bg-orange-500/10',
    headerBorder: 'border-orange-200',
    headerText: 'text-orange-900',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800',
    cardBorder: 'border-orange-200/80',
    hoverBg: 'hover:bg-orange-50/80',
    addBtnHover: 'hover:bg-orange-100 text-orange-700'
  },
  'อาหารไม่เผ็ด': {
    headerBg: 'bg-emerald-500/10',
    headerBorder: 'border-emerald-200',
    headerText: 'text-emerald-900',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    cardBorder: 'border-emerald-200/80',
    hoverBg: 'hover:bg-emerald-50/80',
    addBtnHover: 'hover:bg-emerald-100 text-emerald-700'
  },
  'อาหารเผ็ด': {
    headerBg: 'bg-rose-500/10',
    headerBorder: 'border-rose-200',
    headerText: 'text-rose-900',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
    cardBorder: 'border-rose-200/80',
    hoverBg: 'hover:bg-rose-50/80',
    addBtnHover: 'hover:bg-rose-100 text-rose-700'
  },
  'ผลไม้-ของหวาน': {
    headerBg: 'bg-purple-500/10',
    headerBorder: 'border-purple-200',
    headerText: 'text-purple-900',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    cardBorder: 'border-purple-200/80',
    hoverBg: 'hover:bg-purple-50/80',
    addBtnHover: 'hover:bg-purple-100 text-purple-700'
  }
};

export const MenuRepository: React.FC<MenuRepositoryProps> = ({
  menuBank,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
  onSeedPresets
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<MenuCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quick inline add state per category
  const [addingCategory, setAddingCategory] = useState<MenuCategory | null>(null);
  const [quickMenuName, setQuickMenuName] = useState<string>('');

  // Global add modal/inline form state
  const [isGlobalAddOpen, setIsGlobalAddOpen] = useState<boolean>(false);
  const [globalAddName, setGlobalAddName] = useState<string>('');
  const [globalAddCategory, setGlobalAddCategory] = useState<MenuCategory>('อาหารไม่เผ็ด');

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  // Delete modal state
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);

  // Grouped items by strict categories
  const categorizedMenus = useMemo(() => {
    const result: Record<MenuCategory, MenuItem[]> = {
      'ข้าว': [],
      'อาหารจานเดียว': [],
      'อาหารไม่เผ็ด': [],
      'อาหารเผ็ด': [],
      'ผลไม้-ของหวาน': []
    };

    const cleanQuery = searchQuery.trim().toLowerCase();

    menuBank.forEach((item) => {
      if (result[item.category]) {
        const matchSearch = cleanQuery === '' || 
          item.menuName.toLowerCase().includes(cleanQuery) ||
          item.category.toLowerCase().includes(cleanQuery);
        
        if (matchSearch) {
          result[item.category].push(item);
        }
      }
    });

    return result;
  }, [menuBank, searchQuery]);

  // Counts by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: menuBank.length };
    STRICT_CATEGORIES.forEach((cat) => {
      counts[cat] = menuBank.filter((m) => m.category === cat).length;
    });
    return counts;
  }, [menuBank]);

  // Handle Quick Add directly inside a category column
  const handleQuickAdd = async (category: MenuCategory) => {
    if (!quickMenuName.trim()) return;

    await onAddMenuItem({
      category: category,
      menuName: quickMenuName.trim()
    });

    setQuickMenuName('');
    setAddingCategory(null);
  };

  // Handle Global Add
  const handleGlobalAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalAddName.trim()) return;

    await onAddMenuItem({
      category: globalAddCategory,
      menuName: globalAddName.trim()
    });

    setGlobalAddName('');
    setIsGlobalAddOpen(false);
  };

  // Handle Start Edit
  const handleStartEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setEditingName(item.menuName);
  };

  // Handle Save Edit
  const handleSaveEdit = async (item: MenuItem) => {
    if (!editingName.trim()) return;

    await onUpdateMenuItem({
      ...item,
      menuName: editingName.trim()
    });

    setEditingId(null);
    setEditingName('');
  };

  // Categories to render based on filter
  const displayedCategories = useMemo(() => {
    if (activeCategoryFilter === 'ALL') {
      return STRICT_CATEGORIES;
    }
    return [activeCategoryFilter];
  }, [activeCategoryFilter]);

  return (
    <div className="space-y-4">
      {/* Top Minimalist Header & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
          
          {/* Title & Quick Stats */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  คลังเมนูอาหาร
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {menuBank.length} รายการ
                </span>
              </div>
              <p className="text-xs text-slate-500">
                จัดหมวดหมู่ 5 ประเภทหลัก รายการกระชับ สะอาดตา และค้นหาง่าย
              </p>
            </div>
          </div>

          {/* Search & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[200px] sm:min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="input-search-menu-bank"
                type="text"
                placeholder="ค้นหาชื่อเมนู..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Add New Button */}
            <button
              id="btn-open-add-menu"
              onClick={() => setIsGlobalAddOpen(true)}
              className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มเมนู</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
          <button
            id="pill-cat-all"
            onClick={() => setActiveCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeCategoryFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({categoryCounts.ALL || 0})
          </button>

          {STRICT_CATEGORIES.map((catName) => {
            const isSelected = activeCategoryFilter === catName;
            const count = categoryCounts[catName] || 0;
            const theme = CATEGORY_THEMES[catName];

            return (
              <button
                key={catName}
                id={`pill-cat-${catName}`}
                onClick={() => setActiveCategoryFilter(catName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-orange-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{catName}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-orange-700 text-white' : theme.badgeBg + ' ' + theme.badgeText
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Add Form Modal */}
      {isGlobalAddOpen && (
        <form
          onSubmit={handleGlobalAdd}
          className="bg-orange-50/90 border border-orange-300 rounded-2xl p-4 shadow-sm animate-fadeIn"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-orange-950 flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-orange-600" />
              เพิ่มรายการอาหารใหม่
            </h3>
            <button
              type="button"
              onClick={() => setIsGlobalAddOpen(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                หมวดหมู่อาหาร <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-global-menu-category"
                value={globalAddCategory}
                onChange={(e) => setGlobalAddCategory(e.target.value as MenuCategory)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500"
              >
                {STRICT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                ชื่อรายการอาหาร <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="input-global-menu-name"
                  type="text"
                  placeholder="เช่น ต้มจืดเต้าหู้หมูสับสาหร่ายวากาเมะ"
                  value={globalAddName}
                  onChange={(e) => setGlobalAddName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                  autoFocus
                />
                <button
                  type="submit"
                  id="btn-save-global-menu"
                  disabled={!globalAddName.trim()}
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  บันทึก
                </button>
                <button
                  type="button"
                  onClick={() => setIsGlobalAddOpen(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Categorized Clean Columns View */}
      <div className={`grid gap-3.5 items-start ${
        displayedCategories.length === 1 
          ? 'grid-cols-1 max-w-2xl mx-auto' 
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
      }`}>
        {displayedCategories.map((category) => {
          const items = categorizedMenus[category] || [];
          const theme = CATEGORY_THEMES[category];
          const isAddingHere = addingCategory === category;

          return (
            <div
              key={category}
              id={`category-column-${category}`}
              className={`bg-white rounded-2xl border ${theme.cardBorder} shadow-xs flex flex-col overflow-hidden transition-all duration-150`}
            >
              {/* Category Column Header */}
              <div className={`px-3.5 py-2.5 ${theme.headerBg} border-b ${theme.headerBorder} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <h3 className={`text-xs font-bold ${theme.headerText} tracking-tight`}>
                    {category}
                  </h3>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-semibold ${theme.badgeBg} ${theme.badgeText}`}>
                    {items.length}
                  </span>
                </div>

                {/* Quick Add Button */}
                <button
                  id={`btn-quick-add-${category}`}
                  onClick={() => {
                    if (isAddingHere) {
                      setAddingCategory(null);
                      setQuickMenuName('');
                    } else {
                      setAddingCategory(category);
                      setQuickMenuName('');
                    }
                  }}
                  title={`เพิ่มเมนูในหมวด ${category}`}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${theme.addBtnHover}`}
                >
                  {isAddingHere ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* In-Column Quick Add Input */}
              {isAddingHere && (
                <div className="p-2 bg-slate-50 border-b border-slate-200 animate-fadeIn">
                  <div className="flex items-center gap-1.5">
                    <input
                      id={`input-quick-add-${category}`}
                      type="text"
                      placeholder={`พิมพ์ชื่อเมนู (${category})...`}
                      value={quickMenuName}
                      onChange={(e) => setQuickMenuName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickAdd(category);
                        } else if (e.key === 'Escape') {
                          setAddingCategory(null);
                        }
                      }}
                      className="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                      autoFocus
                    />
                    <button
                      onClick={() => handleQuickAdd(category)}
                      disabled={!quickMenuName.trim()}
                      className="p-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg cursor-pointer"
                      title="เพิ่มเมนู"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Items List (Minimalist, Compact Rows) */}
              <div className="p-2 space-y-1 max-h-[520px] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <p className="text-[11px]">ไม่มีรายการ</p>
                    <button
                      onClick={() => setAddingCategory(category)}
                      className="mt-1 text-[11px] text-orange-600 hover:underline font-medium cursor-pointer"
                    >
                      + เพิ่มเมนูแรก
                    </button>
                  </div>
                ) : (
                  items.map((item, index) => {
                    const isEditing = editingId === item.id;

                    return (
                      <div
                        key={item.id}
                        id={`menu-item-${item.id}`}
                        className={`group rounded-lg px-2 py-1.5 text-xs transition-all flex items-center justify-between border border-transparent ${
                          isEditing
                            ? 'bg-orange-50 border-orange-300'
                            : 'hover:bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                        {isEditing ? (
                          /* Inline Edit Mode */
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveEdit(item);
                                } else if (e.key === 'Escape') {
                                  setEditingId(null);
                                }
                              }}
                              className="flex-1 px-2 py-0.5 text-xs bg-white border border-orange-400 rounded focus:outline-hidden"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(item)}
                              disabled={!editingName.trim()}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                              title="บันทึก"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                              title="ยกเลิก"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          /* Compact Display Mode */
                          <>
                            <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1">
                              <span className="text-[10px] text-slate-400 font-mono shrink-0 w-4 text-right">
                                {index + 1}.
                              </span>
                              <span 
                                className="truncate text-slate-800 font-normal group-hover:text-slate-950"
                                title={item.menuName}
                              >
                                {item.menuName}
                              </span>
                            </div>

                            {/* Minimal Hover Action Icons */}
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                              <button
                                id={`btn-edit-${item.id}`}
                                onClick={() => handleStartEdit(item)}
                                className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded cursor-pointer"
                                title="แก้ไขชื่อเมนู"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                id={`btn-delete-${item.id}`}
                                onClick={() => setDeletingItem(item)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                title="ลบเมนู"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-scaleIn">
            <div className="w-11 h-11 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-center text-slate-900">
              ยืนยันการลบรายการอาหาร
            </h3>
            <p className="text-xs text-center text-slate-600 mt-1">
              คุณต้องการลบ "<span className="font-semibold text-slate-900">{deletingItem.menuName}</span>" ออกจากหมวด {deletingItem.category} ใช่หรือไม่?
            </p>
            <div className="mt-4 flex gap-2">
              <button
                id="btn-confirm-delete-menu"
                onClick={async () => {
                  await onDeleteMenuItem(deletingItem.id);
                  setDeletingItem(null);
                }}
                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                ยืนยันการลบ
              </button>
              <button
                onClick={() => setDeletingItem(null)}
                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
