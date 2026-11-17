"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Sidebar, MobileNav } from "@/components/Nav";
import { useDb, PageSkeleton, WithSuspense } from "@/components/Local";
import { AppLock } from "@/components/AppLock";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, error } = useDb();
  const router = useRouter();
  const user = ready ? currentUser() : null;
  const needsSetup = ready && (!user || !user.profile.onboarded);
  useEffect(() => {
    if (needsSetup) router.replace("/onboarding");
  }, [needsSetup, router]);
  return (
    <AppLock>
    <div className="min-h-dvh">
      <Sidebar name={user?.name ?? ""} />
      <MobileNav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pl-[17rem] lg:pr-8 lg:pt-10 lg:pb-16">
        {error ? <div className="card card-pad text-sm text-bad">Couldn&apos;t open on-device storage: {error}</div> : !user || needsSetup ? <PageSkeleton /> : <WithSuspense>{children}</WithSuspense>}
      </main>
    </div>
    </AppLock>
  );
}
