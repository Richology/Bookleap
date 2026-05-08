type BookLeapCTAProps = {
  children: React.ReactNode;
  href: string;
  tone?: "ink" | "paper";
  className?: string;
};

export function BookLeapCTA({
  children,
  href,
  tone = "ink",
  className = "",
}: BookLeapCTAProps) {
  return (
    <a
      href={href}
      className={`bookleap-cta ${tone === "paper" ? "bookleap-cta--paper" : ""} ${className}`}
    >
      <span className="bookleap-cta__label">{children}</span>
      <span className="bookleap-cta__charm" aria-hidden="true">
        <span className="bookleap-cta__arrow">→</span>
      </span>
      <span className="bookleap-cta__bubble bookleap-cta__bubble--one" aria-hidden="true" />
      <span className="bookleap-cta__bubble bookleap-cta__bubble--two" aria-hidden="true" />
      <span className="bookleap-cta__bubble bookleap-cta__bubble--three" aria-hidden="true" />
      <span className="bookleap-cta__bubble bookleap-cta__bubble--four" aria-hidden="true" />
    </a>
  );
}
