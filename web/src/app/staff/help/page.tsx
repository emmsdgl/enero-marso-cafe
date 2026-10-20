import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/staff";
import { ALL_ROLES, isManager } from "@/lib/roles";

export const metadata: Metadata = { title: "Help" };

/** The run-through for a shift with online orders: before opening, each kind of order, problems, closing */
export default async function HelpPage() {
  const me = await requireStaff(ALL_ROLES);
  const manager = isManager(me);
  // Riders, and counter staff sent out with a delivery
  const delivering = (
    <section className="staff-card">
      <h2>Delivering</h2>
      <ol>
        <li>Your deliveries are on <Link href="/staff/deliveries">Deliveries</Link>: the address and map, the customer&rsquo;s number and chat, and what to collect.</li>
        <li>Turn on notifications in <Link href="/staff/account#notifications">Account</Link>, so a new delivery reaches your phone.</li>
        <li>When the counter marks it ready, take it and tap <b>On my way</b>. The customer sees it&rsquo;s coming.</li>
        <li>
          While it&rsquo;s on its way, keep Deliveries open: the customer sees where you are on a map. It&rsquo;s shared only then, and
          deleted when you&rsquo;re done. On an iPhone a locked screen pauses it.
        </li>
        <li>At the door, tap <b>Delivered</b>. If they pay cash, collect it, tick <b>I got ₱… in cash</b>, then tap <b>Delivered</b>.</li>
        <li>Can&rsquo;t find the place? Message or call the customer from the delivery. Still stuck: call the branch.</li>
        <li>Hand the cash you collected to the counter before you clock out. Deliveries shows the total.</li>
      </ol>
    </section>
  );
  if (me.role === "rider") {
    return (
      <div className="staff-page">
        <header className="staff-head">
          <h1>How delivering works</h1>
          <p>Everything you need on the road.</p>
        </header>
        <div className="help">
          {delivering}
          <section className="staff-card">
            <h2>Talk</h2>
            <p>While you&rsquo;re clocked in you can talk with the owner and the branch: open <Link href="/staff/talk">Talk</Link>, hold the button, and let go to send.</p>
          </section>
        </div>
      </div>
    );
  }
  return (
    <div className="staff-page">
      <header className="staff-head">
        <h1>How online orders work</h1>
        <p>A run-through for each shift. Keep it open on the counter tablet until it&rsquo;s second nature.</p>
      </header>

      <div className="help">
        <section className="staff-card">
          <h2>Before opening</h2>
          <ol>
            <li>Open <Link href="/staff/orders">Orders</Link> on the counter tablet. Tap <b>Turn on sound</b> and <b>Keep screen on</b>.</li>
            <li>On your phone, turn on notifications in <Link href="/staff/account#notifications">Account</Link> if you haven&rsquo;t.</li>
            <li>Mark anything that&rsquo;s run out as sold out on <Link href="/staff/menu">Menu</Link>.</li>
            {manager && <li>Check online orders (and delivery) are switched on in <Link href="/staff/branch">Branch</Link>.</li>}
          </ol>
        </section>

        <section className="staff-card">
          <h2>A pickup order</h2>
          <ol>
            <li>It rings and appears under <b>New</b>. Tap <b>Accept</b>, then ring it up in Loyverse as usual.</li>
            <li><b>Start preparing</b> when you begin, <b>Mark ready</b> when it&rsquo;s done. The customer sees each step.</li>
            <li>They show their order code at the counter and pay in cash or GCash. Tap <b>Picked up</b>.</li>
            <li>An order with a time (&ldquo;For 7:30 PM&rdquo;) should be ready by then, not as soon as it comes in.</li>
          </ol>
        </section>

        <section className="staff-card">
          <h2>A delivery order</h2>
          <ol>
            <li>It comes in with its fee already worked out from the distance. Check the address and the map pin, then tap <b>Accept</b> (or <b>Change fee</b> first).</li>
            <li>
              <b>Paid online:</b> the customer pays in the chat and sends a reference number. Find that payment, with the same amount, in the
              account&rsquo;s app history: <b>Payment received</b>, or <b>Not found</b> and they&rsquo;re asked to check. Nothing is made before that.
            </li>
            <li><b>Cash on delivery:</b> there&rsquo;s nothing to check. The card says what the rider collects and the change to bring.</li>
            <li>Under <b>Taking it</b>, choose a rider, or someone clocked in. Their phone gets a notification.</li>
            <li>Prepare it and <b>Mark ready</b>. The rider taps <b>On my way</b> on their phone when they leave (or tap <b>Send out with …</b> here).</li>
            <li>At the door they tap <b>Delivered</b>. For cash, they tick that they got it first, and hand the cash to the counter later.</li>
            <li>Our riders all busy, and it&rsquo;s paid online? <b>Book Lalamove instead</b>, and paste its tracking link.</li>
            {manager && <li>Nobody there, or the address can&rsquo;t be found: tap <b>Couldn&rsquo;t deliver</b> and choose why. The customer reads it in their chat.</li>}
          </ol>
        </section>

        {delivering}

        <section className="staff-card">
          <h2>Messages</h2>
          <ul>
            <li>A gold &ldquo;new message&rdquo; label on a card means the customer wrote. Tap it to reply; quick replies fill the box for you.</li>
            <li>The chat closes 30 minutes after pickup or delivery. After that, call the customer.</li>
          </ul>
        </section>

        <section className="staff-card">
          <h2>Talk</h2>
          <ul>
            <li>Talk is a walkie-talkie between the owner and whoever is on shift. Open <Link href="/staff/talk">Talk</Link>, tap <b>Turn on Talk</b>, then hold the round button to speak and let go to stop.</li>
            <li>Once it&rsquo;s on, a small talk button stays in the corner while you use Orders and the other screens.</li>
            <li>The counter tablet listens all day. After it restarts, tap <b>Tap to turn on Talk sound</b> on it.</li>
            <li>You hear talk live only while Talk is on and the app is open. On an iPhone keep the app on screen: in the background you get a <b>Missed talk</b> notification instead, and can play it on Talk. (Turn on notifications in <Link href="/staff/account#notifications">Account</Link>.)</li>
            <li>One person talks at a time, up to a minute per press. Each press is kept for 7 days, then deleted.</li>
            <li>Talk is for people who are clocked in, and the owner. Clocking out turns it off.</li>
          </ul>
        </section>

        <section className="staff-card">
          <h2>Cancelling</h2>
          <ul>
            <li>You can cancel until preparing starts. Pick the reason the customer will see.</li>
            <li>A delivery that was already paid needs a refund from the account it was paid to. The board marks it &ldquo;Paid: refund&rdquo;.</li>
          </ul>
        </section>

        <section className="staff-card">
          <h2>When something goes wrong</h2>
          <ul>
            <li><b>Customer lost their order page:</b> on the order&rsquo;s page, <b>Make a new link</b> and text it to them.</li>
            <li><b>Too busy:</b> {manager ? <>pause online orders in <Link href="/staff/branch">Branch</Link>; customers see it at once.</> : "ask your manager to pause online orders."}</li>
            {manager && <li><b>Prank or no-show:</b> on the order&rsquo;s page, <b>Block this number</b>. It can&rsquo;t order online at either branch.</li>}
            <li><b>No sound or no orders coming in:</b> reload the Orders page and tap <b>Turn on sound</b> again.</li>
            <li><b>Forgot your password:</b> on the sign-in page, tap <b>Reset it</b>. We email you a 6-digit code.</li>
          </ul>
        </section>

        {manager && (
          <section className="staff-card">
            <h2>Changing the menu</h2>
            <ul>
              <li>On <Link href="/staff/menu">Menu</Link>, <b>Edit group</b> changes a group&rsquo;s name, note and cup sizes. Renaming a size keeps its prices; removing one deletes its prices from every item in the group.</li>
              <li><b>Add item</b> puts a new drink or dish in a group. <b>Edit</b> on an item changes its prices, its description (customers read it behind the (i)) or its group.</li>
              <li>An item without a price, or a group with nothing in it, stays off the website until it&rsquo;s ready.</li>
              <li>Ran out for today? Mark it <b>sold out</b> instead of removing it.</li>
            </ul>
          </section>
        )}

        {manager && (
          <section className="staff-card">
            <h2>Setting up the counter tablet</h2>
            <ol>
              <li>On the tablet, open the website and add <b>/kiosk</b> to the address (the clock-in screen).</li>
              <li>Install it: on Android tap <b>Install the app</b>; on an iPad tap <b>Share</b>, then <b>Add to Home Screen</b>. Then open <b>EM Clock-in</b> from the home screen.</li>
              <li>In the app, tap <b>Set up this tablet</b>, sign in with your password, and tap <b>Make this the clock-in tablet</b>. You&rsquo;re signed out on the tablet straight away.</li>
              <li>Leave it on the clock-in screen. It keeps the screen on; after a restart, tap <b>Tap to turn on Talk sound</b>.</li>
              <li>A lost or replaced tablet: remove it under <Link href="/staff/branch">Branch</Link> &gt; Clock-in &gt; <b>Manage tablet</b>.</li>
            </ol>
          </section>
        )}

        <section className="staff-card">
          <h2>Closing</h2>
          <ul>
            <li>Online orders stop by themselves before closing ({manager ? "the time is set in Branch" : "your manager sets how early"}).</li>
            <li>Before you leave, check <b>Finished tonight</b>: nothing should be left under New, In progress or Ready.</li>
            {manager && <li>For a holiday or a change of hours, add a <b>special day</b> in <Link href="/staff/branch">Branch</Link>.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
