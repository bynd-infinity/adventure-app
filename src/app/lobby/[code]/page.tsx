import { notFound, redirect } from "next/navigation";
import { LobbyClient } from "@/components/lobby/LobbyClient";
import { fetchPlayersForSession } from "@/lib/lobby/players";
import { findSessionByCode } from "@/lib/lobby/session";

type LobbyPageProps = {
  params: Promise<{ code: string }>;
};

export default async function LobbyPage({ params }: LobbyPageProps) {
  const { code } = await params;
  const session = await findSessionByCode(code);

  if (!session) {
    notFound();
  }

  if (session.status === "active") {
    redirect(`/game/${session.id}`);
  }

  const players = await fetchPlayersForSession(session.id);

  return <LobbyClient session={session} players={players} />;
}
