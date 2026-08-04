import { CircleHelp, Loader2 } from "lucide-react";
import { T, useT } from "../../i18n";
import { useSpeech } from "../../lib/speech";

/**
 * Says what is actually producing the sound right now.
 *
 * The point is that it stops claiming the Central voice the moment it stops
 * being true: once playback has fallen back, the badge reads "Device
 * Vietnamese", because a device vi-VN voice is almost always a Northern one and
 * pretending otherwise would undermine the whole premise of the app.
 */
export function VoiceBadge() {
  const t = useT();
  const { state, voiceName, useDeviceNow } = useSpeech();
  const preparing = state.phase === "generating";
  const onDevice = state.provider === "device" && state.phase !== "idle";

  return (
    <div className="voice-badge" role="status" aria-live="polite">
      <span className={"voice-dot" + (preparing ? " voice-dot--waiting" : "")} aria-hidden="true" />
      {preparing ? (
        <>
          <Loader2 size={13} className="spin" aria-hidden="true" />
          {t("speech.preparing", { voice: voiceName })}
        </>
      ) : onDevice ? (
        <>
          <T k="speech.device" />
          <span className="voice-note">
            <T k="speech.fellBack" />
          </span>
        </>
      ) : (
        <>
          {t("speech.playingCentral", { voice: voiceName })}
          <span className="voice-note" title={t("speech.about")}>
            <CircleHelp size={13} aria-hidden="true" />
          </span>
        </>
      )}

      {state.canUseDeviceNow && (
        <button type="button" className="link-button" onClick={useDeviceNow}>
          <T k="speech.useDeviceNow" />
        </button>
      )}
    </div>
  );
}
