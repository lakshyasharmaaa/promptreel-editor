import { useRef, useState } from 'react';
import {
  Upload, Film, Wand2, LayoutTemplate, Type, Images,
  AlignCenter, Sparkles,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { MediaFile } from '@shared/types';

const TABS = [
  { id: 'media',     icon: Film,          label: 'Media' },
  { id: 'stock',     icon: Images,        label: 'Stock' },
  { id: 'text',      icon: Type,          label: 'Text' },
  { id: 'ai',        icon: Wand2,         label: 'AI Gen' },
  { id: 'templates', icon: LayoutTemplate, label: 'Templates' },
];

const TEXT_PRESETS = [
  { label: 'Title',    size: 64, weight: 'bold' },
  { label: 'Subtitle', size: 40, weight: 'bold' },
  { label: 'Caption',  size: 24, weight: 'normal' },
  { label: 'Lower 3rd', size: 28, weight: 'normal' },
];

const TEMPLATES = [
  { label: 'YouTube Intro', color: '#ff0000' },
  { label: 'TikTok Hook',   color: '#010101' },
  { label: 'Cinematic',     color: '#1a0a00' },
  { label: 'Minimal White', color: '#f5f5f5' },
];

function svgDataUrl(title: string, colors: [string, string], accent: string): string {
  const safeTitle = title.replace(/[&<>"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><circle cx="1040" cy="160" r="110" fill="${accent}" opacity=".55"/><rect x="96" y="460" width="560" height="18" rx="9" fill="white" opacity=".28"/><rect x="96" y="500" width="420" height="18" rx="9" fill="white" opacity=".18"/><text x="96" y="410" font-family="Inter,Arial,sans-serif" font-size="64" font-weight="800" fill="white">${safeTitle}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const STOCK_MEDIA: MediaFile[] = [
  {
    id: 'stock_city_motion',
    name: 'City Motion',
    type: 'image',
    url: svgDataUrl('City Motion', ['#111827', '#2563eb'], '#6c63ff'),
    thumbnailUrl: svgDataUrl('City Motion', ['#111827', '#2563eb'], '#6c63ff'),
    duration: 5,
  },
  {
    id: 'stock_product_stage',
    name: 'Product Stage',
    type: 'image',
    url: svgDataUrl('Product Stage', ['#18181b', '#0f766e'], '#22d3ee'),
    thumbnailUrl: svgDataUrl('Product Stage', ['#18181b', '#0f766e'], '#22d3ee'),
    duration: 5,
  },
  {
    id: 'stock_social_hook',
    name: 'Social Hook',
    type: 'image',
    url: svgDataUrl('Social Hook', ['#09090b', '#be123c'], '#f97316'),
    thumbnailUrl: svgDataUrl('Social Hook', ['#09090b', '#be123c'], '#f97316'),
    duration: 5,
  },
  {
    id: 'stock_clean_brand',
    name: 'Clean Brand',
    type: 'image',
    url: svgDataUrl('Clean Brand', ['#27272a', '#7c3aed'], '#a78bfa'),
    thumbnailUrl: svgDataUrl('Clean Brand', ['#27272a', '#7c3aed'], '#a78bfa'),
    duration: 5,
  },
];

function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `http://localhost:3001${url}`;
}

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState('media');
  const [textInput, setTextInput] = useState('Enter text here…');
  const [aiPrompt, setAiPrompt] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mediaLibrary, addMedia, currentProject, addClip, setPlayheadPosition } = useStore();

  /* ── Upload ─────────────────────────────────────────────── */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      // 1. Upload to backend — for FFmpeg thumbnail + duration extraction
      const formData = new FormData();
      formData.append('file', file);
      const res  = await fetch('http://localhost:3001/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      const newMedia: MediaFile = {
        id:           data.id,
        name:         file.name,
        type:         file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image',
        url:          data.url,
        thumbnailUrl: data.thumbnailUrl,
        duration:     data.duration ?? 5,
      };
      addMedia(newMedia);
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addMediaToTimeline = (media: MediaFile) => {
    if (!currentProject) return;
    const trackId = media.type === 'audio' ? 'a1' : 'v1';
    const start   = currentProject.timeline.playheadPosition;
    addClip(trackId, {
      id:           `clip_${Date.now()}`,
      type:         media.type === 'audio' ? 'audio' : media.type === 'image' ? 'image' : 'video',
      trackId,
      start,
      duration:     media.duration ?? 5,
      mediaUrl:     media.url,
      thumbnailUrl: media.thumbnailUrl,
      properties:   { scale: 1, opacity: 1 },
    });
    setPlayheadPosition(start + (media.duration ?? 5));
  };

  /* ── Add text clip ──────────────────────────────────────── */
  const addTextClip = (preset?: { label: string; size: number; weight: string }) => {
    if (!currentProject) return;
    const start = currentProject.timeline.playheadPosition;
    addClip('t1', {
      id:         `clip_${Date.now()}`,
      type:       'text',
      trackId:    't1',
      start,
      duration:   5,
      text:       preset ? preset.label : textInput,
      properties: { fontSize: preset?.size ?? 40, fontWeight: preset?.weight ?? 'bold', opacity: 1 },
    });
    setPlayheadPosition(start + 5);
  };

  /* ─────────────────────────────────────────────────────────── */
  return (
    <div className="w-72 flex flex-col bg-panel border-r border-neutral-800 z-10 shrink-0">
      {/* Tab bar */}
      <div className="flex border-b border-neutral-800 px-1 pt-1 gap-0.5 overflow-x-auto no-scrollbar shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center py-2 px-2 rounded-t w-14 gap-1 transition-all text-[10px] font-semibold uppercase tracking-wider
              ${activeTab === tab.id
                ? 'bg-neutral-800 text-white border-b-2 border-accent'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'}`}
          >
            <tab.icon size={16} className={activeTab === tab.id ? 'text-accent' : ''} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-3">

        {/* ── MEDIA ─────────────────────────────────────────── */}
        {activeTab === 'media' && (
          <>
            <input
              ref={fileInputRef} type="file" className="hidden"
              accept="video/mp4,video/webm,video/quicktime,video/mov,image/jpeg,image/png,image/gif"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-6 border-2 border-dashed border-neutral-700 rounded-lg flex flex-col items-center justify-center text-neutral-400 hover:text-white hover:border-accent hover:bg-accent/5 transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mb-1.5" />
                  <span className="text-sm font-medium">Uploading…</span>
                </>
              ) : (
                <>
                  <Upload size={22} className="mb-1.5 group-hover:-translate-y-1 transition-transform" />
                  <span className="text-sm font-medium">Upload Media</span>
                  <span className="text-[11px] text-neutral-600 mt-0.5">MP4 · MOV · WebM · GIF · JPG · PNG</span>
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2">
              {mediaLibrary.map(m => (
                <div
                  key={m.id}
                  onDoubleClick={() => addMediaToTimeline(m)}
                  className="aspect-video bg-neutral-800 rounded overflow-hidden relative group cursor-pointer border border-transparent hover:border-accent transition-colors"
                >
                  <img src={resolveMediaUrl(m.thumbnailUrl || m.url)} alt={m.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-[10px] bg-black/80 px-2 py-1 rounded">Double-click to add</span>
                  </div>
                  {m.duration && (
                    <span className="absolute bottom-1 right-1 text-[9px] bg-black/80 px-1 rounded">
                      {Math.floor(m.duration / 60)}:{(m.duration % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {mediaLibrary.length === 0 && (
              <p className="text-center text-neutral-600 text-xs mt-6">No media yet</p>
            )}
          </>
        )}

        {/* ── STOCK FOOTAGE ─────────────────────────────────── */}
        {activeTab === 'stock' && (
          <div className="space-y-3">
            <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Stock Footage</p>
            <div className="grid grid-cols-2 gap-2">
              {STOCK_MEDIA.map(m => (
                <div
                  key={m.id}
                  onDoubleClick={() => addMediaToTimeline(m)}
                  className="aspect-video bg-neutral-800 rounded overflow-hidden relative group cursor-pointer border border-transparent hover:border-accent transition-colors"
                >
                  <img src={m.thumbnailUrl} alt={m.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-[10px] bg-black/80 px-2 py-1 rounded">Double-click to add</span>
                  </div>
                  <span className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/70 px-1.5 py-0.5 rounded truncate">
                    {m.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TEXT ──────────────────────────────────────────── */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Add Text Clip</p>
            <textarea
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              rows={3}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-sm text-white resize-none focus:outline-none focus:border-accent transition-colors"
              placeholder="Type your text…"
            />
            <button
              onClick={() => addTextClip()}
              className="w-full py-2 bg-accent hover:bg-accent/90 text-white text-sm rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <AlignCenter size={15} /> Add to Timeline
            </button>

            <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider pt-2">Presets</p>
            <div className="space-y-2">
              {TEXT_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => addTextClip(p)}
                  className="w-full px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-left flex items-center gap-3 transition-colors"
                >
                  <span style={{ fontSize: Math.min(p.size / 2.5, 22), fontWeight: p.weight }} className="text-white shrink-0">T</span>
                  <div>
                    <p className="text-sm text-white font-medium">{p.label}</p>
                    <p className="text-[10px] text-neutral-500">{p.size}px · {p.weight}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── AI GENERATE ───────────────────────────────────── */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-accent/20 to-purple-900/20 border border-accent/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={18} className="text-accent" />
                <span className="text-sm font-semibold text-white">AI Video Generator</span>
              </div>
              <p className="text-[11px] text-neutral-400 mb-3">Describe a scene and AI will generate a video clip for you.</p>
              <textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                rows={3}
                className="w-full bg-neutral-900/80 border border-neutral-700 rounded-lg p-2.5 text-sm text-white resize-none focus:outline-none focus:border-accent mb-3"
                placeholder="A cinematic sunset over mountains…"
              />
              <button
                onClick={() => {
                  const title = aiPrompt.trim() || 'AI Scene';
                  addMediaToTimeline({
                    id: `ai_${Date.now()}`,
                    name: title,
                    type: 'image',
                    url: svgDataUrl(title.slice(0, 28), ['#111827', '#7c3aed'], '#6c63ff'),
                    thumbnailUrl: svgDataUrl(title.slice(0, 28), ['#111827', '#7c3aed'], '#6c63ff'),
                    duration: 5,
                  });
                  setAiPrompt('');
                }}
                className="w-full py-2 bg-accent hover:bg-accent/90 text-white text-sm rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles size={15} /> Generate Clip
              </button>
            </div>
          </div>
        )}

        {/* ── TEMPLATES ─────────────────────────────────────── */}
        {activeTab === 'templates' && (
          <div className="space-y-3">
            <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Project Templates</p>
            {TEMPLATES.map(t => (
              <button
                key={t.label}
                className="w-full rounded-xl overflow-hidden border border-neutral-700 hover:border-accent transition-colors group"
              >
                <div className="h-20 w-full" style={{ background: t.color }} />
                <div className="px-3 py-2 bg-neutral-800 group-hover:bg-neutral-700 transition-colors text-left">
                  <p className="text-sm text-white font-medium">{t.label}</p>
                  <p className="text-[10px] text-neutral-500">Click to apply template</p>
                </div>
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
