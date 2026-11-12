import type { Member } from "./db";

// Registration only. Other modules will receive persistence in later phases.
export const studentFields = {
  lastName: "last_name", name: "name", phone: "phone", birthDate: "birth_date",
  registerNumber: "register_number", gender: "gender", level: "level",
  joinedDate: "joined_date", weight: "weight", height: "height",
  familyCount: "family_count", bloodType: "blood_type", district: "district",
  addressDetail: "address_detail", guardians: "guardians", status: "status",
  paymentDate: "payment_date", expireDate: "expire_date", notes: "notes",
} as const;

export type StudentRow = Record<string, unknown> & {
  id: string; avatar_path: string | null; created_at: string;
};

export function toStudentRow(member: Member, avatarPath: string | null): StudentRow {
  const row: StudentRow = {
    id: member.id, avatar_path: avatarPath,
    created_at: new Date(member.createdAt || Date.now()).toISOString(),
  };
  for (const [field, column] of Object.entries(studentFields)) {
    row[column] = member[field as keyof Member] ?? (field === "guardians" ? [] : "");
  }
  return row;
}

export function fromStudentRow(row: StudentRow, avatarUrl = ""): Member {
  const profile = Object.fromEntries(Object.entries(studentFields).map(([field, column]) =>
    [field, row[column]])) as Pick<Member, keyof typeof studentFields>;
  return {
    attendancesCount: 0, paymentHistory: [], fights: [], assignedSessionIds: [],
    ...profile, id: row.id, avatarUrl, createdAt: row.created_at,
    siblingId: typeof row.sibling_student_id === "string" ? row.sibling_student_id : null,
    monthlyFee: row.sibling_student_id ? 50000 : 100000,
  };
}
