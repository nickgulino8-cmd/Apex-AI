import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
export const metadata = { title: "Create account" };
export default async function Page() {
  if (await currentUser()) redirect("/home");
  return <AuthForm mode="register" />;
}
