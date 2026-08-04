/**
 * Transient confirmation. `role="status"` with a polite live region so a screen
 * reader hears it without losing the user's place.
 */
export function Toast({ message }: { message: string }) {
  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
