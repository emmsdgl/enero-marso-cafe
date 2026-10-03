import Link from "next/link";
import type { MenuItem } from "@/data/menu";
import { CupIcon, CutleryIcon, Sprig } from "./Icons";
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
  const Icon = kind === "coffee" ? CupIcon : CutleryIcon;
  return (
    <section id={id} className={`menu-section is-${kind}`} aria-labelledby={`${id}-title`}>
      <Sprig className="menu-sprig" />
      <div className="menu-intro">
        <h2 id={`${id}-title`}>
          <span>Our</span> {title}
        </h2>
        <p className="menu-tagline">
          {tagline}
          <Icon className="menu-tagline-icon" />
        </p>
        <p className="menu-body">{body}</p>
        <Link href={`/menu#${kind}`} className="pill-btn">View full menu</Link>
      </div>
      <MenuRow items={items} kind={kind} label={`${title} highlights`} />
    </section>
  );
}
