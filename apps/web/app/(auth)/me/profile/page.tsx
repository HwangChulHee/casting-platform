"use client";

import type { Session } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GENDERS, type Gender } from "@casting/shared";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase/client";
import { useTRPC } from "@/lib/trpc";

const GENDER_LABEL: Record<Gender, string> = {
  male: "남성",
  female: "여성",
  other: "기타",
};

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"] as const;
type Accepted = (typeof ACCEPTED)[number];

export default function ProfilePage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, next) =>
      setSession(next),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const profile = useQuery({
    ...trpc.profile.me.queryOptions(),
    enabled: session !== null,
    retry: false,
  });

  // 서버에서 온 값으로 폼을 한 번 채운다.
  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setName(p.name);
    setBio(p.bio ?? "");
    setAge(p.age === null ? "" : String(p.age));
    setGender(p.gender ?? "");
  }, [profile.data]);

  const upsert = useMutation({
    ...trpc.profile.upsert.mutationOptions(),
    onSuccess: () => {
      setNotice("저장했습니다.");
      void queryClient.invalidateQueries(trpc.profile.me.queryFilter());
    },
    onError: (e) => setNotice(e.message),
  });

  const createUploadUrl = useMutation(
    trpc.profile.createImageUploadUrl.mutationOptions(),
  );
  const setImage = useMutation({
    ...trpc.profile.setImage.mutationOptions(),
    onSuccess: () => {
      setNotice("사진을 변경했습니다.");
      void queryClient.invalidateQueries(trpc.profile.me.queryFilter());
    },
  });

  /**
   * 업로드 3단계. 파일이 API 서버를 거치지 않는 게 핵심이다.
   *   1. API에 서명된 업로드 URL을 요청한다 (경로는 서버가 정한다)
   *   2. 브라우저가 그 URL로 Storage에 직접 PUT
   *   3. 완료된 경로만 API에 알려 DB에 반영
   */
  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNotice(null);

    if (!ACCEPTED.includes(file.type as Accepted)) {
      setNotice("jpg, png, webp만 올릴 수 있습니다.");
      return;
    }

    setUploading(true);
    try {
      const { path, signedUrl } = await createUploadUrl.mutateAsync({
        contentType: file.type as Accepted,
      });

      const put = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`Storage 업로드 실패 (${put.status})`);

      await setImage.mutateAsync({ imagePath: path });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!ready) return <main><p className="muted">확인 중…</p></main>;

  if (!session) {
    return (
      <main>
        <h1>내 프로필</h1>
        <p className="muted">
          로그인이 필요합니다. <Link href="/login">로그인하러 가기</Link>
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>내 프로필</h1>

      <section className="card">
        <h2 className="sub">프로필 사진</h2>
        {profile.data?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.data.imageUrl}
            alt="프로필 사진"
            className="avatar"
            data-testid="avatar"
          />
        ) : (
          <div className="avatar avatar-empty">사진 없음</div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED.join(",")}
          onChange={onPickFile}
          disabled={uploading || !profile.data}
          data-testid="file-input"
        />
        {!profile.data && (
          <p className="muted">프로필을 먼저 저장해야 사진을 올릴 수 있습니다.</p>
        )}
        {uploading && <p className="muted">업로드 중…</p>}
      </section>

      <form
        className="card form"
        onSubmit={(e) => {
          e.preventDefault();
          setNotice(null);
          upsert.mutate({
            name,
            bio: bio.trim() === "" ? null : bio,
            age: age.trim() === "" ? null : Number(age),
            gender: gender === "" ? null : gender,
          });
        }}
      >
        <h2 className="sub">기본 정보</h2>

        <label>
          이름
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} />
        </label>

        <label>
          소개
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={2000} />
        </label>

        <label>
          나이
          <input type="number" value={age} onChange={(e) => setAge(e.target.value)} min={0} max={120} />
        </label>

        <label>
          성별
          <select value={gender} onChange={(e) => setGender(e.target.value as Gender | "")}>
            <option value="">선택 안 함</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>{GENDER_LABEL[g]}</option>
            ))}
          </select>
        </label>

        <button type="submit" className="chip chip-on" disabled={upsert.isPending}>
          {upsert.isPending ? "저장 중…" : "저장"}
        </button>
      </form>

      {notice && <p className="muted" data-testid="notice">{notice}</p>}
    </main>
  );
}
