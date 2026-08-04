import { LogIn } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import type { User } from "../shared/types";
import { ApiError, NetworkError, api } from "./lib/api";
import { errorKey } from "./i18n/content";
import type { StringKey } from "./i18n/strings";
import { T } from "./i18n";
import { PigMark } from "./components/PigMark";

export default function LoginView({
  allowSignups,
  onSignedIn,
}: {
  allowSignups: boolean;
  onSignedIn: (user: User) => void;
}) {
  const usernameId = useId();
  const passwordId = useId();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [failure, setFailure] = useState<StringKey | null>(null);
  const [busy, setBusy] = useState(false);

  const submitKey: StringKey = busy
    ? mode === "login"
      ? "login.submitting"
      : "login.creating"
    : mode === "login"
      ? "login.submit"
      : "login.create";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFailure(null);
    try {
      const result =
        mode === "login" ? await api.login(username, password) : await api.signup(username, password);
      onSignedIn(result.user);
    } catch (caught) {
      // A dropped connection is not a rejected password, and saying so stops
      // someone retyping a password that was never wrong.
      setFailure(
        caught instanceof NetworkError
          ? "error.NETWORK"
          : errorKey(caught instanceof ApiError ? caught.code : undefined),
      );
      setBusy(false);
    }
  };

  return (
    <main className="page login-page">
      <section className="login-card paper-card">
        <PigMark />
        <T as="p" k="app.title" className="eyebrow" />
        <T as="h1" k={mode === "login" ? "login.welcome" : "login.create"} />
        <T as="p" k="login.intro" className="login-intro" />

        <form onSubmit={(event) => void submit(event)}>
          <label htmlFor={usernameId}>
            <T k="login.username" />
          </label>
          <input
            id={usernameId}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />

          <label htmlFor={passwordId}>
            <T k="login.password" />
          </label>
          <input
            id={passwordId}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
          />

          {failure && (
            <p className="login-error" role="alert">
              <T k={failure} />
            </p>
          )}

          <button className="primary-button" type="submit" disabled={busy} aria-busy={busy}>
            <LogIn size={17} aria-hidden="true" />
            <T k={submitKey} />
          </button>
        </form>

        {allowSignups && (
          <button
            className="link-button"
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setFailure(null);
            }}
          >
            <T k={mode === "login" ? "login.toSignup" : "login.toLogin"} />
          </button>
        )}
      </section>
    </main>
  );
}
