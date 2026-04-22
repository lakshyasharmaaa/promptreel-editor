import { useRef } from 'react';
import { useStore, AspectRatio } from '../../store/useStore';
import { Monitor, Smartphone, Square, Layout, Volume2, VolumeX } from 'lucide-react';
import VideoPlayer from './VideoPlayer';

const RATIO_LIST: { value: AspectRatio; label: string; icon: React.ReactNode }[] = [
  { value: '16:9', label: '16:9', icon: <Monitor size={13} /> },
  { value: '9:16', label: '9:16', icon: <Smartphone size={13} /> },
  { value: '1:1',  label: '1:1',  icon: <Square size={13} /> },
  { value: '4:5',  label: '4:5',  icon: <Layout size={13} /> },
];

const RATIO_STYLE: Record<AspectRatio, React.CSSProperties> = {
  '16:9': { aspectRatio: '16/9', width: '100%', maxWidth: 840 },
  '9:16': { aspectRatio: '9/16', height: '100%', maxHeight: '90%', width: 'auto' },
  '1:1':  { aspectRatio: '1/1',  width: '60%',  maxWidth: 540 },
  '4:5':  { aspectRatio: '4/5',  width: '52%',  maxWidth: 480 },
};

function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `http://localhost:3001${url}`;
}

/** Build a CSS filter string from clip color properties */
function buildFilter(p: Record<string, any>): string {
  const parts: string[] = [];
  if (p.brightness != null && p.brightness !== 0) parts.push(`brightness(${1 + p.brightness / 100})`);
  if (p.contrast   != null && p.contrast   !== 0) parts.push(`contrast(${1 + p.contrast / 100})`);
  if (p.saturation != null && p.saturation !== 0) parts.push(`saturate(${1 + p.saturation / 100})`);
  if (p.hue        != null && p.hue        !== 0) parts.push(`hue-rotate(${p.hue}deg)`);
  if (p.sharpness  != null && p.sharpness  !== 0) {
    // approximate sharpness with contrast + a tiny blur invert trick
    parts.push(`contrast(${1 + p.sharpness / 200})`);
  }

  // Named filters
  const filterMap: Record<string, string> = {
    vivid:    'contrast(1.2) saturate(1.4)',
    warm:     'sepia(0.3) saturate(1.1)',
    cool:     'hue-rotate(200deg) saturate(0.9)',
    vintage:  'sepia(0.5) contrast(0.9) brightness(1.05)',
    dramatic: 'contrast(1.4) saturate(0.8)',
    noir:     'grayscale(1) contrast(1.2)',
    fade:     'opacity(0.85) saturate(0.7) brightness(1.1)',
  };
  if (p.filter && filterMap[p.filter]) parts.push(filterMap[p.filter]);

  return parts.join(' ') || 'none';
}

export default function Canvas() {
  const { currentProject, isPlaying, aspectRatio, setAspectRatio, volume, isMuted, setIsMuted } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const playhead = currentProject?.timeline.playheadPosition ?? 0;

  const activeVisualClip = currentProject?.timeline.tracks
    .filter(t => t.type === 'video' && t.visible !== false)
    .flatMap(t => t.clips)
    .find(c => playhead >= c.start && playhead < c.start + c.duration);

  // All text clips at this moment
  const textClips = currentProject?.timeline.tracks
    .filter(t => t.type === 'text' && t.visible !== false)
    .flatMap(t => t.clips)
    .filter(c => playhead >= c.start && playhead < c.start + c.duration) ?? [];

  const clipOffset = activeVisualClip ? playhead - activeVisualClip.start + (activeVisualClip.mediaOffset ?? 0) : 0;
  const clipProps  = activeVisualClip?.properties ?? {};

  const cssFilter  = buildFilter(clipProps);
  const vignetteOp = (clipProps.vignette ?? 0) / 100;

  // Text animation CSS
  const textAnimClass: Record<string, string> = {
    'fade-in':   'animate-fadeIn',
    'slide-up':  'animate-slideUp',
    'zoom-in':   'animate-zoomIn',
    'typewriter':'animate-typewriter',
    'bounce':    'animate-bounce',
  };

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center select-none">
      {/* Aspect ratio switcher */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex bg-neutral-900/90 border border-neutral-700 rounded-lg overflow-hidden backdrop-blur-sm">
        {RATIO_LIST.map(r => (
          <button
            key={r.value}
            onClick={() => setAspectRatio(r.value)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold transition-colors
              ${aspectRatio === r.value ? 'bg-accent text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            {r.icon} {r.label}
          </button>
        ))}
      </div>

      {/* Mute toggle */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-3 right-3 z-20 btn-icon bg-neutral-900/80 border border-neutral-700 backdrop-blur-sm"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
      </button>

      {/* Video canvas frame */}
      <div
        className="relative bg-black shadow-2xl ring-1 ring-neutral-800 overflow-hidden transition-all duration-300"
        style={{ ...RATIO_STYLE[aspectRatio], maxHeight: '85%' }}
      >
        {/* Video layer */}
        <div
          className="absolute inset-0 transition-all"
          style={{
            filter: cssFilter,
            opacity: clipProps.opacity ?? 1,
            transform: [
              `scale(${clipProps.scale ?? 1})`,
              `rotate(${clipProps.rotation ?? 0}deg)`,
              `translate(${clipProps.x ?? 0}%, ${clipProps.y ?? 0}%)`,
              clipProps.flipH ? 'scaleX(-1)' : '',
              clipProps.flipV ? 'scaleY(-1)' : '',
            ].filter(Boolean).join(' '),
          }}
        >
          {activeVisualClip?.mediaUrl ? (
            activeVisualClip.type === 'image' ? (
              <img
                src={resolveMediaUrl(activeVisualClip.mediaUrl)}
                alt=""
                className="w-full h-full object-contain bg-black"
                draggable={false}
              />
            ) : (
              <VideoPlayer
                src={resolveMediaUrl(activeVisualClip.mediaUrl)}
                clipOffset={clipOffset}
                isPlaying={isPlaying}
                volume={isMuted ? 0 : (volume * (clipProps.volume ?? 1))}
              />
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-700 gap-3">
              <Monitor size={48} strokeWidth={1} />
              <span className="text-sm">Add media to the timeline</span>
              <span className="text-xs text-neutral-800">Upload media from the left sidebar</span>
            </div>
          )}
        </div>

        {/* Vignette overlay */}
        {vignetteOp > 0 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteOp}) 100%)`,
            }}
          />
        )}

        {/* Text overlays */}
        {textClips.map(clip => {
          const tp = clip.properties;
          const animClass = textAnimClass[tp.textAnimation ?? ''] ?? '';
          return (
            <div
              key={clip.id}
              className={`absolute inset-0 flex items-center justify-center pointer-events-none ${animClass}`}
              style={{ opacity: tp.opacity ?? 1 }}
            >
              <span
                style={{
                  fontSize: tp.fontSize ?? 40,
                  fontFamily: tp.fontFamily ?? 'Inter',
                  fontWeight: tp.fontWeight ?? 'bold',
                  color: tp.textColor ?? '#ffffff',
                  textAlign: tp.textAlign ?? 'center',
                  textShadow: '0 2px 12px rgba(0,0,0,0.8)',
                  background: tp.textBg ?? 'transparent',
                  padding: tp.textBg ? '4px 12px' : 0,
                  borderRadius: tp.textBg ? 6 : 0,
                  WebkitTextStroke: tp.textStroke ? `${tp.textStrokeWidth ?? 1}px ${tp.textStroke}` : undefined,
                  transform: `rotate(${tp.rotation ?? 0}deg)`,
                  maxWidth: '90%',
                  wordBreak: 'break-word',
                }}
              >
                {clip.text ?? 'Text'}
              </span>
            </div>
          );
        })}

        {/* Safe-zone guide (optional — shown when no media) */}
        {!activeVisualClip && (
          <div className="absolute inset-[5%] border border-dashed border-neutral-800 pointer-events-none rounded" />
        )}
      </div>
    </div>
  );
}
