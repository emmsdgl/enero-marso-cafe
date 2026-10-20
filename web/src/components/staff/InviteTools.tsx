"use client";

import { useState, useTransition } from "react";
import { makeInviteLink, sendInvite, type ActionState } from "@/app/staff/actions";

/**
 * In Manage, for someone who hasn't set up yet: email their setup link, or copy one to send by text
 * or chat. Either way a new link replaces the old one.
 */
export default function InviteTools({ id, status, emailOn, hasLink }: { id: string; status: string; emailOn: boolean; hasLink: boolean }) {
  const [msg, setMsg] = useState<ActionState>();
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const email = () => start(async () => { setUrl(null); setMsg(await sendInvite(id)); });
  const link = () =>
    start(async () => {
      setMsg(undefined);
      const r = await makeInviteLink(id);
      if (r.error || !r.path) return setMsg({ error: r.error ?? "Couldn't make a link. Try again." });
      setUrl(`${window.location.origin}${r.path}`);
    });
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="edit-sheet-part invite-tools">
      <span>
        <b>Setup link</b>
        <small>{status}</small>
      </span>
      <span className="invite-do">
        {emailOn && (
          <button type="button" className="staff-btn is-small" onClick={email} disabled={pending}>
            {hasLink ? "Email a new link" : "Email the invite"}
          </button>
        )}
        <button type="button" className="staff-btn is-small is-quiet" onClick={link} disabled={pending}>Copy setup link</button>
      </span>
      {url && (
        <div className="relink">
          <p className="staff-note is-ok">New link ready, good for 7 days. It&rsquo;s only shown here once{hasLink ? ", and the old one stopped working" : ""}.</p>
          <input className="relink-url" readOnly value={url} aria-label="Setup link" onFocus={(e) => e.currentTarget.select()} />
          <div className="relink-actions">
            <button type="button" className="staff-btn is-primary is-small" onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
          </div>
        </div>
      )}
      {msg?.ok && <p className="staff-msg is-ok" role="status">{msg.ok}</p>}
      {msg?.error && <p className="staff-msg is-error" role="alert">{msg.error}</p>}
    </div>
  );
}
