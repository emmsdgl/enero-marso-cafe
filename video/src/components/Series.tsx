import type { ReactNode } from "react";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";

export type Scene = { id: string; len: number; el: ReactNode };

/** Scenes played one after another, each fading into the next */
export function Series({ scenes, blend }: { scenes: Scene[]; blend: number }) {
  return (
    <TransitionSeries>
      {scenes.flatMap((sc, i) => [
        ...(i > 0 ? [<TransitionSeries.Transition key={`t-${sc.id}`} presentation={fade()} timing={linearTiming({ durationInFrames: blend })} />] : []),
        <TransitionSeries.Sequence key={sc.id} durationInFrames={sc.len}>{sc.el}</TransitionSeries.Sequence>,
      ])}
    </TransitionSeries>
  );
}
