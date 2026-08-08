import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { currentUser } from "@/lib/auth";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentUser()) redirect("/admin");

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <p className="label label--accent">{site.name}</p>
          <h1 className="login__title">Editorial sign-in</h1>
        </div>

        <LoginForm />

        <p className="login__back">
          <Link href="/">← Back to the site</Link>
        </p>
      </div>
    </div>
  );
}
