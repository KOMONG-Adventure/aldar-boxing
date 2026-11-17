import type { Metadata } from "next";
import AddMemberModal from "@/components/AddMemberModal";

export const metadata: Metadata = {
  title: "Сурагчийн бүртгэл | ALDAR Boxing",
  robots: { index: false, follow: false },
};

export default function RegistrationPage() {
  return (
    <main className="min-h-screen bg-[#09090b] px-3 py-6 sm:px-4 sm:py-10">
      <p className="mb-5 text-center text-sm font-extrabold tracking-wider text-white">ALDAR BOXING CLUB</p>
      <AddMemberModal publicRegistration />
    </main>
  );
}
