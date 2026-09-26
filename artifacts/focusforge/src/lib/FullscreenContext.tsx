import { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface FullscreenContextProps {
  isFullscreen: boolean;
  toggleFullscreen: () => Promise<void>;
}

const FullscreenContext = createContext<FullscreenContextProps | undefined>(undefined);

export function useFullscreen() {
  const context = useContext(FullscreenContext);
  if (!context) {
    throw new Error('useFullscreen must be used within a FullscreenProvider');
  }
  return context;
}

export function FullscreenProvider({ children }: { children: React.ReactNode }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Safely detect if we're in Electron environment
  const isElectron = typeof window !== 'undefined' && !!((window as any).electronAPI);

  const toggleFullscreen = useCallback(async () => {
    // Start transition immediately
    setIsTransitioning(true);

    if (isElectron && (window as any).electronAPI?.toggleFullscreen) {
      // Use Electron IPC
      await (window as any).electronAPI.toggleFullscreen();
    } else {
      // Fallback to browser fullscreen API
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    }

    // Clear the transition state after the window has safely resized and settled
    setTimeout(() => setIsTransitioning(false), 300);
  }, [isElectron]);

  // Sync with Electron fullscreen state changes
  useEffect(() => {
    if (!isElectron || !((window as any).electronAPI)) return;

    const handleEnterFullscreen = () => setIsFullscreen(prev => prev === true ? prev : true);
    const handleLeaveFullscreen = () => setIsFullscreen(prev => prev === false ? prev : false);

    const unsubscribeEnter = ((window as any).electronAPI.onEnterFullscreen(handleEnterFullscreen));
    const unsubscribeLeave = ((window as any).electronAPI.onLeaveFullscreen(handleLeaveFullscreen));

    // Also update state based on current fullscreen status on mount
    // Note: Electron doesn't provide a direct way to check initial fullscreen state
    // We'll rely on the events which fire when state changes

    return () => {
      unsubscribeEnter();
      unsubscribeLeave();
    };
  }, [isElectron]);

  // Also listen for browser fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []); // Empty deps - run once on mount

  const value = {
    isFullscreen,
    toggleFullscreen,
    isTransitioning
  };

  return (
    <FullscreenContext.Provider value={value}>
      {children}
    </FullscreenContext.Provider>
  );
}