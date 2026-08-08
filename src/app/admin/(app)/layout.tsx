import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin-nav";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Guards every page inside the (app) group. Server Actions are checked
 * separately with requireUser() — a layout cannot protect a direct POST.
 */
export default async function AdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");

  return (
    <>
      <div className="admin-bar">
        <div className="container admin-bar__inner">
          <Link href="/admin" className="admin-bar__brand">
            <strong>Editorial</strong>
            <span className="label">Titus Lainsbury</span>
          </Link>

          <AdminNav />

          <div className="admin-bar__user">
            <span>{user.name || user.email}</span>
            <Link href="/" target="_blank" className="admin-bar__signout">
              View site
            </Link>
            <form action={signOutAction} className="inline-form">
              <button type="submit" className="admin-bar__signout">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>

      <main className="admin-main">
        <div className="container">{children}</div>
      </main>
    </>
  );
}
