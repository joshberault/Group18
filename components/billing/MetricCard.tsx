import Link from "next/link";

type MetricCardProps = {
  /** Optional line above the main label (e.g. module name) */
  eyebrow?: string;
  label: string;
  value: string;
  /** Secondary detail under the value (e.g. "17 Overdue Invoices") */
  detail?: string;
  /** When true, detail text uses attention styling */
  detailTone?: "default" | "attention";
  hint?: string;
  tone?: "default" | "attention" | "positive";
  /** When set (and no actionHref), the whole card is clickable. */
  href?: string;
  /** Highlighted text link under the value (preferred over whole-card href). */
  actionLabel?: string;
  actionHref?: string;
  /** Visual weight of the action control */
  actionStyle?: "link" | "button";
};

export function MetricCard({
  eyebrow,
  label,
  value,
  detail,
  detailTone = "default",
  hint,
  tone = "default",
  href,
  actionLabel,
  actionHref,
  actionStyle = "link",
}: MetricCardProps) {
  const body = (
    <>
      {eyebrow ? <p className="metric-card__eyebrow">{eyebrow}</p> : null}
      <p className="metric-card__label">{label}</p>
      <p className="metric-card__value">{value}</p>
      {detail ? (
        <p
          className={
            detailTone === "attention"
              ? "metric-card__detail metric-card__detail--attention"
              : "metric-card__detail"
          }
        >
          {detail}
        </p>
      ) : null}
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className={
            actionStyle === "button"
              ? "metric-card__action metric-card__action--button"
              : "metric-card__action"
          }
        >
          {actionLabel}
        </Link>
      ) : null}
      {hint ? <p className="metric-card__hint">{hint}</p> : null}
    </>
  );

  // Avoid nested anchors when action link is present
  if (href && !(actionLabel && actionHref)) {
    return (
      <Link
        href={href}
        className={`metric-card metric-card--${tone} metric-card--link`}
        aria-label={`${eyebrow ? `${eyebrow}, ` : ""}${label}: ${value}. Open details`}
      >
        {body}
      </Link>
    );
  }

  return (
    <article className={`metric-card metric-card--${tone}`}>{body}</article>
  );
}
