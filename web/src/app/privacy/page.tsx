import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { PRIVACY } from "@/data/privacy";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "What Enero Marso Cafe collects when you order online, why, who sees it, and how long it's kept.",
};

/** The privacy notice for online ordering, under the Data Privacy Act of 2012 (Republic Act 10173) */
export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <header className="page-head">
          <h1>Privacy</h1>
          <p className="page-script">What we keep, and why</p>
        </header>
        <article className="legal">
          <p className="legal-lead">
            {PRIVACY.controller} (both branches: the cafe in Western Bicutan and Cafe Noir) collects only what it needs to take
            your order and get it to you. This notice follows the Data Privacy Act of 2012 (Republic Act 10173).
          </p>

          <section>
            <h2>What we collect</h2>
            <ul>
              <li><b>When you order:</b> your name, mobile number, what you ordered, and any notes.</li>
              <li><b>For delivery:</b> your address, landmark and the pin you set on the map.</li>
              <li><b>Messages</b> you send the cafe about your order, and the cafe&rsquo;s replies.</li>
              <li><b>For delivery payments:</b> the reference number from your receipt and which of our accounts you paid.</li>
              <li><b>Your internet address (IP),</b> only to limit how many orders one connection can place, which stops fake orders.</li>
              <li><b>On your phone:</b> the link to your order, kept in your browser so you can find it again. We don&rsquo;t use advertising or tracking cookies.</li>
            </ul>
          </section>

          <section>
            <h2>Why</h2>
            <p>
              To prepare your order, hand it over or deliver it, reach you about it, check your payment, and keep fake orders out.
              We don&rsquo;t sell your details or use them for advertising.
            </p>
          </section>

          <section>
            <h2>Who sees it</h2>
            <ul>
              <li><b>The branch&rsquo;s staff,</b> to make and hand over your order. Staff phone alerts show the order code, never your name or number.</li>
              <li>
                <b>Our rider,</b> who delivers your order: your first name, number, address and pin, what you ordered, and what to
                collect if you pay cash. Their phone alerts show only the order code and the distance.
              </li>
              <li><b>Lalamove,</b> only when our riders are busy and you paid online: your name, number, address and pin.</li>
              <li>
                <b>The services that run this site:</b> Vercel (hosting) and Neon (database), both in Singapore. Pusher only carries
                &ldquo;something changed&rdquo; signals, without your details. The map comes from OpenFreeMap, which sees the area you view.
              </li>
              <li><b>Table and event requests</b> go through Facebook Messenger or a phone call, so Facebook&rsquo;s own privacy policy applies to those.</li>
            </ul>
          </section>

          <section>
            <h2>How long</h2>
            <p>
              We keep your order details for one year. After that, your name, number, address, pin, notes, messages and payment
              reference are removed automatically, and your order link stops working. We keep only what was ordered and the totals,
              for the cafe&rsquo;s books.
            </p>
          </section>

          <section>
            <h2>Your rights</h2>
            <p>
              You can ask to see the details we have about you, correct them, or have them deleted sooner (unless we still need
              them for an order in progress). You can also object to how we use them. If you&rsquo;re not satisfied with our answer,
              you can complain to the National Privacy Commission at <a href="https://privacy.gov.ph" target="_blank" rel="noopener noreferrer">privacy.gov.ph</a>.
            </p>
          </section>

          <section>
            <h2>Contact us</h2>
            <p>
              Call or text <a href={`tel:${PRIVACY.tel}`} className="nowrap">{PRIVACY.phone}</a>, or message{" "}
              <a href={PRIVACY.facebook} target="_blank" rel="noopener noreferrer">{PRIVACY.controller}</a> on Facebook. Tell us your
              order code if you have it.
            </p>
          </section>

          <p className="legal-updated">Last updated {PRIVACY.updated}</p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
