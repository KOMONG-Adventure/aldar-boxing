import fs from 'fs';
import path from 'path';

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

const dataFilePath = path.join(process.cwd(), 'data.json');

const initialData: AppData = {
  settings: {
    clubName: "ALDAR BOXING CLUB",
    coachName: "Мастер Болд",
    monthlyFee: 150000,
    gymOpenTime: "07:00",
    gymCloseTime: "22:00",
    smsNotification: true,
    currency: "₮"
  },
  notifications: [
    {
      id: "notif_1",
      title: "Төлбөрийн хугацаа",
      message: "Энхжин Сүхбат гишүүний төлбөрийн эрх дууссан байна.",
      time: "Өнөөдөр 08:30",
      type: "alert",
      read: false
    }
  ],
  members: [
    {
      id: "m_1",
      lastName: "Бат",
      name: "Тэмүүлэн",
      phone: "80000011",
      birthDate: "2006-05-12",
      registerNumber: "УА06251211",
      gender: "Эрэгтэй",
      level: "Fighter",
      joinedDate: "2026-10-01",
      weight: "52",
      height: "165",
      familyCount: "4",
      bloodType: "I (O+)",
      district: "Баянзүрх дүүрэг",
      addressDetail: "14-р хороо, 55-р байр",
      guardians: [
        {
          name: "Бат Эрдэнэ",
          phone: "81000011",
          profession: "Эмч",
          relation: "Аав"
        }
      ],
      status: "PAID",
      paymentDate: "2026-10-01",
      expireDate: "2026-11-01",
      createdAt: "2026-10-01",
      attendancesCount: 18,
      assignedSessionIds: ["s_1", "s_3"]
    },
    {
      id: "m_2",
      lastName: "Болд",
      name: "Төгөлдөр",
      phone: "99887766",
      birthDate: "2004-09-15",
      registerNumber: "УБ04291512",
      gender: "Эрэгтэй",
      level: "Advanced",
      joinedDate: "2026-08-10",
      weight: "67",
      height: "178",
      familyCount: "3",
      bloodType: "II (A+)",
      district: "Сүхбаатар дүүрэг",
      guardians: [],
      status: "PAID",
      paymentDate: "2026-10-15",
      expireDate: "2026-11-15",
      createdAt: "2026-08-10",
      attendancesCount: 22,
      assignedSessionIds: ["s_2", "s_3"]
    },
    {
      id: "m_3",
      lastName: "Энх",
      name: "Сүхбат",
      phone: "91004455",
      birthDate: "2007-02-20",
      registerNumber: "УА07222019",
      gender: "Эрэгтэй",
      level: "Beginner",
      joinedDate: "2026-09-18",
      weight: "60",
      height: "172",
      familyCount: "5",
      bloodType: "III (B+)",
      district: "Хан-Уул дүүрэг",
      guardians: [],
      status: "UNPAID",
      paymentDate: "2026-09-18",
      expireDate: "2026-10-18",
      createdAt: "2026-09-18",
      attendancesCount: 5,
      assignedSessionIds: ["s_1"]
    }
  ],
  sessions: [
    {
      id: "s_1",
      title: "Өглөөний фитнес & бокс суурь",
      time: "07:30 - 09:00",
      coach: "Дасгалжуулагч Болд",
      capacity: 15,
      dayOfWeek: "Даваа - Бямба",
      enrolledMemberIds: ["m_1", "m_3"]
    },
    {
      id: "s_2",
      title: "Өдрийн үндсэн техникийн анги",
      time: "15:00 - 16:30",
      coach: "Дасгалжуулагч Ганзориг",
      capacity: 20,
      dayOfWeek: "Даваа - Баасан",
      enrolledMemberIds: ["m_2"]
    },
    {
      id: "s_3",
      title: "Оройн тамирчдын спарринг анги",
      time: "19:00 - 20:30",
      coach: "Мастер Даваа",
      capacity: 12,
      dayOfWeek: "Даваа, Лхагва, Баасан",
      enrolledMemberIds: ["m_1", "m_2"]
    }
  ],
  attendances: [
    {
      id: "att_1",
      sessionId: "s_1",
      sessionTitle: "Өглөөний фитнес & бокс суурь",
      memberId: "m_1",
      memberName: "Тэмүүлэн (Бат)",
      date: new Date().toISOString().split('T')[0],
      checkInTime: "07:35"
    }
  ],
  financials: []
};

export function getDbData(): AppData {
  try {
    if (!fs.existsSync(dataFilePath)) {
      fs.writeFileSync(dataFilePath, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    const content = fs.readFileSync(dataFilePath, 'utf-8');
    const parsed = JSON.parse(content);
    if (!parsed.notifications) parsed.notifications = initialData.notifications;
    if (!parsed.settings) parsed.settings = initialData.settings;
    if (!parsed.financials) parsed.financials = initialData.financials;
    if (!parsed.sessions) parsed.sessions = initialData.sessions;

    // session бүрт enrolledMemberIds байгаа эсэхийг баталгаажуулах
    parsed.sessions.forEach((s: any) => {
      if (!s.enrolledMemberIds) {
        s.enrolledMemberIds = s.attendedMemberIds || [];
      }
    });

    return parsed;
  } catch (err) {
    console.error("DB Read error:", err);
    return initialData;
  }
}

export function saveDbData(data: AppData): void {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error("DB Write error:", err);
  }
}
