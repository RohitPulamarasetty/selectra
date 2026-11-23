"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function StudentRefresh() {
  const router = useRouter();
  useEffect(() => {
    let lastChecked = Date.now();
    function update() {
      if (document.visibilityState !== "visible" || Date.now() - lastChecked < 15_000) return;
      lastChecked = Date.now();
      router.refresh();
    }
    const timer = window.setInterval(update, 60_000);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [router]);
  return null;
}
