import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/staff";

export const metadata: Metadata = { title: "Help" };

/** The run-through for a shift with online orders: before opening, each kind of order, problems, closing */
export default async function HelpPage() {
  const me = await requireStaff();
  const manager = me.role !== "employee";
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
            <li>Check the address and the map pin on the order&rsquo;s page. Use <b>Copy for Lalamove</b> to get the rider&rsquo;s fee.</li>
            <li>Enter the fee (inside the free area it starts at ₱0) and tap <b>Confirm and send fee</b>. Nothing is made yet.</li>
            <li>The customer pays and sends a reference number. Find that payment, with the same amount, in the account&rsquo;s app history.</li>
            <li>Found it: <b>Payment received</b> (that also accepts the order). Not there: <b>Not found</b>, and they&rsquo;re asked to check.</li>
            <li>Prepare it, <b>Mark ready</b>, book the rider, paste the Lalamove tracking link, then <b>Out for delivery</b>.</li>
            <li>When it arrives, tap <b>Delivered</b>.</li>
          </ol>
        </section>

        <section className="staff-card">
          <h2>Messages</h2>
          <ul>
            <li>A gold &ldquo;new message&rdquo; label on a card means the customer wrote. Tap it to reply; quick replies fill the box for you.</li>
            <li>The chat closes 30 minutes after pickup or delivery. After that, call the customer.</li>
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
