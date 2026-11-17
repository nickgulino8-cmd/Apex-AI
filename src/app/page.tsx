"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { useDb } from "@/components/Local";

export default function Root() {
  const { ready } = useDb();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    const u = currentUser();
    router.replace(u?.profile.onboarded ? "/home" : "/onboarding");
  }, [ready, router]);
  return <div className="grid min-h-dvh place-items-center text-[13px] font-semibold tracking-[0.35em]">APEX<span className="text-accent">·</span>AI</div>;
}
