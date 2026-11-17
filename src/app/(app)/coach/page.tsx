import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { Tabs } from "@/components/Tabs";
import { Chat } from "@/components/coach/Chat";

export const metadata = { title: "AI Coach" };

export default async function CoachPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const user = await requireUser();
  const mode = (await searchParams).mode === "appearance" ? "appearance" : "assistant";
  return (
    <div>
      <PageHeader eyebrow="AI Coach" title={mode === "appearance" ? "Appearance & skincare coach" : "Personal assistant"} />
      <Tabs active={mode} tabs={[{ key: "assistant", label: "Personal assistant", href: "/coach" }, { key: "appearance", label: "Skin & appearance coach", href: "/coach?mode=appearance" }]} />
      <Chat key={mode} mode={mode} memoryOn={user.profile.ai_memory && !user.isMinor} name={user.name.split(" ")[0]} />
    </div>
  );
}
