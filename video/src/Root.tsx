import { Composition, Folder } from "remotion";
import { Pitch, PITCH_FRAMES } from "./Pitch";
import { PartsPreview } from "./preview/PartsPreview";
import { ScreensPreview } from "./preview/ScreensPreview";
import { REEL_DELIVERY_FRAMES, REEL_PICKUP_FRAMES, ReelDelivery, ReelPickup } from "./Reels";

/** Everything Remotion Studio lists: the three videos, then the building blocks they're made of */
export function RemotionRoot() {
  return (
    <>
      <Folder name="Videos">
        <Composition id="Pitch" component={Pitch} durationInFrames={PITCH_FRAMES} fps={30} width={1920} height={1080} />
        <Composition id="Reel-pickup" component={ReelPickup} durationInFrames={REEL_PICKUP_FRAMES} fps={30} width={1080} height={1920} />
        <Composition id="Reel-delivery" component={ReelDelivery} durationInFrames={REEL_DELIVERY_FRAMES} fps={30} width={1080} height={1920} />
      </Folder>
      <Folder name="Building-blocks">
        <Composition id="Screens" component={ScreensPreview} durationInFrames={180} fps={30} width={1920} height={1080} />
        <Composition id="Parts" component={PartsPreview} durationInFrames={180} fps={30} width={1920} height={1080} />
      </Folder>
    </>
  );
}
