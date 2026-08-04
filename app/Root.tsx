import { useCallback, useEffect, useState } from "react";
import type { User } from "../shared/types";
import App from "./App";
import LoginView from "./LoginView";
import { api, isNetworkError } from "./lib/api";
import { LangProvider, T } from "./i18n";
import { SpeechProvider } from "./lib/speech";
import { ConnectionScreen } from "./components/feedback";

type Phase =
  | { status: "loading" }
  | { status: "offline" }
  | { status: "out"; allowSignups: boolean }
  | { status: "in"; user: User };

function Loading() {
  return (
    <main className="page login-page">
      <T as="p" k="app.loading" className="login-loading" />
    </main>
  );
}

function RootContent() {
  const [phase, setPhase] = useState<Phase>({ status: "loading" });

  const check = useCallback(async () => {
    setPhase({ status: "loading" });
    try {
      const session = await api.session();
      setPhase(
        session.user
          ? { status: "in", user: session.user }
          : { status: "out", allowSignups: session.allowSignups },
      );
    } catch (error) {
      // Losing the network is not being signed out. Showing the sign-in screen
      // here would tell someone their session had ended when it had not.
      setPhase(isNetworkError(error) ? { status: "offline" } : { status: "out", allowSignups: false });
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const signOut = useCallback(() => {
    void api
      .logout()
      .catch(() => undefined)
      .finally(() => void check());
  }, [check]);

  if (phase.status === "loading") return <Loading />;
  if (phase.status === "offline") return <ConnectionScreen onRetry={() => void check()} busy={false} />;
  if (phase.status === "out") {
    return (
      <LoginView allowSignups={phase.allowSignups} onSignedIn={(user) => setPhase({ status: "in", user })} />
    );
  }
  return <App user={phase.user} onSignOut={signOut} />;
}

/**
 * One language provider for the whole application, above the sign-in screen as
 * well as the app. Nesting a second one inside `App` meant the two halves could
 * disagree, and the language setting only appeared to work after signing in.
 */
export default function Root() {
  return (
    <LangProvider>
      <SpeechProvider>
        <RootContent />
      </SpeechProvider>
    </LangProvider>
  );
}
