import { useEffect, useState } from 'react';
import { useTimer } from '@/lib/TimerContext';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';

export function DiscordPresence() {
  const { pom } = useTimer();
  const { state: musicState } = useMusicPlayer();

  // Holds the stable timestamp so skipping tracks doesn't reset the Discord counter
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  useEffect(() => {
    const isElectron = typeof window !== 'undefined' && !!((window as any).electronAPI);
    if (!isElectron) return;

    const isWorking = pom.running && pom.phase === 'work';
    const isPlayingMusic = musicState.isPlaying && musicState.currentTrack;

    // 1. Clear activity if doing neither
    if (!isWorking && !isPlayingMusic) {
      if (sessionStartTime !== null) setSessionStartTime(null);
      if ((window as any).electronAPI.clearDiscordActivity) {
        (window as any).electronAPI.clearDiscordActivity();
      }
      return;
    }

    // 2. Manage stable start time
    let currentStartTime = sessionStartTime;
    if (isWorking && !currentStartTime) {
      currentStartTime = Date.now();
      setSessionStartTime(currentStartTime);
    } else if (!isWorking && currentStartTime) {
      currentStartTime = null;
      setSessionStartTime(null);
    }

    // 3. Format the status lines
    let details = '';
    let stateText = '';

    if (isWorking) {
      details = `Studying ${pom.selectedSubject || 'Deep Work'}`;
      stateText = 'Focusing';
    } else {
      details = 'Taking a break';
      stateText = 'Vibing';
    }

    // 4. Append Music if playing
    if (isPlayingMusic) {
      // Truncate long song titles to keep the Discord card looking clean
      const rawTitle = musicState.currentTrack!.title;
      const cleanTitle = rawTitle.length > 35
        ? rawTitle.substring(0, 32) + '...'
        : rawTitle;

      stateText += ` • 🎵 ${cleanTitle}`;
    }

    // 5. Send to Electron
    (window as any).electronAPI.setDiscordActivity({
      details,
      state: stateText,
      startTimestamp: currentStartTime || undefined, // Only pass timestamp if working
    });

  }, [
    pom.running,
    pom.phase,
    pom.selectedSubject,
    musicState.isPlaying,
    musicState.currentTrack?.title,
    sessionStartTime
  ]);

  return null; // Invisible logic component
}