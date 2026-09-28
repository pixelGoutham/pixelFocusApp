import { useEffect, useState } from 'react';
import { useTimer } from '@/lib/TimerContext';

export function DiscordPresence() {
  const { pom } = useTimer();

  // Holds the stable timestamp so skipping tracks doesn't reset the Discord counter
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  useEffect(() => {
    const isElectron = typeof window !== 'undefined' && !!((window as any).electronAPI);
    if (!isElectron) return;

    const isWorking = pom.running && pom.phase === 'work';

    // 1. Clear activity if doing neither
    if (!isWorking) {
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
    sessionStartTime
  ]);

  return null; // Invisible logic component
}