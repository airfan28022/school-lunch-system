import { DailyMenuEntry, MenuItem, MenuCategory } from '../types';
import { INITIAL_MENU_BANK } from '../data/initialData';

const toDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Helper shuffle array using Fisher-Yates algorithm
 */
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Monthly Menu Randomizer Engine (ระบบสุ่มจัดอาหารกลางวันตามหลักโภชนาการโรงเรียน)
 * 1. ไม่ซ้ำกันในเดือนเดียวกัน: หมุนเวียนคลังเมนูไม่ให้เมนูกับข้าวซ้ำกันตลอดทั้งเดือน
 * 2. สุ่มแต่ละครั้งไม่ซ้ำเดิม: ตรวจสอบเมนูที่มีอยู่เดิมของเดือนนั้น เพื่อให้การกดสุ่มแต่ละครั้งได้เมนูใหม่ที่แตกต่างออกไปเสมอ
 * 3. วันพุธ: อาหารจานเดียว + ขนมหวานหรือผลไม้ (หมุนเวียนไม่ซ้ำกันทุกวันพุธ)
 * 4. วันจันทร์, อังคาร, พฤหัสบดี, ศุกร์: ข้าว + กับข้าวเผ็ด + กับข้าวไม่เผ็ด + ขนมหวานหรือผลไม้
 * 5. ของหวาน: สลับ 1-2 วันต่อสัปดาห์ วันที่เหลือเป็นผลไม้สด
 */
export function generateMonthlyMenu(
  randomMonth: number,
  randomYear: number,
  menuBank: MenuItem[],
  dailyMenus: DailyMenuEntry[] = []
): DailyMenuEntry[] {
  // รองรับทั้งปี ค.ศ. (เช่น 2026) และปี พ.ศ. (เช่น 2569) ป้องกันการคำนวณวันในสัปดาห์คลาดเคลื่อน
  const normalizedYear = randomYear > 2400 ? randomYear - 543 : randomYear;

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
    let fromBank = menuBank.filter((m) => m.category === category);
    if (category === 'ของหวาน' || category === 'ขนมหวาน') {
      fromBank = menuBank.filter((m) => m.category === 'ของหวาน' || m.category === 'ขนมหวาน');
    }
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
    (m) => m.category === 'ของหวาน' || m.category === 'ขนมหวาน' || (m.category === 'ผลไม้-ของหวาน' && isDessertName(m.menuName))
  );
  const dessertItems =
    dessertBank.length > 0 ? dessertBank : INITIAL_MENU_BANK.filter((m) => m.category === 'ของหวาน' || m.category === 'ขนมหวาน');

  // ตรวจสอบเมนูที่มีอยู่เดิมของเดือนนี้ เพื่อให้การสุ่มใหม่แต่ละครั้ง "ไม่ซ้ำเดิม" กับที่มีอยู่
  const currentMonthPrefix = `${normalizedYear}-${String(randomMonth).padStart(2, '0')}`;
  const existingThisMonthMap = new Map<string, DailyMenuEntry>();
  dailyMenus.forEach((entry) => {
    if (entry && entry.date && entry.date.startsWith(currentMonthPrefix)) {
      existingThisMonthMap.set(entry.date.trim().slice(0, 10), entry);
    }
  });

  // รวบรวมวันทำการเรียน (จันทร์-ศุกร์) ทั้งหมดในเดือนที่เลือก แยกเป็นสัปดาห์
  const daysInMonth = new Date(normalizedYear, randomMonth, 0).getDate();
  const schoolDaysByWeek: { weekNumber: number; dates: Date[] }[] = [];

  let currentWeek: Date[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    // ใช้เวลาเที่ยงวัน (12:00:00) ป้องกันการคลาดเคลื่อนของ Timezone
    const d = new Date(normalizedYear, randomMonth - 1, day, 12, 0, 0);
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

  // ระบบติดตามเมนูที่ใช้แล้วในเดือนนี้ เพื่อรับประกัน "ไม่ซ้ำกันตลอดทั้งเดือน"
  const usedSpicyInMonth = new Set<string>();
  const usedNonSpicyInMonth = new Set<string>();
  const usedSingleInMonth = new Set<string>();
  const usedDessertInMonth = new Set<string>();
  const usedFruitInMonth = new Set<string>();
  const usedRiceInMonth = new Set<string>();

  /**
   * ฟังก์ชันเลือกเมนูแบบรับประกันไม่ซ้ำกัน:
   * 1. ไม่ซ้ำในเดือนเดียวกัน (ถ้าคลังเมนูมีเพียงพอ)
   * 2. ไม่ซ้ำในสัปดาห์เดียวกัน
   * 3. ไม่ซ้ำกับเมนูเดิมที่มีอยู่ก่อนกดสุ่มรอบนี้
   */
  const pickDiverseItem = (
    pool: MenuItem[],
    usedInMonth: Set<string>,
    currentWeekDishes: Set<string>,
    previousDishName?: string
  ): string => {
    if (!pool || pool.length === 0) return '';

    // สุ่มสับเปลี่ยนรายการใน pool ทุกครั้ง
    const shuffledPool = shuffle(pool);

    // ระดับ 1: ยังไม่เคยใช้ในเดือนนี้ + ไม่ซ้ำในสัปดาห์นี้ + ไม่ซ้ำกับของเดิมก่อนกดสุ่ม
    let candidates = shuffledPool.filter(
      (item) =>
        !usedInMonth.has(item.menuName) &&
        !currentWeekDishes.has(item.menuName) &&
        (!previousDishName || item.menuName !== previousDishName)
    );

    // ระดับ 2: ถ้าหมด ให้ยอมให้เหมือนก่อนกดสุ่มได้ แต่ต้องยังไม่เคยใช้ในเดือนนี้และไม่ซ้ำในสัปดาห์นี้
    if (candidates.length === 0) {
      candidates = shuffledPool.filter(
        (item) => !usedInMonth.has(item.menuName) && !currentWeekDishes.has(item.menuName)
      );
    }

    // ระดับ 3: หากคลังมีจำนวนน้อยกว่าจำนวนวันในเดือน (เช่น ข้าว หรือ ผลไม้) ให้เริ่มหมุนเวียนรอบใหม่โดยไม่ซ้ำในสัปดาห์และไม่ซ้ำรอบก่อน
    if (candidates.length === 0) {
      candidates = shuffledPool.filter(
        (item) =>
          !currentWeekDishes.has(item.menuName) &&
          (!previousDishName || item.menuName !== previousDishName)
      );
    }

    // ระดับ 4: ถ้ายังไม่มี ให้เลือกจากที่ไม่ซ้ำในสัปดาห์
    if (candidates.length === 0) {
      candidates = shuffledPool.filter((item) => !currentWeekDishes.has(item.menuName));
    }

    // ระดับ 5: กรณีสุดวิสัย ใช้ทั้ง pool
    if (candidates.length === 0) {
      candidates = shuffledPool;
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)].menuName;
    usedInMonth.add(chosen);
    currentWeekDishes.add(chosen);
    return chosen;
  };

  const generatedEntries: DailyMenuEntry[] = [];

  schoolDaysByWeek.forEach((week, weekIdx) => {
    const days = week.dates;
    const weekDishes = new Set<string>();

    // การจัดขนมหวานและผลไม้: สัปดาห์ละ 1-2 วันเป็นขนมหวาน วันที่เหลือเป็นผลไม้สด
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
      const dateStr = toDateString(dateObj);
      const dayOfWeek = dateObj.getDay();
      const isWednesday = dayOfWeek === 3;
      const prevEntry = existingThisMonthMap.get(dateStr);

      let itemRice = '';
      let itemSingleDish = '';
      let itemNonSpicy = '';
      let itemSpicy = '';
      let itemSweet = '';

      const isDessertToday = dessertIndices.has(idx);
      if (isDessertToday) {
        itemSweet = pickDiverseItem(
          dessertItems.length > 0 ? dessertItems : fruitItems,
          usedDessertInMonth,
          weekDishes,
          prevEntry?.dessert
        );
      } else {
        itemSweet = pickDiverseItem(
          fruitItems.length > 0 ? fruitItems : dessertItems,
          usedFruitInMonth,
          weekDishes,
          prevEntry?.dessert
        );
      }

      if (isWednesday) {
        // วันพุธ: อาหารจานเดียว
        itemSingleDish = pickDiverseItem(
          singleDishItems,
          usedSingleInMonth,
          weekDishes,
          prevEntry?.singleDish
        );
        itemRice = '';
        itemNonSpicy = '';
        itemSpicy = '';
      } else {
        // วันอื่นๆ: ข้าว + กับข้าวไม่เผ็ด + กับข้าวเผ็ด
        // ข้าว: ถ้าใช้ครบแล้ว รีเซ็ต pool ข้าว
        if (usedRiceInMonth.size >= riceItems.length) {
          usedRiceInMonth.clear();
        }
        itemRice = pickDiverseItem(
          riceItems,
          usedRiceInMonth,
          weekDishes,
          prevEntry?.rice
        );

        itemNonSpicy = pickDiverseItem(
          nonSpicyItems,
          usedNonSpicyInMonth,
          weekDishes,
          prevEntry?.nonSpicy
        );

        itemSpicy = pickDiverseItem(
          spicyItems,
          usedSpicyInMonth,
          weekDishes,
          prevEntry?.spicy
        );
      }

      generatedEntries.push({
        date: dateStr,
        rice: itemRice,
        singleDish: itemSingleDish,
        nonSpicy: itemNonSpicy,
        spicy: itemSpicy,
        dessert: itemSweet,
        note: '',
        photos: prevEntry?.photos || []
      });
    });
  });

  return generatedEntries;
}
