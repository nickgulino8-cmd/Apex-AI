"use client";
import { Suspense, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { initDb, dbReady, dbVersion, subscribe } from "@/lib/db";
import { currentUser, type User } from "@/lib/auth";

/** Resolves once the on-device database is loaded; re-renders whenever data changes. */
export function useDb(): { ready: boolean; error: string | null } {
  const [ready, setReady] = useState(dbReady());
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (ready) return;
    initDb().then(() => setReady(true)).catch((e) => setError(String(e?.message ?? e)));
  }, [ready]);
  useSyncExternalStore(subscribe, dbVersion, () => 0);
  return { ready, error };
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-8 w-56" />
      <div className="skeleton h-40 w-full" />
      <div className="grid gap-4 sm:grid-cols-2"><div className="skeleton h-32" /><div className="skeleton h-32" /></div>
    </div>
  );
}

/** Renders `view(user)` from on-device data, re-running whenever the data changes. */
export function useLocalView(view: (user: User) => ReactNode): ReactNode {
  const { ready, error } = useDb();
  if (error) return <div className="card card-pad text-sm text-bad">Couldn&apos;t open on-device storage: {error}</div>;
  if (!ready) return <PageSkeleton />;
  const user = currentUser();
  if (!user) return <PageSkeleton />;
  return view(user);
}

/** searchParams as a plain object (static-export friendly). */
export function useSP(): Record<string, string> {
  const sp = useSearchParams();
  return Object.fromEntries(sp.entries());
}

export function WithSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}
