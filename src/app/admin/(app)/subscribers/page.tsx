import { ConfirmButton } from "@/components/confirm-button";
import {
  deleteSubscriberAction,
  unsubscribeAction,
} from "@/app/admin/(app)/subscribers/actions";
import { query } from "@/lib/db";
import { formatDateShort } from "@/lib/site";

export const dynamic = "force-dynamic";

type SubscriberRow = {
  id: number;
  email: string;
  name: string;
  status: string;
  created_at: string;
  confirmed_at: string | null;
};

export default async function AdminSubscribersPage() {
  const subscribers = await query<SubscriberRow>(
    `SELECT id, email, name, status, created_at, confirmed_at
       FROM subscribers
      ORDER BY created_at DESC`,
  );

  const counts = subscribers.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="label label--accent">Subscribers</p>
          <h1 className="admin-head__title">
            {counts.confirmed ?? 0} on the list
          </h1>
        </div>
        <div className="admin-head__actions">
          <a
            href="/admin/subscribers/export"
            className="button button--ghost button--small"
          >
            Export CSV
          </a>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="stat__value">{counts.confirmed ?? 0}</span>
          <span className="label">Confirmed</span>
        </div>
        <div className="stat">
          <span className="stat__value">{counts.pending ?? 0}</span>
          <span className="label">Pending</span>
        </div>
        <div className="stat">
          <span className="stat__value">{counts.unsubscribed ?? 0}</span>
          <span className="label">Unsubscribed</span>
        </div>
      </div>

      {subscribers.length === 0 ? (
        <p className="admin-empty">
          Nobody has signed up yet. The form sits at the foot of every page and
          on <code>/newsletter</code>.
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>E-mail</th>
              <th>Name</th>
              <th>Status</th>
              <th>Signed up</th>
              <th className="admin-table__actions">Manage</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((subscriber) => (
              <tr key={subscriber.id}>
                <td>{subscriber.email}</td>
                <td>{subscriber.name || "—"}</td>
                <td>
                  <span className={`badge badge--${subscriber.status}`}>
                    {subscriber.status}
                  </span>
                </td>
                <td className="admin-table__num">
                  {formatDateShort(subscriber.created_at)}
                </td>
                <td className="admin-table__actions">
                  <div className="action-row">
                    {subscriber.status === "confirmed" && (
                      <form action={unsubscribeAction} className="inline-form">
                        <input type="hidden" name="id" value={subscriber.id} />
                        <ConfirmButton
                          className="button button--ghost button--small"
                          message={`Mark ${subscriber.email} as unsubscribed?`}
                        >
                          Unsubscribe
                        </ConfirmButton>
                      </form>
                    )}
                    <form action={deleteSubscriberAction} className="inline-form">
                      <input type="hidden" name="id" value={subscriber.id} />
                      <ConfirmButton
                        className="button button--danger button--small"
                        message={`Delete ${subscriber.email} completely? This removes the record and its delivery history.`}
                      >
                        Delete
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
