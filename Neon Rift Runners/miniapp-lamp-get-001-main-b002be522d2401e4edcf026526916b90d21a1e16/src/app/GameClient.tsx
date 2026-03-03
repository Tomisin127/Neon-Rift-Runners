/**
 * @file      /src/app/GameClient.tsx
 * @summary   Client-only wrapper for Neon Rift Runners
 */
"use client";

import dynamic from 'next/dynamic';
import { useEffect } from 'react';

const NeonRiftGame = dynamic(
  () => import('./neon-rift/NeonRiftPage'),
  { ssr: false }
);

export default function GameClient() {
  // Ensure viewport meta is present at runtime
  useEffect(() => {
    const content = 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no';
    let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    if (meta.content !== content) meta.content = content;
  }, []);

  return <NeonRiftGame />;
}
