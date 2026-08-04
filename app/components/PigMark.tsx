/** The app's pig, drawn in CSS. Decorative everywhere it appears. */
export function PigMark({ small = false }: { small?: boolean }) {
  return (
    <span className={"pig-mark" + (small ? " pig-mark--small" : "")} aria-hidden="true">
      <span className="pig-ear pig-ear--left" />
      <span className="pig-ear pig-ear--right" />
      <span className="pig-face">
        <span className="pig-eye pig-eye--left" />
        <span className="pig-eye pig-eye--right" />
        <span className="pig-snout">
          <i />
          <i />
        </span>
      </span>
    </span>
  );
}
