import ActionButton from "@/components/staff/ActionButton";
import ActionForm from "@/components/staff/ActionForm";
import { DAY_NAMES, describeWeek, formatWindow, manilaClock, shiftDate, toTimeInput, WEEK_ORDER, type Schedule } from "@/lib/hours";
import type { SpecialDay } from "@/lib/hours-store";
import { removeSpecialDayAction, saveSpecialDayAction, saveWeeklyHours } from "../actions";

const dayLabel = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-PH", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" });

/** Staff > Branch > Opening hours: the usual week, and special days such as holidays */
export default function HoursSetup({ branchId, schedule, special }: { branchId: string; schedule: Schedule; special: SpecialDay[] }) {
  const today = manilaClock().date;
  return (
    <div className="hours-setup">
      <h3>Opening hours</h3>
      <p className="staff-help">
        What the website shows, and when online orders are taken. A closing time earlier than the opening time runs past midnight,
        like 6 PM to 1 AM.
      </p>
      <p className="hours-now">
        {describeWeek(schedule.week).map((r) => (
          <span key={r.days}><b>{r.days}</b> {r.time}</span>
        ))}
      </p>

      <details className="staff-edit">
        <summary>Change the usual hours</summary>
        <ActionForm action={saveWeeklyHours} submit="Save hours" resetOnOk={false}>
          <input type="hidden" name="branch" value={branchId} />
          <table className="hours-table">
            <thead>
              <tr><th scope="col">Day</th><th scope="col">Opens</th><th scope="col">Closes</th><th scope="col"><span className="sr-only">Closed</span></th></tr>
            </thead>
            <tbody>
              {WEEK_ORDER.map((d) => {
                const w = schedule.week[d];
                return (
                  <tr key={d}>
                    <th scope="row">{DAY_NAMES[d]}</th>
                    <td><input type="time" name={`open-${d}`} defaultValue={w ? toTimeInput(w.open) : ""} aria-label={`${DAY_NAMES[d]} opens`} /></td>
                    <td><input type="time" name={`close-${d}`} defaultValue={w ? toTimeInput(w.close) : ""} aria-label={`${DAY_NAMES[d]} closes`} /></td>
                    <td><label className="staff-check hours-closed"><input type="checkbox" name={`closed-${d}`} defaultChecked={!w} /> Closed</label></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ActionForm>
      </details>

      <h4>Special days</h4>
      <p className="staff-help">Holidays and events: closed, or different hours, on one date. The website shows them three weeks ahead.</p>
      {special.length === 0 ? (
        <p className="staff-empty">None coming up.</p>
      ) : (
        <ul className="setup-list">
          {special.map((s) => (
            <li key={s.day}>
              <span>
                <b>{s.day === today ? "Today" : dayLabel(s.day)}</b>
                <small>{formatWindow(s.window)}{s.note && ` · ${s.note}`}</small>
              </span>
              <ActionButton action={removeSpecialDayAction.bind(null, branchId, s.day)} label="Remove" confirm="Go back to the usual hours that day?" />
            </li>
          ))}
        </ul>
      )}
      <details className="staff-edit">
        <summary>Add a special day</summary>
        <ActionForm action={saveSpecialDayAction} submit="Save special day">
          <input type="hidden" name="branch" value={branchId} />
          <label>Date<input type="date" name="day" min={today} max={shiftDate(today, 366)} required /></label>
          <label className="staff-check"><input type="checkbox" name="closed" defaultChecked /> Closed all day</label>
          <div className="hours-pair">
            <label>Opens <small>if not closed</small><input type="time" name="open" /></label>
            <label>Closes<input type="time" name="close" /></label>
          </div>
          <label>Note <small>optional, shown to staff</small><input name="note" maxLength={60} placeholder="Christmas Day" /></label>
        </ActionForm>
      </details>
    </div>
  );
}
