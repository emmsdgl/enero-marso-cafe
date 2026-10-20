import type { Metadata } from "next";
import Link from "next/link";
import ActionButton from "@/components/staff/ActionButton";
import ActionForm from "@/components/staff/ActionForm";
import EditSheet from "@/components/staff/EditSheet";
import SizeRows from "@/components/staff/SizeRows";
import { branches } from "@/data/branches";
import { peso, type BranchId, type MenuAddon, type MenuCategory, type MenuItem } from "@/lib/menu";
import { hasPrice } from "@/lib/menu-rules";
import { loadMenus } from "@/lib/menu-store";
import { requireStaff } from "@/lib/staff";
import { isManager } from "@/lib/roles";
import {
  deleteAddon, deleteGroup, deleteItem, moveGroup, moveItem, saveAddon, saveGroup, saveMenuItem, saveMenuNotes, setAddonAvailable, setItemAvailable,
} from "./actions";

export const metadata: Metadata = { title: "Menu" };

type Group = { id: string; title: string };

export default async function StaffMenuPage({ searchParams }: PageProps<"/staff/menu">) {
  const me = await requireStaff();
  const mine = branches.filter((b) => me.role === "admin" || b.id === me.branchId);
  const want = (await searchParams).branch;
  const branch = mine.find((b) => b.id === want) ?? mine[0];
  const menu = (await loadMenus())[branch.id];
  const canEdit = isManager(me);
  const items = menu.categories.flatMap((c) => c.items);
  const soldOut = items.filter((i) => !i.available).length;
  const unpriced = items.filter((i) => !hasPrice(i.prices)).length;
  const groups: Group[] = menu.categories.map((c) => ({ id: c.id, title: c.title }));

  return (
    <div className="staff-page">
      <header className="staff-head is-split">
        <div>
          <h1>Menu</h1>
          <p>
            Mark an item sold out the moment it runs out; the website shows it right away.
            {canEdit ? " Groups, sizes, items and prices are edited here too." : " Ask your branch manager to change names or prices."}
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
      {canEdit && unpriced > 0 && (
        <p className="staff-note is-warn">
          {unpriced === 1 ? "1 item needs a price" : `${unpriced} items need prices`} before customers can see {unpriced === 1 ? "it" : "them"}.
        </p>
      )}

      {menu.categories.map((c, n) => (
        <CategoryCard key={c.id} category={c} canEdit={canEdit} groups={groups} first={n === 0} last={n === menu.categories.length - 1} />
      ))}

      {canEdit && (
        <section className="staff-card menu-new-group">
          <span>
            <b>New group</b>
            <small>For a new kind of drink or food, like Pastries. It shows on the website once it has an item with a price.</small>
          </span>
          <EditSheet label="Add a group" title="New group" subtitle={branch.name}>
            <GroupForm branch={branch.id} />
          </EditSheet>
        </section>
      )}

      {(menu.addOns.length > 0 || canEdit) && <AddOns addOns={menu.addOns} canEdit={canEdit} branch={branch.id} branchName={branch.name} />}

      {canEdit && (
        <section className="staff-card" aria-labelledby="fine-print-title">
          <h2 id="fine-print-title">Fine print</h2>
          <p className="staff-help">Short lines under the menu on the website, like &ldquo;Prices include VAT&rdquo;. One per line.</p>
          <ActionForm action={saveMenuNotes} submit="Save fine print" resetOnOk={false}>
            <input type="hidden" name="branch" value={branch.id} />
            <label>
              <span className="sr-only">Fine print</span>
              <textarea name="notes" rows={4} defaultValue={menu.notes.join("\n")} maxLength={1700} />
            </label>
          </ActionForm>
        </section>
      )}
    </div>
  );
}

function CategoryCard({ category: c, canEdit, groups, first, last }: { category: MenuCategory; canEdit: boolean; groups: Group[]; first: boolean; last: boolean }) {
  const columns = c.sizes ?? ["Price"];
  return (
    <section className="staff-card" aria-labelledby={`cat-${c.id}`}>
      <div className="menu-cat-head">
        <h2 id={`cat-${c.id}`}>
          {c.title}
          {c.note && <small className="menu-cat-note"> · {c.note}</small>}
        </h2>
        {canEdit && (
          <div className="staff-actions">
            <EditSheet label="Add item" title={`New item in ${c.title}`} subtitle={c.sizes ? `Sizes: ${c.sizes.join(", ")}` : "One price"}>
              <ItemForm group={c} groups={groups} />
            </EditSheet>
            <EditSheet label="Edit group" title={`Edit ${c.title}`} subtitle={`${c.items.length} item${c.items.length === 1 ? "" : "s"}`}>
              <GroupForm group={c} />
              {!(first && last) && (
                <div className="edit-sheet-part">
                  <span>
                    <b>Place on the menu</b>
                    <small>Groups show in this order on the website.</small>
                  </span>
                  <span className="staff-actions">
                    {!first && <ActionButton action={moveGroup.bind(null, c.id, "up")} label="Move up" />}
                    {!last && <ActionButton action={moveGroup.bind(null, c.id, "down")} label="Move down" />}
                  </span>
                </div>
              )}
              <div className="edit-sheet-part is-danger">
                <span>
                  <b>Delete group</b>
                  <small>{c.items.length ? "Move or delete its items first." : "It has no items, so nothing else changes."}</small>
                </span>
                {c.items.length === 0 && <ActionButton action={deleteGroup.bind(null, c.id)} label="Delete" confirm={`Delete ${c.title}?`} />}
              </div>
            </EditSheet>
          </div>
        )}
      </div>
      {c.items.length === 0 ? (
        <p className="staff-help">No items yet.{canEdit ? " Add the first one." : ""}</p>
      ) : (
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
              {c.items.map((i, n) => (
                <tr key={i.id} className={i.available ? undefined : "is-sold-out"}>
                  <th scope="row">
                    <b>{i.name}</b>
                    {i.star && <span aria-label="Recommended"> ★</span>}
                    {i.note && <small>{i.note}</small>}
                  </th>
                  {columns.map((s, k) => (
                    <td key={s} className="num" data-size={c.sizes ? s : undefined}>{i.prices[k] == null ? "–" : peso(i.prices[k]!)}</td>
                  ))}
                  <td className="menu-status">{hasPrice(i.prices) ? <Status available={i.available} /> : <span className="tag is-warn">Needs a price</span>}</td>
                  <td className="menu-do">
                    <div className="staff-actions">
                      <ActionButton action={setItemAvailable.bind(null, i.id, !i.available)} label={i.available ? "Mark sold out" : "Back in stock"} />
                      {canEdit && (
                        <EditSheet label="Edit" title={`Edit ${i.name}`} subtitle={c.title}>
                          <ItemForm group={c} groups={groups} item={i} />
                          {c.items.length > 1 && (
                            <div className="edit-sheet-part">
                              <span>
                                <b>Place in {c.title}</b>
                                <small>Items show in this order.</small>
                              </span>
                              <span className="staff-actions">
                                {n > 0 && <ActionButton action={moveItem.bind(null, i.id, "up")} label="Move up" />}
                                {n < c.items.length - 1 && <ActionButton action={moveItem.bind(null, i.id, "down")} label="Move down" />}
                              </span>
                            </div>
                          )}
                          <div className="edit-sheet-part is-danger">
                            <span>
                              <b>Remove from the menu</b>
                              <small>For good. Past orders keep their own copy. To pause it, mark it sold out instead.</small>
                            </span>
                            <ActionButton action={deleteItem.bind(null, i.id)} label="Remove" confirm={`Remove ${i.name}?`} />
                          </div>
                        </EditSheet>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** A new or existing group: name, note, drinks or food, sizes and upsize price */
function GroupForm({ group, branch }: { group?: MenuCategory; branch?: BranchId }) {
  return (
    <ActionForm action={saveGroup} submit={group ? "Save group" : "Add group"} resetOnOk={!group} closeOnOk>
      {group ? <input type="hidden" name="id" value={group.id} /> : <input type="hidden" name="branch" value={branch} />}
      <label>Name<input name="title" defaultValue={group?.title} maxLength={40} required placeholder="e.g. Pastries" /></label>
      <label>Note <small>optional, e.g. &ldquo;Hot or iced&rdquo;</small><input name="note" defaultValue={group?.note ?? ""} maxLength={80} /></label>
      <fieldset className="menu-kind">
        <legend>Kind</legend>
        <label className="staff-check"><input type="radio" name="kind" value="drink" defaultChecked={(group?.kind ?? "drink") === "drink"} /> Drinks <small>add-ons can go on them</small></label>
        <label className="staff-check"><input type="radio" name="kind" value="food" defaultChecked={group?.kind === "food"} /> Food</label>
      </fieldset>
      <SizeRows initial={group?.sizes ?? null} items={(group?.items ?? []).map((i) => ({ name: i.name, prices: i.prices }))} />
      <label>
        Upsize price (₱) <small>optional: the extra for a bigger cup</small>
        <input name="upsize" type="number" inputMode="numeric" min={1} max={500} defaultValue={group?.upsizePrice ?? ""} placeholder="–" />
      </label>
    </ActionForm>
  );
}

/** A new item in a group, or an existing one (with a choice of group to move it to) */
function ItemForm({ group, groups, item }: { group: MenuCategory; groups: Group[]; item?: MenuItem }) {
  const columns = group.sizes ?? ["Price"];
  return (
    <ActionForm action={saveMenuItem} submit={item ? "Save" : "Add item"} resetOnOk={!item} closeOnOk>
      {item && <input type="hidden" name="id" value={item.id} />}
      {/* The sizes these price boxes belong to, so a change made meanwhile can't shift them */}
      <input type="hidden" name="was" value={JSON.stringify(group.sizes)} />
      <label>Name<input name="name" defaultValue={item?.name} maxLength={60} required /></label>
      <label>Note <small>optional, e.g. &ldquo;6 pcs&rdquo;</small><input name="note" defaultValue={item?.note ?? ""} maxLength={80} /></label>
      <label>
        Description <small>optional, shown when customers tap (i) on the order page</small>
        <textarea name="description" rows={3} maxLength={300} defaultValue={item?.description ?? ""} placeholder="What's in it, how it tastes" />
      </label>
      <div className="menu-prices">
        {columns.map((s, n) => (
          <label key={s}>
            {s} (₱)
            <input name={`price-${n}`} type="number" inputMode="numeric" min={1} defaultValue={item?.prices[n] ?? ""} placeholder="–" />
          </label>
        ))}
      </div>
      {group.sizes && <small className="staff-help">Leave a size empty if it isn&rsquo;t offered.</small>}
      <label className="staff-check"><input type="checkbox" name="star" defaultChecked={item?.star} /> Recommended (★)</label>
      {item && groups.length > 1 ? (
        <label>
          Group <small>moving to a group with other sizes clears the prices; add them again there</small>
          <select name="group" defaultValue={group.id}>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </label>
      ) : (
        <input type="hidden" name="group" value={group.id} />
      )}
    </ActionForm>
  );
}

function AddOns({ addOns, canEdit, branch, branchName }: { addOns: MenuAddon[]; canEdit: boolean; branch: BranchId; branchName: string }) {
  return (
    <section className="staff-card" aria-labelledby="addons-title">
      <div className="menu-cat-head">
        <h2 id="addons-title">Add-ons <small className="menu-cat-note">· on drinks</small></h2>
        {canEdit && (
          <div className="staff-actions">
            <EditSheet label="Add an add-on" title="New add-on" subtitle={branchName}>
              <ActionForm action={saveAddon} submit="Add" closeOnOk>
                <input type="hidden" name="branch" value={branch} />
                <label>Name<input name="name" maxLength={40} required placeholder="e.g. Oat milk" /></label>
                <label>Price (₱)<input name="price" type="number" inputMode="numeric" min={1} required /></label>
              </ActionForm>
            </EditSheet>
          </div>
        )}
      </div>
      {addOns.length === 0 ? (
        <p className="staff-help">No add-ons yet.</p>
      ) : (
        <div className="staff-table-wrap">
          <table className="staff-table menu-table">
            <thead>
              <tr><th scope="col">Add-on</th><th scope="col" className="num">Price</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {addOns.map((a) => (
                <tr key={a.id} className={a.available ? undefined : "is-sold-out"}>
                  <th scope="row"><b>{a.name}</b></th>
                  <td className="num">+{peso(a.price)}</td>
                  <td className="menu-status"><Status available={a.available} /></td>
                  <td className="menu-do">
                    <div className="staff-actions">
                      <ActionButton action={setAddonAvailable.bind(null, a.id, !a.available)} label={a.available ? "Mark sold out" : "Back in stock"} />
                      {canEdit && (
                        <EditSheet label="Edit" title={`Edit ${a.name}`} subtitle={branchName}>
                          <ActionForm action={saveAddon} submit="Save" resetOnOk={false} closeOnOk>
                            <input type="hidden" name="id" value={a.id} />
                            <label>Name<input name="name" defaultValue={a.name} maxLength={40} required /></label>
                            <label>Price (₱)<input name="price" type="number" inputMode="numeric" min={1} defaultValue={a.price} required /></label>
                          </ActionForm>
                          <div className="edit-sheet-part is-danger">
                            <span>
                              <b>Remove this add-on</b>
                              <small>For good. Past orders keep their own copy.</small>
                            </span>
                            <ActionButton action={deleteAddon.bind(null, a.id)} label="Remove" confirm={`Remove ${a.name}?`} />
                          </div>
                        </EditSheet>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Status({ available }: { available: boolean }) {
  return available ? <span className="tag is-ok">Available</span> : <span className="tag is-sold">Sold out</span>;
}
