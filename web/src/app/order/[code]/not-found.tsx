import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { branches } from "@/data/branches";

/** A wrong, cut-off or replaced order link */
export default function OrderNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <article className="track" aria-labelledby="lost-title">
          <header className="track-head">
            <p className="track-code">Order link</p>
            <h1 id="lost-title">This order link doesn&rsquo;t open.</h1>
          </header>
          <p className="track-lost">
            The link may be cut off, or the cafe may have sent you a newer one. Check your texts for the latest link, or ask the branch to send a new one:
          </p>
          <ul className="track-lost-list">
            {branches.map((b) => (
              <li key={b.id}>
                <a href={b.socials.facebook} target="_blank" rel="noopener noreferrer">{b.name}</a> on Facebook
              </li>
            ))}
          </ul>
          <p>
            <Link href="/order" className="order-link">Start a new order</Link>
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
