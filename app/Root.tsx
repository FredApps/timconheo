import { useCallback, useEffect, useState } from "react";
import App from "./App";
import LoginView from "./LoginView";
import { api } from "./lib/api";
import { LangProvider, T, useLang } from "./i18n";
import type { User } from "../shared/types";
type Phase = { status: "loading" } | { status: "out"; allowSignups: boolean } | { status: "in"; user: User };
function Loading() { return <main className="page login-page"><p className="login-loading"><T k="app.loading" /></p></main>; }
function RootContent() {
  const [phase, setPhase] = useState<Phase>({ status: "loading" });
  const check = useCallback(async () => { try { const session = await api.session(); setPhase(session.user ? { status: "in", user: session.user } : { status: "out", allowSignups: session.allowSignups }); } catch { setPhase({ status: "out", allowSignups: false }); } }, []);
  useEffect(() => { void check(); }, [check]);
  const signOut = useCallback(async () => { try { await api.logout(); } finally { await check(); } }, [check]);
  if (phase.status === "loading") return <Loading />;
  if (phase.status === "out") return <LoginView allowSignups={phase.allowSignups} onSignedIn={(user) => setPhase({ status: "in", user })} />;
  return <App user={phase.user} onSignOut={signOut} />;
}
export default function Root() { return <LangProvider><RootContent /></LangProvider>; }
