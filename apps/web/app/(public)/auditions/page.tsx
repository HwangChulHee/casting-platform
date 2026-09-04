"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useTRPC } from "@/lib/trpc";
import type { AuditionStatus } from "@casting/shared";

const STATUS_LABEL: Record<AuditionStatus | "all", string> = {
  all: "전체",
  open: "모집중",
  closed: "마감",
};

export default function AuditionsPage() {
  const trpc = useTRPC();
  const [status, setStatus] = useState<AuditionStatus | "all">("open");

  /**
   * 여기가 이 프로젝트의 데이터 흐름이 한 줄로 드러나는 지점이다.
   *
   *   trpc.audition.list.queryOptions({...})
   *     → { queryKey, queryFn } 을 만들어 준다
   *   useQuery(...)
   *     → React Query가 캐시를 확인하고, 없으면 queryFn 실행
   *   queryFn
   *     → httpBatchLink가 GET /trpc/audition.list?input=... 요청
   *     → Express → tRPC → service → Drizzle → PostgreSQL
   *
   * input의 타입도, data의 타입도 서버의 AppRouter에서 왔다.
   * status에 오타를 내면 이 파일이 컴파일되지 않는다.
   */
  const query = useQuery(
    trpc.audition.list.queryOptions({
      ...(status === "all" ? {} : { status }),
      limit: 20,
    }),
  );

  return (
    <main>
      <h1>오디션 공고</h1>

      <div className="filters">
        {(["all", "open", "closed"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={s === status ? "chip chip-on" : "chip"}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {query.isPending && <p className="muted">불러오는 중…</p>}

      {query.isError && (
        <p className="error">
          공고를 불러오지 못했습니다: {query.error.message}
        </p>
      )}

      {query.data && (
        <>
          <p className="muted">전체 {query.data.total}건</p>
          <ul className="list">
            {query.data.items.map((a) => (
              <li key={a.id} className="card">
                <div className="card-head">
                  <h2>{a.title}</h2>
                  <span className={`badge badge-${a.status}`}>
                    {STATUS_LABEL[a.status]}
                  </span>
                </div>
                <p className="desc">{a.description}</p>
                <dl className="meta">
                  <div>
                    <dt>마감</dt>
                    <dd>
                      {new Date(a.deadline).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </dd>
                  </div>
                  {(a.minAge !== null || a.maxAge !== null) && (
                    <div>
                      <dt>연령</dt>
                      <dd>
                        {a.minAge ?? "제한없음"} ~ {a.maxAge ?? "제한없음"}
                      </dd>
                    </div>
                  )}
                  {a.targetGender && (
                    <div>
                      <dt>성별</dt>
                      <dd>
                        {a.targetGender === "male"
                          ? "남"
                          : a.targetGender === "female"
                            ? "여"
                            : "무관"}
                      </dd>
                    </div>
                  )}
                </dl>
              </li>
            ))}
          </ul>

          {query.data.items.length === 0 && (
            <p className="muted">조건에 맞는 공고가 없습니다.</p>
          )}
        </>
      )}
    </main>
  );
}
