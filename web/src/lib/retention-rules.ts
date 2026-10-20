/** How long an order keeps the customer's details (the privacy notice says one year) */
export const RETAIN_DAYS = 365;

export const retentionCutoff = (now: Date) => new Date(now.getTime() - RETAIN_DAYS * 86_400_000);

/** What an order's personal details become after a year. Items, totals and times stay. */
export const SCRUBBED = {
  customerName: "Removed",
  customerPhone: "",
  customerEmail: null,
  notes: null,
  address: null,
  landmark: null,
  lat: null,
  lng: null,
  plusCode: null,
  trackingUrl: null,
  gcashRef: null,
  createdIp: null,
} as const;
