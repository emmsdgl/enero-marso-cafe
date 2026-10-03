import Link from "next/link";
import type { MenuItem } from "@/data/menu";
import BrandArt from "./BrandArt";
import MenuRow from "./MenuRow";

type Props = {
  id: string;
  kind: "coffee" | "food";
  title: string;
  tagline: string;
  body: string;
  items: MenuItem[];
};

export default function MenuSection({ id, kind, title, tagline, body, items }: Props) {
  return (
    <section id={id} className={`menu-section is-${kind}`} aria-labelledby={`${id}-title`}>
      <BrandArt kind="sprig" className="menu-sprig" />
      <div className="menu-intro">
        <h2 id={`${id}-title`}>
          <span>Our</span> {title}
        </h2>
        <p className="menu-tagline">
          <span className="menu-tagline-text">
            {/* Two lines broken at the comma, as in the Canva design */}
            {tagline.split(/(?<=,)\s+/).map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </span>
          <BrandArt kind={kind === "coffee" ? "cup" : "cutlery"} className="menu-tagline-icon" />
        </p>
        <p className="menu-body">{body}</p>
        <Link href={`/menu#${kind}`} className="pill-btn">View full menu</Link>
      </div>
      <MenuRow items={items} kind={kind} label={`${title} highlights`} />
    </section>
  );
}
