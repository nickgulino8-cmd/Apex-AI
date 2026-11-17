import { requireUser } from "@/lib/auth";
import { memoriesFor } from "@/lib/repo";
import { aiConfigured } from "@/lib/ai";
import { PageHeader } from "@/components/ui";
import { ProfileForm } from "@/components/profile/ProfileForm";

export const metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const u = await requireUser();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Profile" title="Preferences & privacy" />
      <ProfileForm name={u.name} email={u.email} age={u.age} isMinor={u.isMinor} profile={u.profile} memories={memoriesFor(u.id)} aiReady={aiConfigured()} />
    </div>
  );
}
