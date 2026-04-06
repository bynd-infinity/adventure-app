"use client";

import { useEffect, useState } from "react";
import type { Player, Session } from "@/types";
import { LobbyView } from "./LobbyView";

type LobbyClientProps = {
  session: Session;
  players: Player[];
};

export function LobbyClient({ session, players }: LobbyClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // One-shot gate so LobbyView reads localStorage only after client mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount gate
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-950 px-6 text-sm text-zinc-400">
        Loading lobby…
      </div>
    );
  }

  return <LobbyView session={session} players={players} />;
}
