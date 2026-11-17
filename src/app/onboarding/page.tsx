import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Onboarding } from "./Onboarding";

export const metadata = { title: "Set up" };
export default async function Page() {
  const u = await requireUser();
  if (u.profile.onboarded) redirect("/home");
  return <Onboarding name={u.name} isMinor={u.isMinor} />;
}
