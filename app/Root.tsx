import { useCallback, useEffect, useState } from "react";
import App from "./App";
import LoginView from "./LoginView";
import { api } from "./lib/api";
import type { User } from "../shared/types";

type Phase = { status: "loading" } | { status: "out"; allowSignups: boolean } | { status: "in"; user: User };

export default function Root() {
  const [phase, setPhase] = useState<Phase>({ status: "loading" });

  const check = useCallback(async () => {
    try {
      const session = await api.session();
      setPhase(
        session.user
          ? { status: "in", user: session.user }
          : { status: "out", allowSignups: session.allowSignups },
      );
    } catch {
      // Offline or the server is down: show the sign-in screen rather than a blank page.
      setPhase({ status: "out", allowSignups: false });
    }
  }, []);

  useEffect(() => { void check(); }, [check]);

  const signOut = useCallback(async () => {
    try { await api.logout(); } finally { await check(); }
  }, [check]);

  if (phase.status === "loading") {
    return <main className="page login-page"><p className="login-loading">Đang mở…</p></main>;
  }
  if (phase.status === "out") {
    return (
      <LoginView
        allowSignups={phase.allowSignups}
        onSignedIn={(user) => setPhase({ status: "in", user })}
      />
    );
  }
  return <App user={phase.user} onSignOut={signOut} />;
}
