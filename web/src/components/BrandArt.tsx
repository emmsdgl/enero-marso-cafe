/**
 * Line art from the Canva design (cup, cutlery, leaf sprig).
 * The PNGs are single-colour stencils, painted with currentColor so each section tints them.
 */
type Kind = "cup" | "cutlery" | "sprig";

export default function BrandArt({ kind, className = "" }: { kind: Kind; className?: string }) {
  return <span className={`brand-art brand-art--${kind} ${className}`.trim()} aria-hidden="true" />;
}
