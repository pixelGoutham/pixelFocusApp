import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import YouTubePlayer from './YouTubePlayer';
import { extractYouTubeId, fetchYouTubeMetadata } from './youtube-utils';

interface Track {
  id: string;
  title: string;
  videoId: string;
  thumbnailUrl?: string;
  duration?: number;
}

interface MusicPlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number; // Current time in seconds
  duration: number; // Total duration in seconds
  volume: number; // 0 to 1
  isFullScreen: boolean;
  playerReady: boolean;
}

interface MusicPlayerActions {
  playTrack: (track: Track) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleFullScreen: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
}

interface MusicPlayerContextProps {
  state: MusicPlayerState;
  actions: MusicPlayerActions;
}

// Default context value
const defaultState: MusicPlayerState = {
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 0.5,
  isFullScreen: false,
  playerReady: false
};

const defaultActions: MusicPlayerActions = {
  playTrack: () => {},
  play: () => {},
  pause: () => {},
  togglePlay: () => {},
  seekTo: () => {},
  setVolume: () => {},
  toggleFullScreen: () => {},
  nextTrack: () => {},
  previousTrack: () => {}
};

const MusicPlayerContext = createContext<MusicPlayerContextProps>({
  state: defaultState,
  actions: defaultActions
});

// Custom hook to use the music player context
export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
};

// Provider component
interface MusicPlayerProviderProps {
  children: React.ReactNode;
}

export const MusicPlayerProvider = ({ children }: MusicPlayerProviderProps) => {
  const [state, setState] = useState<MusicPlayerState>(defaultState);
  const playerRef = useRef<YT.Player | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update progress interval when player is ready or playing
  useEffect(() => {
    if (state.isPlaying && state.playerReady && playerRef.current) {
      progressIntervalRef.current = setInterval(() => {
        if (playerRef.current) {
          const currentTime = playerRef.current.getCurrentTime();
          setState(prev => ({ ...prev, progress: currentTime }));
        }
      }, 1000);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [state.isPlaying, state.playerReady]);

  // Handle YouTube player state changes
  const handlePlayerStateChange = useCallback((event: any) => {
    if (!playerRef.current) return;

    switch (event.data) {
      case YT.PlayerState.PLAYING:
        setState(prev => ({ ...prev, isPlaying: true }));
        break;
      case YT.PlayerState.PAUSED:
        setState(prev => ({ ...prev, isPlaying: false }));
        break;
      case YT.PlayerState.ENDED:
        setState(prev => ({ ...prev, isPlaying: false, progress: 0 }));
        break;
      case YT.PlayerState.BUFFERING:
        // Could set a buffering state if needed
        break;
    }
  }, []);

  // Get video duration when loaded
  const handlePlayerReady = useCallback((event: any) => {
    if (!event.target) return;

    const duration = event.target.getDuration();
    setState(prev => ({
      ...prev,
      playerReady: true,
      duration
    }));

    // Start progress tracking if we're supposed to be playing
    if (state.isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        if (playerRef.current) {
          const currentTime = playerRef.current.getCurrentTime();
          setState(prev => ({ ...prev, progress: currentTime }));
        }
      }, 1000);
    }
  }, [state.isPlaying]);

  // Actions
  const playTrack = useCallback(async (track: Track) => {
    // Extract videoId if not already present
    const videoId = track.videoId || extractYouTubeId(track.id) || '';

    if (!videoId) {
      console.error('Invalid track: no videoId found');
      return;
    }

    // Fetch metadata if not provided
    const thumbnailUrl = track.thumbnailUrl ||
      (await fetchYouTubeMetadata(videoId))?.thumbnailUrl;

    const updatedTrack: Track = {
      ...track,
      videoId,
      thumbnailUrl: thumbnailUrl || undefined
    };

    setState({
      currentTrack: updatedTrack,
      isPlaying: true,
      progress: 0,
      duration: 0,
      volume: state.volume,
      isFullScreen: state.isFullScreen,
      playerReady: false
    });
  }, [state.volume, state.isFullScreen]);

  const play = useCallback(() => {
    if (playerRef.current && state.currentTrack) {
      playerRef.current.playVideo();
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [state.currentTrack]);

  const pause = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pauseVideo();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const togglePlay = useCallback(() => {
    state.isPlaying ? pause() : play();
  }, [play, pause, state.isPlaying]);

  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true);
      setState(prev => ({ ...prev, progress: seconds }));
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (playerRef.current) {
      playerRef.current.setVolume(clampedVolume * 100);
    }
    setState(prev => ({ ...prev, volume: clampedVolume }));
  }, []);

  const toggleFullScreen = useCallback(() => {
    setState(prev => ({ ...prev, isFullScreen: !prev.isFullScreen }));
  }, []);

  const nextTrack = useCallback(() => {
    // This would be implemented with a playlist/queue system
    console.log('Next track not implemented yet');
  }, []);

  const previousTrack = useCallback(() => {
    // This would be implemented with a playlist/queue system
    console.log('Previous track not implemented yet');
  }, []);

  // Set player ref
  const setPlayerRef = useCallback((ref: YT.Player | null) => {
    playerRef.current = ref;
  }, []);

  const actions: MusicPlayerActions = {
    playTrack,
    play,
    pause,
    togglePlay,
    seekTo,
    setVolume,
    toggleFullScreen,
    nextTrack,
    previousTrack
  };

  return (
    <MusicPlayerContext.Provider value={{ state, actions }}>
      <div>
        {children}
        {/* Hidden YouTube player */}
        {state.currentTrack && (
          <YouTubePlayer
            videoId={state.currentTrack.videoId}
            autoplay={state.isPlaying}
            onReady={handlePlayerReady}
            onStateChange={handlePlayerStateChange}
          />
        )}
      </div>
    </MusicPlayerContext.Provider>
  );
};

export default MusicPlayerProvider;