import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
export const metadata = { title: "Sign in" };
export default async function Page() {
  if (await currentUser()) redirect("/home");
  return <AuthForm mode="login" />;
}
