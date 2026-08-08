import Link from "next/link";
import { NewsletterForm } from "@/components/newsletter-form";

export const dynamic = "force-dynamic";

export default function NewNewsletterPage() {
  return (
    <>
      <div className="admin-head">
        <div>
          <p className="label label--accent">Newsletter</p>
          <h1 className="admin-head__title">New issue</h1>
        </div>
        <div className="admin-head__actions">
          <Link
            href="/admin/newsletter"
            className="button button--ghost button--small"
          >
            ← All issues
          </Link>
        </div>
      </div>

      <NewsletterForm subject="" intro="" bodyHtml="" />
    </>
  );
}
