"use client";

import { startTransition, useEffect, useRef, useState } from "react";

import type { DashboardSnapshot } from "../lib/dashboard-types";
import { DashboardView } from "./dashboard-view";

type DashboardProps = {
  initialSnapshot: DashboardSnapshot;
  pollIntervalMs?: number;
};

export function Dashboard({
  initialSnapshot,
  pollIntervalMs = 5_000,
}: DashboardProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [fetchState, setFetchState] = useState<"idle" | "running" | "error">("idle");
  const [lastSuccessfulRefreshAt, setLastSuccessfulRefreshAt] = useState(initialSnapshot.fetchedAt);
  const [selectedCandidateKey, setSelectedCandidateKey] = useState<string | null>(null);
  const refreshSnapshotRef = useRef<() => Promise<void>>(async () => undefined);

  refreshSnapshotRef.current = async () => {
    setFetchState("running");

    try {
      const response = await fetch("/api/dashboard", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Dashboard refresh failed with status ${response.status}.`);
      }

      const nextSnapshot = (await response.json()) as DashboardSnapshot;
      startTransition(() => {
        setSnapshot(nextSnapshot);
        setLastSuccessfulRefreshAt(nextSnapshot.fetchedAt);
        setFetchState("idle");
      });
    } catch {
      startTransition(() => {
        setFetchState("error");
      });
    }
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshSnapshotRef.current();
    }, pollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [pollIntervalMs]);

  return (
    <DashboardView
      fetchState={fetchState}
      lastSuccessfulRefreshAt={lastSuccessfulRefreshAt}
      onRefresh={() => {
        void refreshSnapshotRef.current();
      }}
      onSelectCandidate={(candidateKey) => {
        startTransition(() => {
          setSelectedCandidateKey(candidateKey);
        });
      }}
      selectedCandidateKey={selectedCandidateKey}
      snapshot={snapshot}
    />
  );
}
