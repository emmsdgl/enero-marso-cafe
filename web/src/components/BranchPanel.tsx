import type { Branch } from "@/data/branches";
import { FacebookIcon, InstagramIcon, PinIcon } from "./Icons";
import OpenBadge from "./OpenBadge";

/** One branch: name, what it is, where, when, and how to get there */
export default function BranchPanel({ branch }: { branch: Branch }) {
  const id = `branch-${branch.id}`;
  return (
    <section className={`branch is-${branch.id}`} aria-labelledby={id}>
      <div className="branch-head">
        <h2 id={id}>{branch.name}</h2>
        <OpenBadge branchId={branch.id} />
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
                {branch.hoursText.map((r) => (
                  <tr key={r.days}>
                    <th scope="row">{r.days}</th>
                    <td>{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
