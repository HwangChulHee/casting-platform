"use client";

import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase/client";

export function AuthNav() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, next) =>
      setSession(next),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <nav className="nav">
      <Link href="/auditions">공고</Link>
      <Link href="/login" data-testid="nav-auth">
        {session ? session.user.email : "로그인"}
      </Link>
    </nav>
  );
}
