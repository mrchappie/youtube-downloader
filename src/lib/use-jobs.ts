"use client";

import { useEffect, useState } from "react";
import type { PublicJob } from "./types";

export function useJobs() {
  const [jobs, setJobs] = useState<PublicJob[]>([]);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/jobs", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { jobs: PublicJob[] };
        if (active) setJobs(data.jobs);
      } catch {
        /* transient network error, keep polling */
      }
    };
    void tick();
    const id = setInterval(tick, 1000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return { jobs, setJobs };
}
