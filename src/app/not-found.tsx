import Link from "next/link";

export default function NotFound() {
  return (
    <div className="status-page">
      <p className="label label--accent">404</p>
      <h1 className="status-page__title">Diese Seite gibt es nicht.</h1>
      <p className="status-page__text">
        Vielleicht wurde der Text zurückgezogen, vielleicht hat sich in der
        Adresse ein Buchstabe verirrt. Im Register finden Sie alles, was
        erschienen ist.
      </p>
      <div className="status-page__actions">
        <Link href="/texte" className="button">
          Zum Register
        </Link>
        <Link href="/" className="button button--ghost">
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
