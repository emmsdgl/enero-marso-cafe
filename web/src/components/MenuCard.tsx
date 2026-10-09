import Image from "next/image";
import { peso, type Highlight } from "@/lib/menu";
import BrandArt from "./BrandArt";

export default function MenuCard({ item, kind }: { item: Highlight; kind: "coffee" | "food" }) {
  return (
    <article className={`menu-card${item.available ? "" : " is-sold-out"}`}>
      <div className="menu-card-photo">
        {item.photo ? (
          <Image src={item.photo} alt={item.name} fill sizes="(max-width: 40rem) 72vw, 18rem" />
        ) : (
          <div className="menu-card-empty">
            <BrandArt kind={kind === "coffee" ? "cup" : "cutlery"} />
            <span>Photo coming soon</span>
          </div>
        )}
      </div>
      <div className="menu-card-label">
        <h3>{item.name}</h3>
        <p>{item.from && <small>from </small>}{peso(item.price)}{!item.available && <small className="menu-card-sold"> · sold out</small>}</p>
      </div>
    </article>
  );
}
