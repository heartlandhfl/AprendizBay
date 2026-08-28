"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import HubSlotCard from "@/components/hubs/HubSlotCard";
import { useAuth } from "@/lib/auth/AuthContext";
import type { CollectiveHubLive } from "@/lib/hubs/types";
import { joinCollectiveHub, subscribeToTutorCollectiveHubs } from "@/lib/hubs/service";

interface CollectiveHubListProps {
  tutorId: string;
  selectedHubId?: string;
  onSelectHub?: (hubId: string) => void;
  onHubsChange?: (hubs: CollectiveHubLive[]) => void;
  selectable?: boolean;
  showJoinButtons?: boolean;
}

export default function CollectiveHubList({
  tutorId,
  selectedHubId,
  onSelectHub,
  onHubsChange,
  selectable = false,
  showJoinButtons = false,
}: CollectiveHubListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userDoc } = useAuth();
  const [hubs, setHubs] = useState<CollectiveHubLive[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningHubId, setJoiningHubId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToTutorCollectiveHubs(
      tutorId,
      (nextHubs) => {
        setHubs(nextHubs);
        onHubsChange?.(nextHubs);
        setLoading(false);
      },
      () => {
        setError("Não foi possível carregar as turmas.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [onHubsChange, tutorId]);

  async function handleJoin(hubId: string) {
    setError(null);

    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (userDoc?.role !== "student") {
      setError("Apenas alunos podem entrar em turmas.");
      return;
    }

    setJoiningHubId(hubId);

    try {
      await joinCollectiveHub(hubId, user.uid);
    } catch {
      setError("Não foi possível entrar na turma. Tente novamente.");
    } finally {
      setJoiningHubId(null);
    }
  }

  function renderJoinSlot(hub: CollectiveHubLive) {
    const isFull = hub.confirmedStudents >= hub.maxStudents;
    const isJoined = user ? hub.confirmedStudentIds.includes(user.uid) : false;

    if (isFull) {
      return (
        <p className="rounded-xl bg-muted px-3 py-2 text-center text-sm font-medium text-muted-foreground">
          Turma completa
        </p>
      );
    }

    if (isJoined) {
      return (
        <p className="rounded-xl bg-primary-50 px-3 py-2 text-center text-sm font-medium text-primary-700">
          Você já está inscrito nesta turma
        </p>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleJoin(hub.id)}
        disabled={joiningHubId === hub.id}
        className="w-full rounded-2xl bg-secondary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-secondary-600 disabled:opacity-60"
      >
        {joiningHubId === hub.id ? "Entrando..." : "Entrar na turma"}
      </button>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" aria-hidden="true" />
      </div>
    );
  }

  if (hubs.length === 0) {
    return (
      <div className="rounded-2xl bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
        Nenhuma turma aberta no momento.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {hubs.map((hub) => (
        <HubSlotCard
          key={hub.id}
          hub={hub}
          selectable={selectable}
          selected={selectedHubId === hub.id}
          onSelect={onSelectHub ? () => onSelectHub(hub.id) : undefined}
          joinSlot={showJoinButtons ? renderJoinSlot(hub) : undefined}
        />
      ))}
    </div>
  );
}
