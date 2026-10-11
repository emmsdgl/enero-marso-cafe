import { describe, expect, it } from "vitest";
import {
  describeWeek, formatTime, isOpen, manilaClock, minutesToClose, parseTime, shiftDate, takingOrders, toTimeInput, type Clock, type Schedule, type Window,
} from "./hours";

const t = (h: number, m = 0) => h * 60 + m;
const evening: Window = { open: t(18), close: t(1) }; // 6 PM – 1 AM
const day: Window = { open: t(9), close: t(1) }; // 9 AM – 1 AM
const tuesday: Window = { open: t(13), close: t(22) }; // 1 PM – 10 PM
// The schedules seeded into the database by migration 0007
const main: Schedule = { week: [evening, null, evening, evening, evening, evening, evening], special: {} };
const noir: Schedule = { week: [day, day, tuesday, day, day, day, day], special: {} };

/** A Manila moment on a real date (11 Oct 2026 is a Sunday) */
const at = (date: string, h: number, m = 0): Clock => ({ date, weekday: new Date(`${date}T00:00:00Z`).getUTCDay(), minute: t(h, m) });
const SUN = "2026-10-11", MON = "2026-10-12", TUE = "2026-10-13", WED = "2026-10-14";

describe("opening hours", () => {
  it("opens the main cafe at 6 PM and keeps it open past midnight", () => {
    expect(isOpen(main, at(TUE, 17, 59))).toBe(false);
    expect(isOpen(main, at(TUE, 18))).toBe(true);
    expect(isOpen(main, at(WED, 0, 59))).toBe(true);
    expect(isOpen(main, at(WED, 1))).toBe(false);
  });

  it("treats Monday as closed, except for Sunday night's spill past midnight", () => {
    expect(isOpen(main, at(MON, 0, 30))).toBe(true);
    expect(isOpen(main, at(MON, 20))).toBe(false);
    expect(isOpen(main, at(TUE, 0, 30))).toBe(false);
  });

  it("follows Cafe Noir's short Tuesday", () => {
    expect(isOpen(noir, at(TUE, 0, 30))).toBe(true); // Monday night, still open
    expect(isOpen(noir, at(TUE, 12))).toBe(false);
    expect(isOpen(noir, at(TUE, 13))).toBe(true);
    expect(isOpen(noir, at(TUE, 22))).toBe(false);
    expect(isOpen(noir, at(WED, 0, 30))).toBe(false); // Tuesday closes at 10 PM, no spill
  });

  it("counts the minutes to closing across midnight", () => {
    expect(minutesToClose(main, at(SUN, 23))).toBe(120);
    expect(minutesToClose(main, at(MON, 0, 30))).toBe(30);
    expect(minutesToClose(noir, at(TUE, 21))).toBe(60);
    expect(minutesToClose(main, at(MON, 20))).toBeNull();
  });
});

describe("special days", () => {
  const christmas: Schedule = { ...main, special: { "2026-12-25": null } };
  const newYear: Schedule = { ...main, special: { "2026-12-31": { open: t(18), close: t(3) } } };

  it("closes on a holiday, but Christmas Eve still runs to 1 AM", () => {
    expect(isOpen(christmas, at("2026-12-25", 20))).toBe(false);
    expect(isOpen(christmas, at("2026-12-25", 0, 30))).toBe(true);
    expect(isOpen(christmas, at("2026-12-26", 20))).toBe(true);
  });

  it("uses a special day's own hours, including past midnight", () => {
    expect(minutesToClose(newYear, at("2027-01-01", 2))).toBe(60);
    expect(isOpen(main, at("2027-01-01", 2))).toBe(false);
  });
});

describe("online order cutoff", () => {
  it("stops taking orders 30 minutes before closing", () => {
    expect(takingOrders(main, at(SUN, 23))).toBe(true);
    expect(takingOrders(main, at(MON, 0, 29))).toBe(true);
    expect(takingOrders(main, at(MON, 0, 30))).toBe(false);
    expect(takingOrders(noir, at(TUE, 21, 30))).toBe(false);
    expect(takingOrders(main, at(MON, 20))).toBe(false);
  });
});

describe("hours as people read them", () => {
  it("writes the week the way the site always has", () => {
    expect(describeWeek(main.week)).toEqual([
      { days: "Tuesday – Sunday", time: "6 PM – 1 AM" },
      { days: "Monday", time: "Closed" },
    ]);
    expect(describeWeek(noir.week)).toEqual([
      { days: "Mon & Wed – Sun", time: "9 AM – 1 AM" },
      { days: "Tuesday", time: "1 PM – 10 PM" },
    ]);
    expect(describeWeek(Array(7).fill(day))).toEqual([{ days: "Every day", time: "9 AM – 1 AM" }]);
    // Sunday sits at the end of a Monday-first week, so it's its own run
    expect(describeWeek([day, day, day, day, day, evening, evening])).toEqual([
      { days: "Mon – Thu & Sun", time: "9 AM – 1 AM" },
      { days: "Friday & Saturday", time: "6 PM – 1 AM" },
    ]);
  });

  it("formats times and reads time inputs", () => {
    expect(formatTime(0)).toBe("12 AM");
    expect(formatTime(t(12))).toBe("12 PM");
    expect(formatTime(t(9, 30))).toBe("9:30 AM");
    expect(parseTime("18:30")).toBe(t(18, 30));
    expect(parseTime("25:00")).toBeNull();
    expect(parseTime("")).toBeNull();
    expect(toTimeInput(t(18, 30))).toBe("18:30");
  });
});

describe("Manila clock", () => {
  it("reads Philippine time and date whatever the server's time zone", () => {
    // Saturday 16:30 UTC is already Sunday 00:30 in Manila (UTC+8)
    expect(manilaClock(new Date("2026-10-10T16:30:00Z"))).toEqual({ date: SUN, weekday: 0, minute: t(0, 30) });
    expect(manilaClock(new Date("2026-10-12T10:00:00Z"))).toEqual({ date: MON, weekday: 1, minute: t(18) });
  });

  it("steps across months and years", () => {
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
  });
});
