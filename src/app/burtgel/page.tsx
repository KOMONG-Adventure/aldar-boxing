import type { Metadata } from "next";
import AddMemberModal from "@/components/AddMemberModal";

export const metadata: Metadata = {
  title: "Сурагчийн бүртгэл | ALDAR Boxing",
  robots: { index: false, follow: false },
};

export default function RegistrationPage() {
  return (
    <main className="min-h-screen bg-[#101210] px-4 py-6 sm:px-6 sm:py-10">
      <p className="mb-6 text-center text-xs font-semibold tracking-[0.2em] text-red-400">ALDAR BOXING CLUB</p>
      <AddMemberModal publicRegistration />
    </main>
  );
}
