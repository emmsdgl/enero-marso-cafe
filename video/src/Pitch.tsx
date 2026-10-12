import type { ReactNode } from "react";
import { Series } from "./components/Series";
import { Soundtrack } from "./components/Soundtrack";
import { benefits, captions } from "./content";
import { ChatCloses } from "./scenes/ChatCloses";
import { CustomerOrder } from "./scenes/CustomerOrder";
import { Hook } from "./scenes/Hook";
import { OrderChat } from "./scenes/OrderChat";
import { Outro } from "./scenes/Outro";
import { PayByGcash } from "./scenes/PayByGcash";
import { PickupBeat } from "./scenes/PickupBeat";
import { PinDrop } from "./scenes/PinDrop";
import { Problem } from "./scenes/Problem";
import { StaffAlert } from "./scenes/StaffAlert";
import { BLEND, pitch, pitchTimeline } from "./timeline";

// Scene lengths are in timeline.ts
const SCENES: Record<keyof typeof pitch, ReactNode> = {
  hook: <Hook {...captions.pitch.hook} />,
  problem: <Problem caption={captions.pitch.problem} />,
  pin: <PinDrop caption={captions.pitch.pin} />,
  order: <CustomerOrder caption={captions.pitch.order} />,
  staff: <StaffAlert caption={captions.pitch.staff} />,
  pay: <PayByGcash caption={captions.pitch.pay} />,
  chat: <OrderChat caption={captions.pitch.chat} />,
  closes: <ChatCloses caption={captions.pitch.closes} />,
  pickup: <PickupBeat first={captions.pitch.pickup} second={captions.pitch.next} />,
  outro: <Outro lead={captions.pitch.cta} benefits={benefits} />,
};

const T = pitchTimeline();
export const PITCH_FRAMES = T.length;

/** 16:9, about 71 s, for the cafe owner: the delivery story with a pickup beat, ending on the benefits */
export const Pitch = () => (
  <>
    <Series scenes={Object.entries(SCENES).map(([id, el]) => ({ id, len: T.lens[id], el }))} blend={BLEND} />
    <Soundtrack cut="pitch" timeline={T} />
  </>
);
