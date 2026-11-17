import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Sidebar, MobileNav } from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.profile.onboarded) redirect("/onboarding");
  return (
    <div className="min-h-dvh">
      <Sidebar name={user.name} />
      <MobileNav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pl-[17rem] lg:pr-8 lg:pt-10 lg:pb-16">{children}</main>
    </div>
  );
}
