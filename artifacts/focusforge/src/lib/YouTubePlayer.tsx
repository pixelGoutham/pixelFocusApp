import React, { useEffect, useRef } from "react";

interface YouTubePlayerProps {
  videoId: string;
  autoplay?: boolean;
  onReady?: (event: any) => void;
  onStateChange?: (event: any) => void;
  onPlayerRef?: (player: YT.Player | null) => void;
}

/**
 * YouTubePlayer - A headless YouTube player component
 * Renders as a 0x0 div to remain completely hidden while providing audio playback
 */
const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  autoplay = false,
  onReady,
  onStateChange,
  onPlayerRef,
}) => {
  const playerRef = useRef<YT.Player | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load YouTube IFrame API if not already loaded
    if (window.YT?.Player) {
      initializePlayer();
    } else {
      // Load the YouTube IFrame API script
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag) {
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      // Define the callback function that YouTube will call when ready
      (window as any).onYouTubeIframeAPIReady = () => {
        initializePlayer();
      };
    }

    // Cleanup function
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId, onReady, onStateChange, onPlayerRef]); // Removed autoplay from deps

  const initializePlayer = () => {
    if (!playerContainerRef.current) return;

    playerRef.current = new YT.Player(playerContainerRef.current, {
      height: "0",
      width: "0",
      videoId,
      playerVars: {
        autoplay: autoplay ? 1 : 0, // Use the current autoplay value
        controls: 0,
        rel: 0,
        showinfo: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        enablejsapi: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (event) => {
          if (onReady) onReady(event);
          // Notify parent of player instance
          if (onPlayerRef) onPlayerRef(playerRef.current);
        },
        onStateChange: (event) => {
          if (onStateChange) onStateChange(event);
        },
        onError: (event) => {
          console.error("YouTube player error:", event);
        },
      },
    });
  };

  // Expose player methods for external control
  const playerMethods = useRef({
    playVideo: () => playerRef.current?.playVideo(),
    pauseVideo: () => playerRef.current?.pauseVideo(),
    seekTo: (seconds: number) => playerRef.current?.seekTo(seconds, true),
    setVolume: (volume: number) => playerRef.current?.setVolume(volume),
    getCurrentTime: () => playerRef.current?.getCurrentTime(),
    getDuration: () => playerRef.current?.getDuration(),
    getVideoLoadedFraction: () => playerRef.current?.getVideoLoadedFraction(),
    getPlayerState: () => playerRef.current?.getPlayerState(),
  });

  // Expose the playerMethods via ref if onPlayerRef is provided
  useEffect(() => {
    if (onPlayerRef) {
      onPlayerRef(playerMethods.current);
    }
  }, [onPlayerRef]);

  return (
    <div
      ref={playerContainerRef}
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    />
  );
};

export default YouTubePlayer;
