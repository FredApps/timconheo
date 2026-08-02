import { LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "./lib/api";
import type { User } from "../shared/types";

export default function LoginView({
  allowSignups,
  onSignedIn,
}: {
  allowSignups: boolean;
  onSignedIn: (user: User) => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = mode === "login"
        ? await api.login(username, password)
        : await api.signup(username, password);
      onSignedIn(result.user);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không kết nối được máy chủ.");
      setBusy(false);
    }
  };

  return (
    <main className="page login-page">
      <section className="login-card paper-card">
        <p className="eyebrow">Tìm Con Heo</p>
        <h1>{mode === "login" ? "Chào bạn trở lại" : "Tạo tài khoản"}</h1>
        <p className="login-intro">
          Từ đã lưu, thẻ ôn tập và tiến độ đọc gắn với tài khoản này, nên bạn mở máy nào cũng thấy
          như nhau.
        </p>
        <form onSubmit={submit}>
          <label>
            Tên đăng nhập
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={busy}>
            <LogIn size={17} /> {busy ? "Đang vào…" : mode === "login" ? "Vào đọc" : "Tạo tài khoản"}
          </button>
        </form>
        {allowSignups && (
          <button
            className="link-button"
            type="button"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
          >
            {mode === "login" ? "Chưa có tài khoản? Tạo mới." : "Đã có tài khoản? Đăng nhập."}
          </button>
        )}
      </section>
    </main>
  );
}
