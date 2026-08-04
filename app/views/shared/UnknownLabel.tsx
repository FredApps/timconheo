import { T } from "../../i18n";
import type { StoryEstimate } from "../../lib/difficulty";

/**
 * How much of a reading is unfamiliar.
 *
 * Before any words are tracked, the honest answer is "not measured yet" -- not
 * 100%, which is technically true but reads as a warning, and not a made-up
 * baseline, which is simply false.
 */
export function UnknownLabel({ estimate }: { estimate: StoryEstimate }) {
  if (estimate.unknownIsUnmeasured) return <T k="library.unknownUnmeasured" />;
  return <T k="library.unknown" slots={{ percent: Math.round(estimate.unknownRatio * 100) }} />;
}
