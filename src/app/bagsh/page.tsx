import TeacherLogin from "@/components/TeacherLogin";
import { Suspense } from "react";

async function LoginForm({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const params = await searchParams;
  return (
    <TeacherLogin
      invite={typeof params.invite === "string" ? params.invite : ""}
    />
  );
}

export default function TeacherPage(props: {
  searchParams: Promise<{ invite?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 p-6 text-zinc-400">
          Түр хүлээнэ үү…
        </main>
      }
    >
      <LoginForm {...props} />
    </Suspense>
  );
}
