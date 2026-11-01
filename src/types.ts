/**
 * Type definitions for School Lunch Management System
 * ระบบบริหารจัดการอาหารกลางวันโรงเรียน
 */

export type MenuCategory = 
  | 'ข้าว'
  | 'อาหารจานเดียว'
  | 'อาหารไม่เผ็ด'
  | 'อาหารเผ็ด'
  | 'ผลไม้'
  | 'ของหวาน'
  | 'ขนมหวาน'
  | 'ผลไม้-ของหวาน';

export const MENU_CATEGORIES: { id: MenuCategory; label: string; icon: string; badgeColor: string; description: string }[] = [
  {
    id: 'ข้าว',
    label: 'ข้าว',
    icon: 'rice_bowl',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'ข้าวสวยหอมมะลิ ข้าวกล้อง ข้าวไรซ์เบอร์รี่'
  },
  {
    id: 'อาหารจานเดียว',
    label: 'อาหารจานเดียว',
    icon: 'dinner_dining',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
    description: 'ก๋วยเตี๋ยว ข้าวมันไก่ ข้าวผัด ผัดซีอิ๊ว'
  },
  {
    id: 'อาหารไม่เผ็ด',
    label: 'อาหารไม่เผ็ด',
    icon: 'soup_kitchen',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'ต้มจืดเต้าหู้หมูสับ ไข่พะโล้ ผัดผักรวม'
  },
  {
    id: 'อาหารเผ็ด',
    label: 'อาหารเผ็ด',
    icon: 'local_fire_department',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'แกงเขียวหวานไก่ ผัดกะเพรา แกงเผ็ดหมู'
  },
  {
    id: 'ผลไม้',
    label: 'ผลไม้',
    icon: 'nutrition',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
    description: 'กล้วยน้ำว้า แตงโม สับปะรด ฝรั่ง ส้ม มะละกอ'
  },
  {
    id: 'ของหวาน',
    label: 'ของหวาน',
    icon: 'cake',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'บัวลอย กล้วยบวชชี เฉาก๊วย ถั่วเขียวต้ม วุ้นกะทิ'
  }
];

export interface MenuItem {
  id: string;
  category: MenuCategory;
  menuName: string;
  createdAt?: string;
}

export interface ActivityPhoto {
  url: string;
  fileId?: string;
  name: string;
  uploadedAt?: string;
  folderName?: string;
}

export interface DailyMenuEntry {
  date: string; // YYYY-MM-DD
  rice: string;
  singleDish: string;
  spicy: string;
  nonSpicy: string;
  dessert: string;
  photos?: ActivityPhoto[];
  note?: string;
  department?: string;
  updatedBy?: string;
  lastModified?: string;
}

export interface SchoolSettings {
  schoolName: string;
  department: string;
  managerName: string;
  directorName: string;
  logoUrl: string;
  gasWebAppUrl: string;
}

export interface ToastNotification {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: number;
}

export interface TaxRecord {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  daysCount: number; // จำนวนวัน
  studentCount: number; // จำนวนนักเรียน
  ratePerPerson: number; // อัตราค่าอาหารต่อคน (22, 24, 27, 36 หรือกำหนดเอง)
  totalAmount: number; // ratePerPerson * studentCount * daysCount
  taxRatePercent: number; // 1%
  taxAmount: number; // totalAmount * 0.01
  netAmount: number; // totalAmount - taxAmount
  isPaid: boolean; // จ่ายภาษีแล้ว หรือยังไม่จ่าย
  paidAt?: string; // วันที่จ่ายภาษี
  note?: string; // หมายเหตุ เช่น งวดที่ 1 ประจำเดือน
  createdAt: string;
}

// Known legacy template dummy dishes that do NOT exist in the user's menuBank
export const FORBIDDEN_DUMMY_DISHES = new Set([
  'ข้าวสวยหอมมะลิใหม่',
  'ข้าวกล้องเกษตรอินทรีย์หอมนุ่ม',
  'ข้าวกล้องเกษตรอินทรีย์',
  'ข้าวสวยหอมมะลิ',
  'ข้าวมันไก่ตอนสูตรอนามัย น้ำซุปฟักหวาน',
  'ก๋วยเตี๋ยวเส้นหมี่น้ำใสลูกชิ้นปลาหมูสับ',
  'ก๋วยเตี๋ยวหมูสับน้ำใส ลูกชิ้นปลา',
  'ข้าวมันไก่ต้ม พร้อมน้ำซุปฟัก',
  'ต้มจืดเต้าหู้หมูสับสาหร่ายวากาเมะแครอท',
  'ต้มจืดเต้าหู้หมูสับสาหร่ายวากาเมะ',
  'ไข่พะโล้โบราณหมูสามชั้น เต้าหู้พวง',
  'ไข่พะโล้หมูสามชั้น เต้าหู้พวง',
  'แกงเขียวหวานไก่ใส่มะเขือเปราะใบโหระพา',
  'แกงเขียวหวานไก่ใส่ฟักและมะเขือเปราะ',
  'ผัดกะเพราหมูสับใบกะเพราบ้าน (เผ็ดน้อยสำหรับเด็ก)',
  'ผัดกะเพราหมูสับใบกะเพราบ้าน',
  'กล้วยน้ำว้าอินทรีย์สวนโรงเรียน',
  'กล้วยน้ำว้าเกษตรอินทรีย์',
  'แตงโมกินรีหวานฉ่ำหั่นชิ้นพอดีคำ',
  'แตงโมหวานฉ่ำหั่นชิ้น',
  'บัวลอยเผือกมะพร้าวอ่อนกะทิสดหวานน้อย',
  'กล้วยบวชชีงาขาวคั่วหอมกรุ่น',
  'สับปะรดภูแลหวานกรอบ',
  'ส้มสายน้ำผึ้งสด',
  'ผัดซีอิ๊วหมูนุ่มใส่คะน้าฮ่องกง',
  'ข้าวผัดอเมริกัน น่องไก่ทอด',
  'แกงจืดฟักเขียวกระดูกหมูเห็ดหอม',
  'ผัดผักรวมมิตรใส่กุ้งสด',
  'แกงเผ็ดหมูใส่หน่อไม้สด'
]);

export function cleanDailyMenuEntry(entry: DailyMenuEntry): DailyMenuEntry {
  if (!entry) return entry;
  const clean = { ...entry };
  (['rice', 'singleDish', 'spicy', 'nonSpicy', 'dessert'] as const).forEach((f) => {
    const val = clean[f];
    if (val && FORBIDDEN_DUMMY_DISHES.has(val.trim())) {
      clean[f] = '';
    }
  });
  return clean;
}
