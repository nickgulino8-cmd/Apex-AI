"use client";
import { useLocalView, useSP } from "@/components/Local";
import { PageHeader } from "@/components/ui";
import { Tabs } from "@/components/Tabs";
import { Chat } from "@/components/coach/Chat";


export default function CoachPage() {
  const searchParams = useSP();
  return useLocalView((user) => {
  const mode = searchParams.mode === "appearance" ? "appearance" : "assistant";
  return (
    <div>
      <PageHeader eyebrow="AI Coach" title={mode === "appearance" ? "Appearance & skincare coach" : "Personal assistant"} />
      <Tabs active={mode} tabs={[{ key: "assistant", label: "Personal assistant", href: "/coach" }, { key: "appearance", label: "Skin & appearance coach", href: "/coach?mode=appearance" }]} />
      <Chat key={mode} mode={mode} memoryOn={user.profile.ai_memory && !user.isMinor} name={user.name.split(" ")[0]} />
    </div>
  );
  });
}
