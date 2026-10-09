import type { Metadata } from "next";
import Link from "next/link";
import ActionButton from "@/components/staff/ActionButton";
import ActionForm from "@/components/staff/ActionForm";
import { branches } from "@/data/branches";
import { peso, type MenuCategory } from "@/lib/menu";
import { loadMenus } from "@/lib/menu-store";
import { requireStaff } from "@/lib/staff";
import { saveAddon, saveMenuItem, setAddonAvailable, setItemAvailable } from "./actions";

export const metadata: Metadata = { title: "Menu" };

export default async function StaffMenuPage({ searchParams }: PageProps<"/staff/menu">) {
  const me = await requireStaff();
  const mine = branches.filter((b) => me.role === "admin" || b.id === me.branchId);
  const want = (await searchParams).branch;
  const branch = mine.find((b) => b.id === want) ?? mine[0];
  const menu = (await loadMenus())[branch.id];
  const canEdit = me.role !== "employee";
  const soldOut = menu.categories.flatMap((c) => c.items).filter((i) => !i.available).length;

  return (
    <div className="staff-page">
      <header className="staff-head is-split">
        <div>
          <h1>Menu</h1>
          <p>
            Mark an item sold out the moment it runs out; the website shows it right away.
            {canEdit ? " Names and prices are edited here too." : " Ask your branch manager to change names or prices."}
          </p>
        </div>
        {mine.length > 1 && (
          <nav className="seg" aria-label="Branch">
            {mine.map((b) => (
              <Link key={b.id} href={`/staff/menu?branch=${b.id}`} aria-current={b.id === branch.id ? "page" : undefined}>
                {b.name.replace("Enero Marso ", "")}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <p className={`staff-note ${soldOut ? "is-warn" : "is-ok"}`} role="status">
        {soldOut === 0 ? `Everything on the ${branch.name} menu is available.` : `${soldOut} sold out at ${branch.name} right now.`}
      </p>

      {menu.categories.map((c) => (
        <CategoryCard key={c.id} category={c} canEdit={canEdit} />
      ))}

      {menu.addOns.length > 0 && (
        <section className="staff-card" aria-labelledby="addons-title">
          <h2 id="addons-title">Add-ons</h2>
          <div className="staff-table-wrap">
            <table className="staff-table menu-table">
              <thead>
                <tr><th scope="col">Add-on</th><th scope="col" className="num">Price</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {menu.addOns.map((a) => (
                  <tr key={a.id} className={a.available ? undefined : "is-sold-out"}>
                    <th scope="row"><b>{a.name}</b></th>
                    <td className="num">+{peso(a.price)}</td>
                    <td className="menu-status"><Status available={a.available} /></td>
                    <td className="menu-do">
                      <div className="staff-actions">
                        <ActionButton action={setAddonAvailable.bind(null, a.id, !a.available)} label={a.available ? "Mark sold out" : "Back in stock"} />
                        {canEdit && (
                          <details className="staff-edit">
                            <summary>Edit</summary>
                            <ActionForm action={saveAddon} submit="Save" resetOnOk={false}>
                              <input type="hidden" name="id" value={a.id} />
                              <label>Name<input name="name" defaultValue={a.name} maxLength={40} required /></label>
                              <label>Price (₱)<input name="price" type="number" inputMode="numeric" min={1} defaultValue={a.price} required /></label>
                            </ActionForm>
                          </details>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function CategoryCard({ category: c, canEdit }: { category: MenuCategory; canEdit: boolean }) {
  const columns = c.sizes ?? ["Price"];
  return (
    <section className="staff-card" aria-labelledby={`cat-${c.id}`}>
      <h2 id={`cat-${c.id}`}>
        {c.title}
        {c.note && <small className="menu-cat-note"> · {c.note}</small>}
      </h2>
      <div className="staff-table-wrap">
        <table className="staff-table menu-table">
          <thead>
            <tr>
              <th scope="col">Item</th>
              {columns.map((s) => <th key={s} scope="col" className="num">{s}</th>)}
              <th scope="col">Status</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {c.items.map((i) => (
              <tr key={i.id} className={i.available ? undefined : "is-sold-out"}>
                <th scope="row">
                  <b>{i.name}</b>
                  {i.star && <span aria-label="Recommended"> ★</span>}
                  {i.note && <small>{i.note}</small>}
                </th>
                {columns.map((s, n) => (
                  <td key={s} className="num" data-size={c.sizes ? s : undefined}>{i.prices[n] == null ? "–" : peso(i.prices[n]!)}</td>
                ))}
                <td className="menu-status"><Status available={i.available} /></td>
                <td className="menu-do">
                  <div className="staff-actions">
                    <ActionButton action={setItemAvailable.bind(null, i.id, !i.available)} label={i.available ? "Mark sold out" : "Back in stock"} />
                    {canEdit && (
                      <details className="staff-edit">
                        <summary>Edit</summary>
                        <ActionForm action={saveMenuItem} submit="Save" resetOnOk={false}>
                          <input type="hidden" name="id" value={i.id} />
                          <label>Name<input name="name" defaultValue={i.name} maxLength={60} required /></label>
                          <label>Note <small>optional, e.g. &ldquo;6 pcs&rdquo;</small><input name="note" defaultValue={i.note ?? ""} maxLength={80} /></label>
                          <div className="menu-prices">
                            {columns.map((s, n) => (
                              <label key={s}>
                                {s} (₱)
                                <input name={`price-${n}`} type="number" inputMode="numeric" min={1} defaultValue={i.prices[n] ?? ""} placeholder="–" />
                              </label>
                            ))}
                          </div>
                          {c.sizes && <small className="staff-help">Leave a size empty if it isn&rsquo;t offered.</small>}
                          <label className="staff-check"><input type="checkbox" name="star" defaultChecked={i.star} /> Recommended (★)</label>
                        </ActionForm>
                      </details>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Status({ available }: { available: boolean }) {
  return available ? <span className="tag is-ok">Available</span> : <span className="tag is-sold">Sold out</span>;
}
