import { useEffect, useRef } from "react";
import { T, useT } from "../../i18n";
import type { Bi } from "../../types";

/**
 * The pitch chart.
 *
 * A canvas is invisible to a screen reader, so the same information is written
 * out beneath it in words: which contour is the target, what shape it is, and
 * whether there is an attempt to compare against.
 */
export function ToneCanvas({
  reference,
  attempt,
  shape,
}: {
  reference: number[];
  attempt: number[];
  shape: Bi;
}) {
  const t = useT();
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const ratio = window.devicePixelRatio || 1;
    const width = element.clientWidth;
    const height = element.clientHeight;
    if (!width || !height) return;
    element.width = width * ratio;
    element.height = height * ratio;
    const ctx = element.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, width, height);

    const draw = (values: number[], color: string, dashed = false) => {
      if (values.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = dashed ? 3 : 4;
      ctx.setLineDash(dashed ? [7, 7] : []);
      values.forEach((value, index) => {
        const x = 12 + (index / Math.max(values.length - 1, 1)) * (width - 24);
        const y = height - 15 - value * (height - 30);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };

    draw(reference, "#a53c32");
    if (attempt.length) draw(attempt, "#24342d", true);
  }, [attempt, reference]);

  return (
    <div className="tone-chart-wrap">
      <div className="chart-labels" aria-hidden="true">
        <span>high</span>
        <span>low</span>
      </div>
      <canvas ref={canvas} className="tone-canvas" role="img" aria-label={t("tones.chartTitle")} />
      <p className="chart-description">
        {t("tones.chartTarget", { shape: shape.en })}{" "}
        {attempt.length ? <T k="tones.chartAttempt" /> : <T k="tones.chartNoAttempt" />}
      </p>
    </div>
  );
}
