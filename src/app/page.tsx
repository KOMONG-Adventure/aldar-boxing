import { redirect } from "next/navigation";
import { Suspense } from "react";
import HomeDashboard from "@/components/HomeDashboard";
import { getTeacher } from "@/lib/teacher-auth";

async function TeacherDashboard() {
  if (!(await getTeacher())) redirect("/bagsh");
  return <HomeDashboard />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 p-6 text-zinc-400">
          Түр хүлээнэ үү…
        </main>
      }
    >
      <TeacherDashboard />
    </Suspense>
  );
}
