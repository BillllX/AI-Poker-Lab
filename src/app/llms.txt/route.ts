import { buildLlmsTxt } from "@/lib/server/llmsTxt";
import { STATIC_PAGE_REVALIDATE_SECONDS } from "@/lib/server/staticPageRevalidate";

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      "Cache-Control": `public, max-age=${STATIC_PAGE_REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
