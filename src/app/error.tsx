"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("app_render_error", error);
  }, [error]);

  return (
    <main className="routeErrorPage" role="alert">
      <section className="routeErrorCard">
        <p className="routeErrorEyebrow">页面异常</p>
        <h1>页面刚刚加载失败</h1>
        <p>可能是实时牌桌数据短暂异常或网络恢复时的旧缓存。请重试，或先返回大厅。</p>
        <div className="routeErrorActions">
          <button type="button" onClick={reset}>重试</button>
          <Link href="/tables">返回大厅</Link>
        </div>
      </section>
    </main>
  );
}
