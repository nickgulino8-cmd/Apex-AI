"use client";
import { useLocalView } from "@/components/Local";
import { memoriesFor } from "@/lib/repo";
import { aiConfigured } from "@/lib/ai";
import { PageHeader } from "@/components/ui";
import { ProfileForm } from "@/components/profile/ProfileForm";


export default function ProfilePage() {
  return useLocalView((user) => {
    const u = user;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Profile" title="Preferences & privacy" />
      <ProfileForm name={u.name} email={u.email} age={u.age} isMinor={u.isMinor} profile={u.profile} memories={memoriesFor(u.id)} aiReady={aiConfigured()} />
    </div>
  );
  });
}
