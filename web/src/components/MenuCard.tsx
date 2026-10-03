import Image from "next/image";
import { peso, type MenuItem } from "@/data/menu";
import { CupIcon, CutleryIcon } from "./Icons";

export default function MenuCard({ item, kind }: { item: MenuItem; kind: "coffee" | "food" }) {
  const Fallback = kind === "coffee" ? CupIcon : CutleryIcon;
  return (
    <article className="menu-card">
      <div className="menu-card-photo">
        {item.photo ? (
          <Image src={item.photo} alt={item.name} fill sizes="(max-width: 40rem) 72vw, 18rem" />
        ) : (
          <div className="menu-card-empty">
            <Fallback />
            <span>Photo coming soon</span>
          </div>
        )}
      </div>
      <div className="menu-card-label">
        <h3>{item.name}</h3>
        <p>{peso(item.price)}</p>
      </div>
    </article>
  );
}
