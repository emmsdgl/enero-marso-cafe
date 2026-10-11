import type { Branch } from "@/data/branches";
import { describeWeek, type Schedule } from "@/lib/hours";
import { FacebookIcon, InstagramIcon, PinIcon } from "./Icons";
import OpenBadge from "./OpenBadge";

type Upcoming = { day: string; label: string; hours: string };

/** One branch: name, what it is, where, when (including holidays coming up), and how to get there */
export default function BranchPanel({ branch, schedule, upcoming }: { branch: Branch; schedule: Schedule; upcoming: Upcoming[] }) {
  const id = `branch-${branch.id}`;
  return (
    <section className={`branch is-${branch.id}`} aria-labelledby={id}>
      <div className="branch-head">
        <h2 id={id}>{branch.name}</h2>
        <OpenBadge schedule={schedule} />
      </div>
      <p className="branch-tagline">{branch.tagline}</p>

      <dl className="branch-facts">
        <div>
          <dt>What</dt>
          <dd>
            {branch.kind} · {branch.serves}
          </dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>
            {branch.address}
            {branch.landmark && <small>{branch.landmark}</small>}
          </dd>
        </div>
        <div>
          <dt>Hours</dt>
          <dd>
            <table className="branch-hours">
              <tbody>
                {describeWeek(schedule.week).map((r) => (
                  <tr key={r.days}>
                    <th scope="row">{r.days}</th>
                    <td>{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {upcoming.length > 0 && (
              <ul className="branch-special">
                {upcoming.map((u) => (
                  <li key={u.day}>
                    <b>{u.label}</b> {u.hours}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>

      <div className="branch-actions">
        <a className="pill-btn" href={branch.mapsUrl} target="_blank" rel="noopener noreferrer">
          <PinIcon /> Get directions
        </a>
            <a className="social-btn" href={branch.socials.instagram} target="_blank" rel="noopener noreferrer" aria-label={`${branch.name} on Instagram`}>
              <InstagramIcon />
            </a>
            <a className="social-btn" href={branch.socials.facebook} target="_blank" rel="noopener noreferrer" aria-label={`${branch.name} on Facebook`}>
              <FacebookIcon />
            </a>
      </div>
    </section>
  );
}
