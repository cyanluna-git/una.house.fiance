import UnlockForm from "./UnlockForm";

type UnlockPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UnlockPage({ searchParams }: UnlockPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const nextValue = resolvedSearchParams.next;
  const nextPath = typeof nextValue === "string" && nextValue.startsWith("/")
    ? nextValue
    : "/";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_35%,#f8fafc_100%)] px-6 py-12 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md items-center">
        <section className="w-full rounded-3xl border border-white/70 bg-white/90 p-8 shadow-[0_25px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Private Access</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">unahouse.finance</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            이 서비스는 개인 금융 데이터를 포함합니다. 접근 키를 입력해야 계속 진행할 수 있습니다.
          </p>

          <UnlockForm nextPath={nextPath} />

          <p className="mt-4 text-xs leading-5 text-slate-500">
            정상 입력 시 이 브라우저에만 인증 쿠키가 저장됩니다.
          </p>
        </section>
      </div>
    </main>
  );
}
