import { SubscribeForm } from "./subscribe-form";

export function NewsletterBlock({
  title = "Neue Texte per E-Mail",
  text = "Wenn ein neuer Text erscheint, schicke ich eine kurze Nachricht — mit dem Anfang des Textes und einem Link. Nicht öfter als ein paar Mal im Jahr.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="newsletter-block" aria-labelledby="newsletter-titel">
      <div className="container newsletter-block__grid">
        <div className="newsletter-block__intro">
          <p className="label label--accent">Newsletter</p>
          <h2 id="newsletter-titel" className="newsletter-block__title">
            {title}
          </h2>
          <p className="newsletter-block__text">{text}</p>
        </div>
        <div className="newsletter-block__form">
          <SubscribeForm />
        </div>
      </div>
    </section>
  );
}
