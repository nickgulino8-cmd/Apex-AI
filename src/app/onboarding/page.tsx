"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { useDb, PageSkeleton } from "@/components/Local";
import { Onboarding } from "./Onboarding";

export default function Page() {
  const { ready } = useDb();
  const router = useRouter();
  const u = ready ? currentUser() : null;
  useEffect(() => {
    if (u?.profile.onboarded) router.replace("/home");
  }, [u?.profile.onboarded, router]);
  if (!ready) return <div className="mx-auto max-w-xl p-6"><PageSkeleton /></div>;
  return <Onboarding existing={u ? { name: u.name, isMinor: u.isMinor } : null} />;
}
