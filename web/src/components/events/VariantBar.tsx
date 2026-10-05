import Link from "next/link";

const designs = [
  { id: "a", name: "Rate card" },
  { id: "b", name: "Invitations" },
  { id: "c", name: "Planner" },
];

/** Temporary: switch between the three design options while the owner picks one */
export default function VariantBar({ current }: { current: string }) {
  return (
    <nav className="variant-bar" aria-label="Design options">
      <span>Design options</span>
      {designs.map((d) => (
        <Link key={d.id} href={`/reservations/${d.id}`} aria-current={d.id === current ? "page" : undefined}>
          {d.id.toUpperCase()} · {d.name}
        </Link>
      ))}
    </nav>
  );
}
