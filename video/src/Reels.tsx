import type { ReactNode } from "react";
import { Series } from "./components/Series";
import { Soundtrack } from "./components/Soundtrack";
import { captions } from "./content";
import { DeliveryCheckout, DeliveryDone, DeliveryOnWay, DeliveryPay } from "./reels/DeliveryScreens";
import { ReelPhone } from "./reels/Phone";
import { PickupChat, PickupCheckout, PickupReady } from "./reels/PickupScreens";
import { Hook } from "./scenes/Hook";
import { Outro } from "./scenes/Outro";
import { BLEND, reelDelivery, reelPickup, reelTimeline, type Timeline } from "./timeline";

// Scene lengths are in timeline.ts. The phone screens cross-fade inside the phone; the hook and the end card fade around it.
type Screens<K extends string> = Record<K, { caption: string; screen: ReactNode }>;

const pickupScreens: Screens<keyof typeof reelPickup.screens> = {
  order: { caption: captions.reelPickup.order, screen: <PickupCheckout /> },
  chat: { caption: captions.reelPickup.chat, screen: <PickupChat /> },
  ready: { caption: captions.reelPickup.ready, screen: <PickupReady /> },
};
const deliveryScreens: Screens<keyof typeof reelDelivery.screens> = {
  order: { caption: captions.reelDelivery.order, screen: <DeliveryCheckout /> },
  pay: { caption: captions.reelDelivery.pay, screen: <DeliveryPay /> },
  out: { caption: captions.reelDelivery.out, screen: <DeliveryOnWay /> },
  done: { caption: captions.reelDelivery.done, screen: <DeliveryDone /> },
};

const PICKUP = reelTimeline(reelPickup);
const DELIVERY = reelTimeline(reelDelivery);
export const REEL_PICKUP_FRAMES = PICKUP.length;
export const REEL_DELIVERY_FRAMES = DELIVERY.length;

function Reel({ t, hook, screens, cta }: { t: Timeline & { phone: number }; hook: ReactNode; screens: Record<string, { caption: string; screen: ReactNode }>; cta: ReactNode }) {
  const phone = Object.entries(screens).map(([id, sc]) => ({ id, len: t.lens[id], caption: sc.caption, screen: sc.screen }));
  return (
    <Series
      blend={BLEND}
      scenes={[
        { id: "hook", len: t.lens.hook, el: hook },
        { id: "phone", len: t.phone, el: <ReelPhone scenes={phone} /> },
        { id: "cta", len: t.lens.cta, el: cta },
      ]}
    />
  );
}

/** 9:16, about 26 s: order ahead on the phone, message the cafe, the bubble says it's ready */
export const ReelPickup = () => (
  <>
    <Reel t={PICKUP} hook={<Hook {...captions.reelPickup.hook} pace={0.5} />} screens={pickupScreens} cta={<Outro lead={captions.reelPickup.cta} />} />
    <Soundtrack cut="reelPickup" timeline={PICKUP} />
  </>
);

/** 9:16, about 31 s: pin and send, pay by GCash, chat while it's on its way, delivered with the chat still open */
export const ReelDelivery = () => (
  <>
    <Reel t={DELIVERY} hook={<Hook {...captions.reelDelivery.hook} pace={0.5} />} screens={deliveryScreens} cta={<Outro lead={captions.reelDelivery.cta} />} />
    <Soundtrack cut="reelDelivery" timeline={DELIVERY} />
  </>
);
