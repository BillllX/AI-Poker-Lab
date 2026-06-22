import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { TableSpectatorFaqJsonLd } from "@/components/TableSpectatorFaqJsonLd";
import { TableSpectatorJsonLd } from "@/components/TableSpectatorJsonLd";
import { breadcrumbTrail } from "@/lib/server/breadcrumbJsonLd";
import { buildPageMetadata } from "@/lib/server/pageMetadata";
import { getSiteOrigin } from "@/lib/server/siteUrl";
import { getTableManager } from "@/lib/server/simulator";

type TableLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ tableId: string }>;
};

function resolveTableSpectator(tableId: string) {
  const table = getTableManager(getSiteOrigin()).table(tableId);
  if (!table) {
    return undefined;
  }

  const summary = table.runner.tableSummary();
  const path = `/tables/${encodeURIComponent(tableId)}`;
  return { path, summary };
}

export async function generateMetadata({ params }: Pick<TableLayoutProps, "params">): Promise<Metadata> {
  const { tableId } = await params;
  const resolved = resolveTableSpectator(tableId);

  if (!resolved) {
    return {
      title: "Table Not Found",
      robots: { index: false, follow: false },
    };
  }

  const { path, summary } = resolved;
  const description = summary.running
    ? `Watch live Texas Hold'em on "${summary.name}" — hand #${summary.handId}, ${summary.playerCount}/${summary.maxPlayers} seated, ${summary.phase}.`
    : `Waiting table "${summary.name}" on AI Poker Lab — join the spectator view when play starts.`;

  return buildPageMetadata({
    path,
    title: summary.name,
    description,
    keywords: ["AI poker spectator", "live Texas Hold'em", summary.name, summary.phase],
    ogImagePath: "/images/landing/arena-lobby-panorama.webp",
  });
}

export default async function TableSpectatorLayout({ children, params }: TableLayoutProps) {
  const { tableId } = await params;
  const resolved = resolveTableSpectator(tableId);
  const tableName = resolved?.summary.name ?? "Live Table";
  const tablePath = resolved?.path ?? `/tables/${encodeURIComponent(tableId)}`;
  const description = resolved
    ? resolved.summary.running
      ? `Watch live Texas Hold'em on "${resolved.summary.name}" — hand #${resolved.summary.handId}, ${resolved.summary.playerCount}/${resolved.summary.maxPlayers} seated, ${resolved.summary.phase}.`
      : `Waiting table "${resolved.summary.name}" on AI Poker Lab — join the spectator view when play starts.`
    : "Live AI poker table spectator view on AI Poker Lab.";

  return (
    <>
      {resolved ? (
        <>
          <TableSpectatorJsonLd
            description={description}
            running={resolved.summary.running}
            tableId={tableId}
            tableName={tableName}
          />
          <TableSpectatorFaqJsonLd tableId={tableId} />
        </>
      ) : null}
      <BreadcrumbJsonLd
        items={breadcrumbTrail(
          { name: "Live Tables", path: "/tables" },
          { name: tableName, path: tablePath },
        )}
      />
      {children}
    </>
  );
}
