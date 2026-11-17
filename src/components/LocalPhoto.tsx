"use client";
import { useEffect, useState } from "react";
import { localFetch } from "@/lib/local-fetch";

/** Renders a photo stored on this device (IndexedDB) via a temporary object URL. */
export function LocalPhoto({ id, alt = "", className, loading }: { id: string; alt?: string; className?: string; loading?: "lazy" | "eager" }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    let live = true;
    localFetch(`/api/photos/${id}`).then(async (r) => {
      if (!r.ok || !live) return;
      u = URL.createObjectURL(await r.blob());
      setUrl(u);
    });
    return () => { live = false; if (u) URL.revokeObjectURL(u); };
  }, [id]);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt={alt} className={className} loading={loading} /> : <div className={`${className ?? ""} skeleton`} />;
}
