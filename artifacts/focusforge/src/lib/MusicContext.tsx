import React, { createContext, useContext, useState, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface MusicState {
  rawUrl: string;
  embedUrl: string | null;
  title: string | null;
  thumb: string | null;
}

interface MusicContextType extends MusicState {
  setYt: (url: string) => void;
  clearYt: () => void;
}

// ─── URL parser ───────────────────────────────────────────────────────────────
export function parseYtEmbed(raw: string): string | null {
  try {
    const normalised = raw.trim().replace('music.youtube.com', 'www.youtube.com');
    const u = new URL(normalised);
    const list    = u.searchParams.get('list');
    const v       = u.searchParams.get('v');
    const shortId = u.hostname === 'youtu.be' ? u.pathname.slice(1).split('?')[0] : null;
    const base    = 'https://www.youtube-nocookie.com/embed/';
    const params  = '&autoplay=1&rel=0&modestbranding=1&iv_load_policy=3';
    if (list && !v) return `${base}videoseries?list=${list}${params}`;
    if (shortId)   return `${base}${shortId}?${params.slice(1)}`;
    if (v)         return `${base}${v}?${params.slice(1)}`;
    if (list)      return `${base}videoseries?list=${list}${params}`;
    return null;
  } catch { return null; }
}

// ─── Metadata fetch (best-effort, fails silently offline) ────────────────────
async function fetchMeta(rawUrl: string): Promise<{ title: string | null; thumb: string | null }> {
  try {
    const url = rawUrl.replace('music.youtube.com', 'www.youtube.com');
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) throw new Error('oembed failed');
    const d = await res.json();
    return { title: d.title ?? null, thumb: d.thumbnail_url ?? null };
  } catch {
    return { title: null, thumb: null };
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const MusicContext = createContext<MusicContextType>({
  rawUrl: '', embedUrl: null, title: null, thumb: null,
  setYt: () => {}, clearYt: () => {},
});

export function useMusicContext() { return useContext(MusicContext); }

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MusicState>({
    rawUrl: '', embedUrl: null, title: null, thumb: null,
  });

  const setYt = useCallback(async (url: string) => {
    const embedUrl = parseYtEmbed(url);
    if (!embedUrl) return;
    setState({ rawUrl: url, embedUrl, title: null, thumb: null });
    const meta = await fetchMeta(url);
    // Only apply if user hasn't changed the URL since
    setState(prev => prev.embedUrl === embedUrl ? { ...prev, ...meta } : prev);
  }, []);

  const clearYt = useCallback(() => {
    setState({ rawUrl: '', embedUrl: null, title: null, thumb: null });
  }, []);

  return (
    <MusicContext.Provider value={{ ...state, setYt, clearYt }}>
      {children}
    </MusicContext.Provider>
  );
}
