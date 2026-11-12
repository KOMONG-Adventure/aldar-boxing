export const requiredRegistrationFields = [
  "lastName", "name", "phone", "birthDate", "registerNumber", "gender", "level",
  "joinedDate", "weight", "height", "familyCount", "bloodType", "district", "addressDetail",
] as const;

export function isPublicRegistrationComplete(data: Record<string, unknown>): boolean {
  if (!requiredRegistrationFields.every(field =>
    typeof data[field] === "string" && data[field].trim() !== "" && data[field] !== "Сонгох")) return false;
  if (!["weight", "height", "familyCount"].every(field => Number(data[field]) > 0)) return false;
  if (typeof data.phone !== "string" || !/^\+?[\d ()-]{8,25}$/.test(data.phone.trim())) return false;
  if (typeof data.avatarUrl !== "string" || !data.avatarUrl.startsWith("data:image/")) return false;
  if (!Array.isArray(data.guardians) || data.guardians.length === 0) return false;
  return data.guardians.every(guardian => guardian &&
    ["name", "phone", "profession", "relation"].every(field =>
      typeof guardian[field] === "string" && guardian[field].trim() !== "") &&
    /^\+?[\d ()-]{8,25}$/.test(guardian.phone.trim()));
}
