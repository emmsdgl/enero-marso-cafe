/**
 * Every caption and every piece of sample data in the videos. Edit text here, not in the scenes.
 * Wording matches the real app (web/): menu, prices, order codes, notifications, buttons and chat lines.
 * Chat messages from the customer and staff are in Taglish; everything else is English.
 */

export const site = {
  cafe: "Enero Marso Cafe",
  // Shown on the end cards and in every address bar. If eneromarso.cafe isn't live when you publish, put the current address here
  url: "eneromarso.cafe",
  tagline: "Coffee, comfort & good conversations",
  visit: "Western Bicutan & Ususan, Taguig",
};

export const customer = { name: "Bea", phone: "0917 123 4567" };

export const pickup = {
  code: "EM-7KQ4P2",
  items: [
    { name: "Spanish Latte", size: "Large", price: 140 },
    { name: "French Fries", size: null, price: 65 },
  ],
  total: 205,
  push: { title: "New order EM-7KQ4P2", body: "Cafe · Pickup ASAP · 2 items · ₱205" },
  headlines: {
    sent: "Order sent. Waiting for the cafe to accept it.",
    preparing: "Your order is being prepared.",
    ready: "Ready! Show code EM-7KQ4P2 at the counter.",
    done: "Picked up. Thanks for ordering!",
  },
  chat: [
    { from: "system", text: "The cafe accepted the order." },
    { from: "system", text: "The order is being prepared." },
    { from: "customer", text: "Less ice po, thank you!" },
    { from: "staff", text: "Sure po, noted!" },
    { from: "system", text: "The order is ready for pickup." },
    { from: "system", text: "Picked up. This chat stays open for 30 minutes in case anything's missing." },
  ],
} as const;

export const delivery = {
  code: "EM-4T9HCD",
  distance: "1.2 km",
  address: "12 Champaca St., Western Bicutan",
  reach: "About 1.2 km from Enero Marso Cafe. The cafe tells you the delivery fee before you pay.",
  account: { label: "GCash", name: "Enero Marso Cafe", number: "0917 000 1234" },
  items: [
    { name: "White Mocha", size: "Large", price: 145 },
    { name: "Sea Salt Spanish Latte", size: "Medium", price: 130 },
    { name: "Chicken Nuggets with Fries", size: null, price: 170 },
  ],
  subtotal: 445,
  fee: 50,
  total: 495,
  gcashRef: "1234 567 890123",
  push: {
    order: { title: "New order EM-4T9HCD", body: "Cafe · Delivery 1.2 km ASAP · 3 items · ₱445" },
    payment: { title: "Payment to check: EM-4T9HCD", body: "Cafe · ₱495 to GCash. Check it in the app, then accept." },
  },
  headlines: {
    sent: "Order sent. The cafe will confirm it and the delivery fee.",
    pay: "Confirmed! Pay ₱495 to start your order.",
    paid: "Payment sent. The cafe is checking it.",
    accepted: "Paid and accepted. We'll start on it shortly.",
    preparing: "Your order is being prepared.",
    out: "On its way to you.",
    done: "Delivered. Thanks for ordering!",
  },
  chat: [
    { from: "system", text: "The cafe confirmed the order. Delivery: ₱50. Total to pay: ₱495." },
    { from: "system", text: "The customer sent payment reference 1234567890 (paid to GCash). The cafe is checking it." },
    { from: "system", text: "Payment received. The cafe accepted the order." },
    { from: "system", text: "The order is being prepared." },
    { from: "customer", text: "Less ice po, thank you!" },
    { from: "staff", text: "Sure po, noted!" },
    { from: "system", text: "The order is ready and waiting for the rider." },
    { from: "system", text: "The order is on its way with Lalamove." },
    { from: "system", text: "Delivered. This chat stays open for 30 minutes in case anything's missing." },
  ],
} as const;

/** The pay panel and the staff's payment check (real wording) */
export const payPanel = {
  how: "Pay from GCash, Maya or your bank app, the exact amount. Then type the reference number from your receipt below.",
  sent: "Payment sent",
  checking: "The cafe is checking reference 1234567890.",
  staffTitle: "Check the payment",
  staffLine: "Paid to GCash · reference 1234567890",
  staffHint: "Find it in the account's app history, with the same amount, before you accept.",
};

/** What a fresh order's chat says before anyone writes */
export const emptyChat = "Need to change something, or running late? Message Enero Marso here. The staff see it on their order screen.";

/** The next order in the pickup beat */
export const nextOrder = { code: "EM-9PX3QR", headline: "Order sent. Waiting for the cafe to accept it." };

export const chatClosed = "This chat closed at 3:45 PM. For anything else, message Enero Marso Cafe on Facebook.";

/** The scattered chats in the problem scene (Taglish, like real customers) */
export const scattered = [
  "Nareceive niyo po ba order ko?",
  "Ready na po ba?",
  "Hello po?",
  "Pa-order po ulit, same lang",
  "Magkano po delivery?",
  "Pwede po pick up mamaya?",
  "Hello po??",
];

/** The main branch's menu, as checkout shows it (prices from the live menu) */
export const menuRows = [
  { name: "Americano", sizes: [["Tall", 90], ["Medium", 100], ["Large", 115]] },
  { name: "White Mocha", sizes: [["Tall", 120], ["Medium", 130], ["Large", 145]] },
  { name: "Spanish Latte", sizes: [["Tall", 115], ["Medium", 125], ["Large", 140]] },
  { name: "Sea Salt Spanish Latte", sizes: [["Tall", 120], ["Medium", 130], ["Large", 145]] },
] as const;
export const menuSections = ["Caffeinated", "Signature", "Gelato Affogato", "Non Caffeinated", "Refreshers", "Rice Meals"];
/** Finger Snacks: no sizes, so each row has its own Add button */
export const snacks = {
  section: "Finger Snacks",
  note: "+₱25 per sauce",
  rows: [
    { name: "French Fries", note: null, price: 65 },
    { name: "Chicken Nuggets", note: "6 pcs", price: 115 },
    { name: "Chicken Nuggets with Fries", note: null, price: 170 },
    { name: "Nachos", note: null, price: 115 },
  ],
} as const;
/** The chips above the menu on a phone, in the real order (the row scrolls sideways) */
export const phoneSections = ["Caffeinated", "Signature", "Gelato Affogato", "Non Caffeinated", "Refreshers", "Tea Series", "Yogurt Series", "Rice Meals", "Finger Snacks"];

/** The floating "Your order" bubble's status lines (web/src/components/order/OrderBubble.tsx) */
export const bubble = { preparing: "Being prepared", ready: "Ready for pickup" };

/** Checkout wording that differs for pickup */
export const pickupCheckout = {
  when: "As soon as it's ready (about 20 min)",
  pay: "Pay when you pick up: cash or GCash at the counter.",
};

export const stepsDelivery = ["Order sent", "Pay", "Being prepared", "On its way", "Delivered"];
export const stepsPickup = ["Order sent", "Accepted", "Being prepared", "Ready for pickup", "Picked up"];

export const staffButtons = {
  pickup: ["Accept", "Start preparing", "Mark ready", "Picked up"],
  delivery: { fee: "Confirm and send fee", paid: "Payment received", out: "Out for delivery" },
};

export const captions = {
  pitch: {
    // The hook is set in two parts: plain, then the brand's script font
    hook: { lead: "Ordering from Enero Marso", script: "just got easier." },
    problem: "No more orders lost in chats.",
    pin: "Pin your place on the map.",
    order: "Order online. No app, no account.",
    staff: "Our staff get it instantly.",
    pay: "Pay by GCash. We confirm it.",
    chat: "Every order gets its own chat.",
    closes: "Chat stays open 30 minutes, then closes.",
    pickup: "Or pick it up. Skip the line.",
    next: "Next order? A brand new chat.",
    // The end card reads "Order now at" with site.url under it
    cta: "Order now at",
  },
  reelPickup: {
    hook: { lead: "Skip the line", script: "at Enero Marso." },
    order: "Order ahead. No app needed.",
    chat: "Message the cafe on your order.",
    ready: "We'll tell you when it's ready.",
    cta: "Order now at",
  },
  reelDelivery: {
    hook: { lead: "Enero Marso,", script: "delivered." },
    order: "Pin your place. Pick your drinks.",
    pay: "Pay by GCash, right on the page.",
    out: "Follow your order. Chat with us.",
    done: "Missing something? We're still here.",
    cta: "Order now at",
  },
};

export const benefits = ["Organized orders, one chat each", "Payments checked before we start", "Every order and chat on record"];
