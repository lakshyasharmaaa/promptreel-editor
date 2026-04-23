import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

interface Props {
  src: string;
  clipOffset: number;
  isPlaying: boolean;
  volume?: number;
}

export default function VideoPlayer({ src, clipOffset, isPlaying, volume = 1 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef    = useRef<ReturnType<typeof videojs> | null>(null);
  const syncingRef   = useRef(false);
  const prevSrcRef   = useRef('');

  useEffect(() => {
    if (!containerRef.current) return;
    const el = document.createElement('video');
    el.className = 'video-js vjs-fill';
    containerRef.current.appendChild(el);

    const player = videojs(el, {
      controls: false, autoplay: false, preload: 'auto', fill: true,
      sources: [{ src, type: src.endsWith('.webm') ? 'video/webm' : 'video/mp4' }],
    });
    playerRef.current = player;
    prevSrcRef.current = src;

    player.on('loadedmetadata', () => {
      if (!syncingRef.current) {
        player.currentTime(clipOffset);
        syncingRef.current = true;
      }
    });

    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap source when clip changes
  useEffect(() => {
    const player = playerRef.current;
    if (!player || player.isDisposed() || src === prevSrcRef.current) return;
    prevSrcRef.current = src;
    player.src([{ src, type: src.endsWith('.webm') ? 'video/webm' : 'video/mp4' }]);
  }, [src]);

  // Seek sync
  useEffect(() => {
    const player = playerRef.current;
    if (!player || player.isDisposed()) return;
    
    const cur = player.currentTime() ?? 0;
    const diff = Math.abs(cur - clipOffset);
    
    // Don't issue seek commands if it's already seeking to avoid loops
    if (player.seeking()) return;

    if (isPlaying) {
      // Let the native player advance naturally, only correct if drift is large (>0.5s)
      // Only correct if we actually have enough data to play (readyState >= 2)
      if (diff > 0.5 && player.readyState() >= 2) {
        player.currentTime(clipOffset);
      }
    } else {
      // When paused (scrubbing), keep it tightly synced
      if (diff > 0.05) {
        player.currentTime(clipOffset);
      }
    }
  }, [clipOffset, isPlaying]);

  // Play / pause
  useEffect(() => {
    const player = playerRef.current;
    if (!player || player.isDisposed()) return;
    if (isPlaying) player.play()?.catch(() => {});
    else player.pause();
  }, [isPlaying]);

  // Volume
  useEffect(() => {
    const player = playerRef.current;
    if (!player || player.isDisposed()) return;
    player.volume(Math.min(1, Math.max(0, volume)));
    player.muted(volume === 0);
  }, [volume]);

  return <div ref={containerRef} className="w-full h-full [&_.video-js]:bg-transparent" />;
}
