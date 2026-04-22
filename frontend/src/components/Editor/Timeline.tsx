import { useEffect, useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import { Play, Pause, Square, ZoomIn, ZoomOut } from 'lucide-react';
import { useStore } from '../../store/useStore';

/* ─── Constants ─────────────────────────────────────────────── */
const TRACK_H = 72;
const RULER_H = 28;
const HEADER_W = 150;
const PPS_BASE = 20;        // pixels-per-second at zoom=1
const CLIP_PAD = 6;
const HANDLE_W = 10;

const TRACK_FILL: Record<string, string> = {
  video:   '#2d4a7a',
  audio:   '#2d6b4a',
  text:    '#6b2d4a',
  effect:  '#6b5a2d',
  sticker: '#4a2d6b',
  image:   '#2d6b4a',
};

/* ─── Component ─────────────────────────────────────────────── */
export default function Timeline() {
  const {
    currentProject, isPlaying, setIsPlaying,
    setPlayheadPosition, zoom, setZoom,
    selectedClip, setSelectedClip, updateClip,
  } = useStore();

  const canvasElRef  = useRef<HTMLCanvasElement>(null);
  const fabricRef    = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef     = useRef({ zoom, selectedClipId: selectedClip?.id });

  const playhead   = currentProject?.timeline.playheadPosition ?? 0;
  const duration   = currentProject?.timeline.duration ?? 300;
  const tracks     = currentProject?.timeline.tracks ?? [];
  const PPS        = PPS_BASE * zoom;
  const canvasH    = RULER_H + tracks.length * TRACK_H;
  const canvasW    = Math.max(duration * PPS + 200, 1400);

  /* ── Keep stateRef current ───────────────────────────────── */
  useEffect(() => {
    stateRef.current = { zoom, selectedClipId: selectedClip?.id };
  }, [zoom, selectedClip?.id]);

  /* ── Playback interval ───────────────────────────────────── */
  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      setPlayheadPosition((prev) => {
        if (prev + 0.1 >= duration) { setIsPlaying(false); return 0; }
        return prev + 0.1;
      });
    }, 100);
    return () => clearInterval(id);
  }, [isPlaying, duration, setPlayheadPosition, setIsPlaying]);

  /* ── Build / re-render Fabric canvas ─────────────────────── */
  const buildCanvas = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || !currentProject) return;
    canvas.clear();

    const PPS = PPS_BASE * stateRef.current.zoom;
    const selectedId = stateRef.current.selectedClipId;

    /* ruler bg */
    canvas.add(new fabric.Rect({
      left: 0, top: 0, width: canvasW, height: RULER_H,
      fill: '#1a1a1a', selectable: false, evented: false,
    }));

    /* ruler ticks */
    const step = PPS < 10 ? 30 : PPS < 30 ? 10 : 5;
    for (let t = 0; t <= duration; t += step) {
      const x = t * PPS;
      canvas.add(new fabric.Line([x, RULER_H - 6, x, RULER_H], {
        stroke: '#555', strokeWidth: 1, selectable: false, evented: false,
      }));
      const mm = Math.floor(t / 60).toString().padStart(2, '0');
      const ss = (t % 60).toString().padStart(2, '0');
      canvas.add(new fabric.IText(`${mm}:${ss}`, {
        left: x + 3, top: 6, fontSize: 10, fill: '#777',
        selectable: false, evented: false, fontFamily: 'monospace',
      }));
    }

    /* tracks */
    tracks.forEach((track, ti) => {
      const trackY = RULER_H + ti * TRACK_H;

      canvas.add(new fabric.Rect({
        left: 0, top: trackY, width: canvasW, height: TRACK_H,
        fill: ti % 2 === 0 ? '#161616' : '#191919',
        selectable: false, evented: false,
      }));
      canvas.add(new fabric.Line([0, trackY + TRACK_H - 1, canvasW, trackY + TRACK_H - 1], {
        stroke: '#2a2a2a', strokeWidth: 1, selectable: false, evented: false,
      }));

      /* clips */
      track.clips.forEach((clip) => {
        const cx = clip.start * PPS;
        const cw = Math.max(clip.duration * PPS, 16);
        const cy = trackY + CLIP_PAD;
        const ch = TRACK_H - CLIP_PAD * 2;
        const isSelected = clip.id === selectedId;
        const fill = TRACK_FILL[track.type] ?? '#444';

        /* body */
        const body = new fabric.Rect({
          left: cx, top: cy,
          width: Math.max(cw - HANDLE_W, 4), height: ch,
          fill, rx: 4, ry: 4,
          stroke: isSelected ? '#6c63ff' : 'rgba(255,255,255,0.08)',
          strokeWidth: isSelected ? 2 : 1,
          lockMovementY: true, hasControls: false, hasBorders: false,
          hoverCursor: 'grab', moveCursor: 'grabbing',
        });
        (body as any)._meta = { clipId: clip.id, trackId: track.id, type: 'body', origStart: clip.start };

        /* label */
        const label = new fabric.IText(clip.text ?? (clip.type === 'video' ? '▶ Video' : clip.type), {
          left: cx + 8, top: cy + ch / 2 - 7,
          fontSize: 11, fill: 'rgba(255,255,255,0.85)', fontFamily: 'Inter, sans-serif',
          fontWeight: '600', selectable: false, evented: false,
        });

        /* trim handle Right */
        const handleR = new fabric.Rect({
          left: cx + cw - HANDLE_W, top: cy + 4,
          width: HANDLE_W, height: ch - 8,
          fill: 'rgba(255,255,255,0.18)', rx: 3, ry: 3,
          stroke: 'rgba(255,255,255,0.3)', strokeWidth: 1,
          lockMovementY: true, hasControls: false, hasBorders: false,
          hoverCursor: 'ew-resize', moveCursor: 'ew-resize',
        });
        (handleR as any)._meta = { clipId: clip.id, trackId: track.id, type: 'trimR' };

        /* trim handle Left */
        const handleL = new fabric.Rect({
          left: cx, top: cy + 4,
          width: HANDLE_W, height: ch - 8,
          fill: 'rgba(255,255,255,0.18)', rx: 3, ry: 3,
          stroke: 'rgba(255,255,255,0.3)', strokeWidth: 1,
          lockMovementY: true, hasControls: false, hasBorders: false,
          hoverCursor: 'ew-resize', moveCursor: 'ew-resize',
        });
        (handleL as any)._meta = { clipId: clip.id, trackId: track.id, type: 'trimL' };

        canvas.add(body, label, handleL, handleR);

        /* thumbnail strip for visual clips */
        if ((track.type === 'video' || clip.type === 'image') && clip.thumbnailUrl) {
          const thumbSrc = clip.thumbnailUrl.startsWith('http')
            ? clip.thumbnailUrl
            : `http://localhost:3001${clip.thumbnailUrl}`;
          fabric.Image.fromURL(thumbSrc, (img) => {
            const fc = fabricRef.current;
            if (!fc) return;
            const scale = ch / (img.height || ch);
            img.set({
              left: cx + 2, top: cy + 2,
              scaleX: scale, scaleY: scale,
              selectable: false, evented: false, opacity: 0.35,
            });
            // Clip image to body bounds
            img.clipPath = new fabric.Rect({
              left: cx, top: cy,
              width: Math.max(cw - HANDLE_W, 4), height: ch,
              absolutePositioned: true,
            });
            fc.add(img);
            fc.renderAll();
          }, { crossOrigin: 'anonymous' });
        }

        /* ── drag body ── */
        body.on('mousedown', () => {
          setSelectedClip(clip);
        });
        body.on('moving', () => {
          const curLeft = body.left ?? cx;
          const newStart = Math.max(0, curLeft / PPS);
          updateClip(track.id, clip.id, { start: newStart });
          label.set({ left: curLeft + 8 });
          handleL.set({ left: curLeft });
          handleR.set({ left: curLeft + (body.width ?? 0) });
          canvas.renderAll();
        });

        /* ── trim handle Right ── */
        handleR.on('mousedown', (e) => {
          e.e?.stopPropagation();
        });
        handleR.on('moving', () => {
          const handleLeft = handleR.left ?? (cx + cw - HANDLE_W);
          const newDur = Math.max(0.5, (handleLeft - cx + HANDLE_W) / PPS);
          body.set({ width: Math.max(newDur * PPS - HANDLE_W, 4) });
          updateClip(track.id, clip.id, { duration: newDur });
          canvas.renderAll();
        });

        /* ── trim handle Left ── */
        handleL.on('mousedown', (e) => {
          e.e?.stopPropagation();
        });
        handleL.on('moving', () => {
          const handleLeft = handleL.left ?? cx;
          const rightEdgeTime = clip.start + clip.duration;
          
          const newStart = Math.min(rightEdgeTime - 0.5, handleLeft / PPS);
          const newDur = rightEdgeTime - newStart;
          
          const diff = newStart - clip.start;
          const newMediaOffset = Math.max(0, (clip.mediaOffset ?? 0) + diff);
          
          body.set({ 
            left: newStart * PPS,
            width: Math.max(newDur * PPS - HANDLE_W, 4) 
          });
          label.set({ left: newStart * PPS + 8 });
          
          updateClip(track.id, clip.id, { 
             start: newStart, 
             duration: newDur, 
             mediaOffset: newMediaOffset 
          });
          canvas.renderAll();
        });
      });
    });

    /* playhead */
    const ph = currentProject.timeline.playheadPosition * PPS;
    canvas.add(new fabric.Line([ph, 0, ph, canvasH], {
      stroke: '#ef4444', strokeWidth: 2, selectable: false, evented: false,
    }));
    canvas.add(new fabric.Triangle({
      left: ph - 6, top: 0, width: 12, height: 12,
      fill: '#ef4444', selectable: false, evented: false,
    }));

    canvas.renderAll();
  }, [currentProject, canvasW, canvasH, duration, tracks, setSelectedClip, updateClip]);

  /* ── Init Fabric canvas ──────────────────────────────────── */
  useEffect(() => {
    if (!canvasElRef.current) return;
    const fc = new fabric.Canvas(canvasElRef.current, {
      selection: false,
      backgroundColor: '#111',
      renderOnAddRemove: false,
    });
    fabricRef.current = fc;

    /* click on ruler → seek */
    fc.on('mouse:down', (e) => {
      if (!e.target && e.pointer) {
        const x = e.pointer.x;
        const y = e.pointer.y;
        if (y <= RULER_H) {
          setPlayheadPosition(Math.max(0, x / (PPS_BASE * stateRef.current.zoom)));
        }
      }
    });

    return () => { fc.dispose(); fabricRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Re-render whenever state changes ───────────────────── */
  useEffect(() => { buildCanvas(); }, [buildCanvas, playhead, zoom, selectedClip?.id]);

  /* ── Resize canvas to container ─────────────────────────── */
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc || !containerRef.current) return;
    fc.setWidth(canvasW);
    fc.setHeight(canvasH);
    buildCanvas();
  }, [canvasW, canvasH, buildCanvas]);

  /* ── Timecode display ────────────────────────────────────── */
  const mm = Math.floor(playhead / 60).toString().padStart(2, '0');
  const ss = Math.floor(playhead % 60).toString().padStart(2, '0');
  const ff = Math.floor((playhead % 1) * 30).toString().padStart(2, '0');

  return (
    <div className="flex flex-col h-full bg-panel select-none">
      {/* ── Controls bar ─────────────────────────────────────── */}
      <div className="h-11 border-b border-neutral-800 flex items-center px-3 gap-3 shrink-0">
        <div className="flex items-center gap-1">
          {/* Stop */}
          <button
            onClick={() => { setIsPlaying(false); setPlayheadPosition(0); }}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="Stop"
          >
            <Square size={16} />
          </button>
          {/* Play / Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 flex items-center justify-center rounded bg-white text-black hover:bg-neutral-200 transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying
              ? <Pause size={16} className="fill-black" />
              : <Play  size={16} className="fill-black ml-0.5" />}
          </button>
        </div>

        {/* Timecode */}
        <span className="font-mono text-sm text-neutral-300 bg-neutral-900 px-3 py-1 rounded border border-neutral-800 tabular-nums">
          {mm}:{ss}:{ff}
        </span>

        <div className="flex-1" />

        {/* Zoom */}
        <ZoomOut size={14} className="text-neutral-500" />
        <input
          type="range" min={0.2} max={5} step={0.1} value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          className="w-28 accent-accent h-1.5 bg-neutral-800 rounded cursor-pointer appearance-none"
        />
        <ZoomIn size={14} className="text-neutral-500" />
      </div>

      {/* ── Timeline body ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track headers (fixed HTML) */}
        <div className="shrink-0 z-10 bg-panel border-r border-neutral-800 shadow-[2px_0_8px_rgba(0,0,0,0.5)]"
          style={{ width: HEADER_W }}>
          <div className="bg-neutral-900 border-b border-neutral-800" style={{ height: RULER_H }} />
          {tracks.map((track) => (
            <div
              key={track.id}
              className="border-b border-neutral-800 flex items-center gap-2 px-3"
              style={{ height: TRACK_H }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: TRACK_FILL[track.type] ?? '#555' }}
              />
              <span className="text-xs font-medium text-neutral-400 truncate">{track.name}</span>
            </div>
          ))}
        </div>

        {/* Fabric.js canvas area */}
        <div ref={containerRef} className="flex-1 overflow-auto custom-scrollbar">
          <canvas ref={canvasElRef} />
        </div>
      </div>
    </div>
  );
}
