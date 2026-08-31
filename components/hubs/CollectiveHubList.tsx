"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import HubSlotCard from "@/components/hubs/HubSlotCard";
import type { CollectiveHubLive } from "@/lib/hubs/types";
import { subscribeToTutorCollectiveHubs } from "@/lib/hubs/service";
import { useAuth } from "@/lib/auth/AuthContext";

interface CollectiveHubListProps {
  tutorId: string;
  selectedHubId?: string;
  onSelectHub?: (hubId: string) => void;
  onHubsChange?: (hubs: CollectiveHubLive[]) => void;
  selectable?: boolean;
  showDetailLinks?: boolean;
}

export default function CollectiveHubList({
  tutorId,
  selectedHubId,
  onSelectHub,
  onHubsChange,
  selectable = false,
  showDetailLinks = false,
}: CollectiveHubListProps) {
  const { user } = useAuth();
  const [hubs, setHubs] = useState<CollectiveHubLive[]>([]);
  const [loading, setLoading] = useState(true);
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
      user?.uid,
    );

    return unsubscribe;
  }, [onHubsChange, tutorId, user?.uid]);

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
          href={showDetailLinks ? `/turmas/${hub.id}` : undefined}
        />
      ))}
    </div>
  );
}
