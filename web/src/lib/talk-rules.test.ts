import { describe, expect, it } from "vitest";
import {
  CLIP_MAX_BYTES, TALK_MAX_MS, clipLength, counterName, missedTalkPayload, missedTalkRecipients, nameList, otherTalker,
  pickChannels, readClip, talkChannels, type TalkDevice,
} from "./talk-rules";

const BOTH = ["main", "noir"] as const;

describe("who is on Talk", () => {
  it("puts the admin on both branches, clocked in or not", () => {
    expect(talkChannels({ role: "admin", branchId: null }, false, BOTH)).toEqual(["main", "noir"]);
  });

  it("puts everyone else on their own branch only while they're clocked in", () => {
    expect(talkChannels({ role: "employee", branchId: "noir" }, true, BOTH)).toEqual(["noir"]);
    expect(talkChannels({ role: "manager", branchId: "main" }, true, BOTH)).toEqual(["main"]);
    expect(talkChannels({ role: "employee", branchId: "noir" }, false, BOTH)).toEqual([]);
    expect(talkChannels({ role: "manager", branchId: "main" }, false, BOTH)).toEqual([]);
  });

  it("lets the admin pick one branch or both, and ignores anything else", () => {
    expect(pickChannels(BOTH, ["noir"])).toEqual(["noir"]);
    expect(pickChannels(BOTH, ["noir", "main", "noir"])).toEqual(["main", "noir"]);
    expect(pickChannels(BOTH, [])).toEqual(["main", "noir"]);
    expect(pickChannels(BOTH, "main")).toEqual(["main", "noir"]);
    expect(pickChannels(["main"], ["noir"])).toEqual(["main"]);
  });

  it("names the counter tablet after its branch", () => {
    expect(counterName("noir")).toBe("Counter, Cafe Noir");
  });
});

describe("one talker at a time", () => {
  const now = 1_000_000;
  const floor = [
    { branchId: "main", sessionId: "ana", name: "Ana", until: now + 30_000 },
    { branchId: "noir", sessionId: "old", name: "Ben", until: now - 1 },
  ];

  it("finds someone talking on my channels", () => {
    expect(otherTalker(floor, ["main"], "me", now)?.name).toBe("Ana");
    expect(otherTalker(floor, ["main", "noir"], "me", now)?.name).toBe("Ana");
  });

  it("treats an expired hold, another branch, or my own hold as free", () => {
    expect(otherTalker(floor, ["noir"], "me", now)).toBeNull();
    expect(otherTalker(floor, ["main"], "ana", now)).toBeNull();
    expect(otherTalker([], ["main"], "me", now)).toBeNull();
  });
});

describe("saved clips", () => {
  it("keeps phone recordings of a sensible length and size", () => {
    expect(readClip({ mime: "audio/mp4", ms: 4200, bytes: 40_000 })).toEqual({ mime: "audio/mp4", ms: 4200 });
    expect(readClip({ mime: "audio/webm;codecs=opus", ms: 12_000, bytes: 50_000 })).toEqual({ mime: "audio/webm;codecs=opus", ms: 12_000 });
    expect(readClip({ mime: 'audio/mp4; codecs="mp4a.40.2"', ms: 3000, bytes: 9000 })).toEqual({ mime: 'audio/mp4; codecs="mp4a.40.2"', ms: 3000 });
  });

  it("refuses taps, other file types and oversized files", () => {
    expect(readClip({ mime: "audio/mp4", ms: 200, bytes: 4000 })).toHaveProperty("error");
    expect(readClip({ mime: "video/mp4", ms: 4000, bytes: 4000 })).toHaveProperty("error");
    expect(readClip({ mime: "text/html", ms: 4000, bytes: 4000 })).toHaveProperty("error");
    expect(readClip({ mime: "audio/webm", ms: 4000, bytes: CLIP_MAX_BYTES + 1 })).toHaveProperty("error");
    expect(readClip({ mime: "audio/webm", ms: "lots", bytes: 4000 })).toHaveProperty("error");
  });

  it("caps the length at a press's limit", () => {
    expect(readClip({ mime: "audio/webm", ms: 600_000, bytes: 4000 })).toMatchObject({ ms: TALK_MAX_MS + 5000 });
  });

  it("writes lengths as minutes and seconds", () => {
    expect(clipLength(7400)).toBe("0:07");
    expect(clipLength(60_000)).toBe("1:00");
    expect(clipLength(-5)).toBe("0:00");
  });

  it("lists names the way people say them", () => {
    expect(nameList([])).toBe("");
    expect(nameList(["Ana"])).toBe("Ana");
    expect(nameList(["Ana", "Ben"])).toBe("Ana and Ben");
    expect(nameList(["Ana", "Ben", "Ana", "Carlo"])).toBe("Ana, Ben and Carlo");
  });
});

describe("missed talk notifications", () => {
  const device = (over: Partial<TalkDevice> & { staffId: string }): TalkDevice => ({
    role: "employee", branchId: "main", active: true, talk: true, onShiftOnly: true, ...over,
  });
  const ana = device({ staffId: "ana" });
  const ben = device({ staffId: "ben", onShiftOnly: false }); // still needs to be clocked in for talk
  const mgr = device({ staffId: "mgr", role: "manager", onShiftOnly: false });
  const noir = device({ staffId: "noir", branchId: "noir" });
  const owner = device({ staffId: "owner", role: "admin", branchId: null, onShiftOnly: false });
  const quiet = device({ staffId: "quiet", talk: false });
  const gone = device({ staffId: "gone", active: false });
  const all = [ana, ben, mgr, noir, owner, quiet, gone];
  const ids = (list: TalkDevice[]) => list.map((d) => d.staffId).sort();
  const onShift = new Set(["ana", "ben", "mgr", "noir", "quiet", "gone"]);

  it("reaches the branch's clocked-in staff and the owner", () => {
    expect(ids(missedTalkRecipients(all, { branches: ["main"], speakerId: "x" }, onShift, new Set()))).toEqual(["ana", "ben", "mgr", "owner"]);
    expect(ids(missedTalkRecipients(all, { branches: ["main", "noir"], speakerId: "x" }, onShift, new Set()))).toEqual(["ana", "ben", "mgr", "noir", "owner"]);
  });

  it("skips staff who aren't clocked in, whatever their device says", () => {
    expect(ids(missedTalkRecipients(all, { branches: ["main"], speakerId: "x" }, new Set(), new Set()))).toEqual(["owner"]);
  });

  it("skips the speaker, anyone who heard it live, and devices that turned it off", () => {
    expect(ids(missedTalkRecipients(all, { branches: ["main"], speakerId: "owner" }, onShift, new Set(["ana", "mgr"])))).toEqual(["ben"]);
  });

  it("lets the owner limit them to when they're clocked in", () => {
    const owner2 = device({ staffId: "owner", role: "admin", branchId: null, onShiftOnly: true });
    expect(missedTalkRecipients([owner2], { branches: ["main"], speakerId: null }, new Set(), new Set())).toEqual([]);
    expect(missedTalkRecipients([owner2], { branches: ["main"], speakerId: null }, new Set(["owner"]), new Set())).toHaveLength(1);
  });

  it("says who and how long, never what was said, and opens the clip", () => {
    const p = missedTalkPayload({ id: "c1", name: "Owner", ms: 12_300, branches: ["main", "noir"] });
    expect(p.title).toBe("Missed talk from Owner");
    expect(p.body).toBe("0:12 · Cafe and Cafe Noir. Tap to play it.");
    expect(p.url).toBe("/staff/talk#clip-c1");
    expect(p.tag).toBe("talk");
  });
});
