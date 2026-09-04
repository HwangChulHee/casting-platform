"use client";

import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase/client";
import { useTRPC } from "@/lib/trpc";

type Mode = "signIn" | "signUp";

export default function LoginPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * onAuthStateChange는 로그인/로그아웃/토큰 자동갱신을 모두 알려준다.
   * 세션이 바뀌면 React Query 캐시를 비운다 —
   * 안 그러면 이전 사용자의 응답이 화면에 남는다.
   */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      void queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  /**
   * 인증이 필요한 procedure. 세션이 없으면 아예 요청하지 않는다(enabled).
   * 서버에서 UNAUTHORIZED가 오면 재시도할 이유가 없으므로 retry: false.
   */
  const me = useQuery({
    ...trpc.me.get.queryOptions(),
    enabled: session !== null,
    retry: false,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const fn =
      mode === "signIn"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    setBusy(false);
    if (error) setMessage(error.message);
    else if (mode === "signUp") setMessage("가입 완료. 이메일 확인이 필요할 수 있습니다.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMessage(null);
  }

  return (
    <main>
      <h1>로그인</h1>

      {session ? (
        <section className="card">
          <p>
            <strong>{session.user.email}</strong> 로 로그인됨
          </p>

          <h2 className="sub">서버가 인증한 결과 (me.get)</h2>
          {me.isPending && <p className="muted">확인 중…</p>}
          {me.isError && <p className="error">{me.error.message}</p>}
          {me.data && (
            <dl className="meta col">
              <div>
                <dt>id</dt>
                <dd><code>{me.data.id}</code></dd>
              </div>
              <div>
                <dt>email</dt>
                <dd>{me.data.email}</dd>
              </div>
              <div>
                <dt>role</dt>
                <dd>
                  <span className="badge badge-open">{me.data.role}</span>
                </dd>
              </div>
            </dl>
          )}

          <button type="button" className="chip" onClick={signOut}>
            로그아웃
          </button>
        </section>
      ) : (
        <form onSubmit={submit} className="card form">
          <div className="filters">
            <button
              type="button"
              className={mode === "signIn" ? "chip chip-on" : "chip"}
              onClick={() => setMode("signIn")}
            >
              로그인
            </button>
            <button
              type="button"
              className={mode === "signUp" ? "chip chip-on" : "chip"}
              onClick={() => setMode("signUp")}
            >
              회원가입
            </button>
          </div>

          <label>
            이메일
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label>
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="current-password"
            />
          </label>

          <button type="submit" className="chip chip-on" disabled={busy}>
            {busy ? "처리 중…" : mode === "signIn" ? "로그인" : "가입하기"}
          </button>
        </form>
      )}

      {message && <p className="error">{message}</p>}
    </main>
  );
}
