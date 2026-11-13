export interface Guardian {
  name: string;
  phone: string;
  profession?: string;
  relation: string;
}

export interface FightRecord {
  id: string;
  date: string;
  opponent: string;
  result: 'WIN' | 'LOSS' | 'DRAW';
  tournament: string;
  method?: string;
  weightCategory?: string;
}

export interface PaymentHistoryItem {
  id: string;
  date: string;         // Төлбөр хийсэн өдөр (YYYY-MM-DD)
  amount: number;       // Төлсөн дүн (₮)
  periodMonths: number; // Хэдэн сараар (1 сар, 3 сар, г.м)
  startDate: string;    // Эхлэх огноо
  expireDate: string;   // Дуусах огноо
  method?: string;      // Бэлнээр, Дансаар, Картаар, QPay
  note?: string;        // Тэмдэглэл
  createdAt: string;
  monthlyFee?: number;
  siblingName?: string;
}

export interface Member {
  id: string;
  lastName: string;       // Овог
  name: string;           // Нэр
  phone: string;
  birthDate?: string;
  registerNumber?: string;
  gender: string;         // 'Эрэгтэй' | 'Эмэгтэй'
  level: string;          // 'Beginner' | 'Intermediate' | 'Advanced' | 'Fighter'
  joinedDate: string;
  weight?: string;        // Жин /кг/
  height?: string;        // Өндөр /см/
  familyCount?: string;   // Ам бүлийн тоо
  bloodType?: string;     // Цусны бүлэг: I, II, III, IV
  district?: string;      // Дүүрэг
  addressDetail?: string; // Хаяг дэлгэрэнгүй
  guardians: Guardian[];
  status: 'PAID' | 'UNPAID';
  paymentDate: string;
  expireDate: string;
  paymentHistory?: PaymentHistoryItem[]; // Төлбөр төлөлтийн бүх түүх
  createdAt: string;
  attendancesCount: number;
  avatarUrl?: string;
  fights?: FightRecord[];
  assignedSessionIds?: string[]; // Сурагчийн харьяалагддаг/бүртгэлтэй ангиудын ID
  notes?: string;
  siblingId?: string | null;
  monthlyFee?: number;
}

export interface SessionTimeSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface SessionItem {
  id: string;
  title: string;
  time: string;
  startTime?: string;
  endTime?: string;
  coach: string;
  capacity: number;
  dayOfWeek?: string;
  scheduleType?: 'recurring' | 'single'; // 'recurring' (тогтмол 7 хоног бүр) эсвэл 'single' (нэг удаагийн огноотой)
  selectedDays?: number[]; // 1 = Даваа, 2 = Мягмар, ..., 7 = Ням
  specificDate?: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  enrolledMemberIds: string[]; // Тухайн хичээлд бүртгэлтэй сурагчдын ID жагсаалт
  timeSlots?: SessionTimeSlot[];
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  sessionTitle?: string;
  memberId: string;
  memberName: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // HH:mm
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'alert' | 'info' | 'success';
  read: boolean;
}

export interface AppSettings {
  clubName: string;
  coachName: string;
  monthlyFee: number;
  gymOpenTime: string;
  gymCloseTime: string;
  smsNotification: boolean;
  currency: string;
}

export interface FinancialLog {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  title: string;
  amount: number;
  category: string;
  date: string;
  memberId?: string;
}

export interface AppData {
  members: Member[];
  sessions: SessionItem[];
  attendances: AttendanceRecord[];
  notifications: AppNotification[];
  settings: AppSettings;
  financials: FinancialLog[];
}

// Phase one: registrations live in Supabase. Other modules are design previews.
// No local filesystem persistence or sample student records are used.
export function getDbData(): AppData {
  return {
    members: [], sessions: [], attendances: [], notifications: [], financials: [],
    settings: {
      clubName: "ALDAR BOXING CLUB", coachName: "", monthlyFee: 100000,
      gymOpenTime: "07:00", gymCloseTime: "22:00", smsNotification: false, currency: "₮",
    },
  };
}

export function saveDbData(_data: AppData): never {
  throw new Error("Энэ хэсгийн өгөгдлийн хадгалалт дараагийн үе шатанд холбогдоно.");
}
