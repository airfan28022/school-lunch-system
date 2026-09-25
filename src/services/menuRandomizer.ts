import { DailyMenuEntry, MenuItem, MenuCategory } from '../types';
import { INITIAL_MENU_BANK } from '../data/initialData';

const toDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Monthly Menu Randomizer Engine (ระบบสุ่มจัดอาหารกลางวันตามหลักโภชนาการโรงเรียน)
 * - ความหลากหลายสูง ป้องกันความเบื่อ: แต่ละสัปดาห์ในเดือนมีเมนูที่หลากหลายไม่ซ้ำกัน
 * - เชื่อมโยงกับเดือนที่แล้ว: ตรวจสอบเมนูเดือนก่อนหน้า ลดการสุ่มเมนูที่เพิ่งกินบ่อยในเดือนก่อน
 * - วันพุธ: อาหารจานเดียว + ขนมหวานหรือผลไม้ (หมุนเวียนไม่ซ้ำกันทุกวันพุธ)
 * - วันจันทร์, อังคาร, พฤหัสบดี, ศุกร์: ข้าว + กับข้าวเผ็ด + กับข้าวไม่เผ็ด + ขนมหวานหรือผลไม้
 * - ของหวาน: สลับ 2 วันต่อสัปดาห์ กับ 1 วันต่อสัปดาห์ วันที่เหลือเป็นผลไม้สด
 */
export function generateMonthlyMenu(
  randomMonth: number,
  randomYear: number,
  menuBank: MenuItem[],
  dailyMenus: DailyMenuEntry[] = []
): DailyMenuEntry[] {
  const isDessertName = (name: string) => {
    const n = name.toLowerCase();
    return (
      n.includes('บัวลอย') ||
      n.includes('กล้วยบวชชี') ||
      n.includes('เฉาก๊วย') ||
      n.includes('หวาน') ||
      n.includes('ถั่วเขียว') ||
      n.includes('วุ้น') ||
      n.includes('แกงบวด') ||
      n.includes('ทองหยอด') ||
      n.includes('ฟักทองแกงบวด') ||
      n.includes('ทับทิมกรอบ') ||
      n.includes('ไอศกรีม') ||
      n.includes('ขนม')
    );
  };

  const getPool = (category: MenuCategory): MenuItem[] => {
    const fromBank = menuBank.filter((m) => m.category === category);
    if (fromBank.length > 0) return fromBank;
    return INITIAL_MENU_BANK.filter((m) => m.category === category);
  };

  const riceItems = getPool('ข้าว');
  const singleDishItems = getPool('อาหารจานเดียว');
  const nonSpicyItems = getPool('อาหารไม่เผ็ด');
  const spicyItems = getPool('อาหารเผ็ด');

  const fruitBank = menuBank.filter(
    (m) => m.category === 'ผลไม้' || (m.category === 'ผลไม้-ของหวาน' && !isDessertName(m.menuName))
  );
  const fruitItems = fruitBank.length > 0 ? fruitBank : INITIAL_MENU_BANK.filter((m) => m.category === 'ผลไม้');

  const dessertBank = menuBank.filter(
    (m) => m.category === 'ของหวาน' || (m.category === 'ผลไม้-ของหวาน' && isDessertName(m.menuName))
  );
  const dessertItems =
    dessertBank.length > 0 ? dessertBank : INITIAL_MENU_BANK.filter((m) => m.category === 'ของหวาน');

  // ดึงข้อมูลเมนูของ "เดือนที่แล้ว" เพื่อนำมาคำนวณความหลากหลาย ให้แตกต่างจากเดือนก่อน
  const prevYear = randomMonth === 1 ? randomYear - 1 : randomYear;
  const prevMonth = randomMonth === 1 ? 12 : randomMonth - 1;
  const prevMonthPrefix = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
  const prevMonthEntries = dailyMenus.filter((m) => m.date.startsWith(prevMonthPrefix));

  const prevMonthDishCounts = new Map<string, number>();
  const prevWedSingleDishes = new Set<string>();

  prevMonthEntries.forEach((entry) => {
    const parts = entry.date.split('-').map(Number);
    const dayOfWeek = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
    if (dayOfWeek === 3 && entry.singleDish) {
      prevWedSingleDishes.add(entry.singleDish.trim());
    }
    [entry.rice, entry.singleDish, entry.nonSpicy, entry.spicy, entry.dessert].forEach((dish) => {
      if (dish && dish.trim()) {
        const clean = dish.trim();
        prevMonthDishCounts.set(clean, (prevMonthDishCounts.get(clean) || 0) + 1);
      }
    });
  });

  // รวบรวมวันทำการเรียน (จันทร์-ศุกร์) ทั้งหมดในเดือนที่เลือก แยกเป็นสัปดาห์
  const daysInMonth = new Date(randomYear, randomMonth, 0).getDate();
  const schoolDaysByWeek: { weekNumber: number; dates: Date[] }[] = [];

  let currentWeek: Date[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(randomYear, randomMonth - 1, day);
    const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat

    // เฉพาะวันจันทร์ (1) ถึง วันศุกร์ (5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      if (dayOfWeek === 1 && currentWeek.length > 0) {
        schoolDaysByWeek.push({ weekNumber: schoolDaysByWeek.length + 1, dates: currentWeek });
        currentWeek = [];
      }
      currentWeek.push(d);
    }
  }
  if (currentWeek.length > 0) {
    schoolDaysByWeek.push({ weekNumber: schoolDaysByWeek.length + 1, dates: currentWeek });
  }

  // ระบบติดตามความถี่และระยะห่างของเมนู
  const usedInMonthCount = new Map<string, number>();
  const lastUsedSchoolDayIndex = new Map<string, number>();
  const wedSingleDishesInMonth = new Set<string>();
  let totalSchoolDaysCount = 0;

  const pickDiverseItem = (
    pool: MenuItem[],
    currentWeekDishes: Set<string>,
    options?: {
      isWednesdaySingleDish?: boolean;
      isWeek1?: boolean;
      schoolDayIndex?: number;
    }
  ): string => {
    if (!pool || pool.length === 0) return '';
    const dayIdx = options?.schoolDayIndex ?? totalSchoolDaysCount;
    const isWed = Boolean(options?.isWednesdaySingleDish);
    const isWk1 = Boolean(options?.isWeek1);

    let candidates = pool.filter((item) => !currentWeekDishes.has(item.menuName));
    if (candidates.length === 0) {
      candidates = pool;
    }

    if (isWed && wedSingleDishesInMonth.size < pool.length) {
      const unusedInMonth = candidates.filter((item) => !wedSingleDishesInMonth.has(item.menuName));
      if (unusedInMonth.length > 0) {
        candidates = unusedInMonth;
      }
    }

    const scored = candidates.map((item) => {
      const name = item.menuName;
      let penalty = 0;

      const monthFreq = usedInMonthCount.get(name) || 0;
      penalty += monthFreq * 25;

      if (lastUsedSchoolDayIndex.has(name)) {
        const daysAgo = dayIdx - (lastUsedSchoolDayIndex.get(name) || 0);
        if (daysAgo <= 2) penalty += 60;
        else if (daysAgo <= 5) penalty += 25;
        else if (daysAgo <= 9) penalty += 10;
      }

      const prevCount = prevMonthDishCounts.get(name) || 0;
      penalty += prevCount * 4;
      if (isWk1 && prevCount > 0) {
        penalty += prevCount * 8;
      }

      if (isWed && prevWedSingleDishes.has(name)) {
        penalty += 20;
      }

      penalty += Math.random() * 3;
      return { name, penalty };
    });

    scored.sort((a, b) => a.penalty - b.penalty);

    const minPenalty = scored[0].penalty;
    const topCandidates = scored.filter((s) => s.penalty <= minPenalty + 3.5);
    const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)].name;

    usedInMonthCount.set(chosen, (usedInMonthCount.get(chosen) || 0) + 1);
    lastUsedSchoolDayIndex.set(chosen, dayIdx);
    currentWeekDishes.add(chosen);
    if (isWed) {
      wedSingleDishesInMonth.add(chosen);
    }

    return chosen;
  };

  const generatedEntries: DailyMenuEntry[] = [];

  schoolDaysByWeek.forEach((week, weekIdx) => {
    const days = week.dates;
    const weekDishes = new Set<string>();
    const isWeek1 = weekIdx === 0;

    const targetDessertCount = weekIdx % 2 === 0 ? 2 : 1;
    const dessertIndices = new Set<number>();
    const wedIdx = days.findIndex((d) => d.getDay() === 3);

    if (targetDessertCount === 2) {
      if (wedIdx !== -1) {
        dessertIndices.add(wedIdx);
        const otherDays = days.map((_, i) => i).filter((i) => i !== wedIdx);
        const friIdx = days.findIndex((d) => d.getDay() === 5);
        const tueIdx = days.findIndex((d) => d.getDay() === 2);
        if (friIdx !== -1 && otherDays.includes(friIdx)) dessertIndices.add(friIdx);
        else if (tueIdx !== -1 && otherDays.includes(tueIdx)) dessertIndices.add(tueIdx);
        else if (otherDays.length > 0) dessertIndices.add(otherDays[0]);
      } else {
        if (days.length > 0) dessertIndices.add(0);
        if (days.length > 1) dessertIndices.add(days.length - 1);
      }
    } else {
      if (wedIdx !== -1) {
        const isWedDessert = weekIdx % 4 !== 3;
        if (isWedDessert) dessertIndices.add(wedIdx);
        else {
          const friIdx = days.findIndex((d) => d.getDay() === 5);
          const tueIdx = days.findIndex((d) => d.getDay() === 2);
          if (friIdx !== -1) dessertIndices.add(friIdx);
          else if (tueIdx !== -1) dessertIndices.add(tueIdx);
          else dessertIndices.add(0);
        }
      } else {
        if (days.length > 0) dessertIndices.add(0);
      }
    }

    days.forEach((dateObj, idx) => {
      totalSchoolDaysCount++;
      const dateStr = toDateString(dateObj);
      const dayOfWeek = dateObj.getDay();
      const isWednesday = dayOfWeek === 3;

      let itemRice = '';
      let itemSingleDish = '';
      let itemNonSpicy = '';
      let itemSpicy = '';
      let itemSweet = '';

      const isDessertToday = dessertIndices.has(idx);
      const sweetPool = isDessertToday
        ? dessertItems.length > 0
          ? dessertItems
          : fruitItems
        : fruitItems.length > 0
        ? fruitItems
        : dessertItems;

      itemSweet = pickDiverseItem(sweetPool, weekDishes, {
        schoolDayIndex: totalSchoolDaysCount,
        isWeek1
      });

      if (isWednesday) {
        itemSingleDish = pickDiverseItem(singleDishItems, weekDishes, {
          isWednesdaySingleDish: true,
          schoolDayIndex: totalSchoolDaysCount,
          isWeek1
        });
        itemRice = '';
        itemNonSpicy = '';
        itemSpicy = '';
      } else {
        itemRice = pickDiverseItem(riceItems, weekDishes, {
          schoolDayIndex: totalSchoolDaysCount,
          isWeek1
        });
        itemNonSpicy = pickDiverseItem(nonSpicyItems, weekDishes, {
          schoolDayIndex: totalSchoolDaysCount,
          isWeek1
        });
        itemSpicy = pickDiverseItem(spicyItems, weekDishes, {
          schoolDayIndex: totalSchoolDaysCount,
          isWeek1
        });
      }

      generatedEntries.push({
        date: dateStr,
        rice: itemRice,
        singleDish: itemSingleDish,
        nonSpicy: itemNonSpicy,
        spicy: itemSpicy,
        dessert: itemSweet,
        note: '',
        photos: []
      });
    });
  });

  return generatedEntries;
}
