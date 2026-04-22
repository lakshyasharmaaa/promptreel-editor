import { useState } from 'react';
import {
  Settings2, Scissors, Type, Palette,
  Zap, Volume2, FlipHorizontal, FlipVertical,
  RotateCcw, Maximize2, Trash2
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ClipProperties } from '@shared/types';

type PanelTab = 'basic' | 'color' | 'text' | 'speed' | 'audio';

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step = 0.01, unit = '', onChange }: SliderRowProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1.5">
      <div className="prop-row">
        <span className="text-xs text-neutral-400">{label}</span>
        <span className="prop-val">{typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(2)) : 0}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        style={{ '--val': `${pct}%` } as React.CSSProperties}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-track"
      />
    </div>
  );
}

export default function PropertiesPanel() {
  const { selectedClip, updateClip, removeClip, duplicateClip, splitClip, currentProject } = useStore();
  const [tab, setTab] = useState<PanelTab>('basic');

  const playhead = currentProject?.timeline.playheadPosition ?? 0;

  if (!selectedClip) {
    return (
      <div className="w-64 bg-panel border-l border-neutral-800 flex flex-col z-10 shrink-0">
        <div className="p-3 border-b border-neutral-800 flex items-center gap-2 text-neutral-500">
          <Settings2 size={15} />
          <span className="text-sm font-medium">Properties</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-neutral-700 gap-3 p-6">
          <Settings2 size={32} strokeWidth={1} />
          <p className="text-xs text-center">Select a clip on the timeline to edit its properties</p>
        </div>
      </div>
    );
  }

  const p = selectedClip.properties;
  const upd = (updates: Partial<ClipProperties>) =>
    updateClip(selectedClip.trackId, selectedClip.id, { properties: { ...p, ...updates } });

  const TABS: { id: PanelTab; icon: React.ReactNode; label: string; show: boolean }[] = [
    { id: 'basic',  icon: <Maximize2 size={14}/>,   label: 'Transform', show: true },
    { id: 'color',  icon: <Palette size={14}/>,     label: 'Color',     show: selectedClip.type !== 'audio' },
    { id: 'text',   icon: <Type size={14}/>,        label: 'Text',      show: selectedClip.type === 'text' },
    { id: 'speed',  icon: <Zap size={14}/>,         label: 'Speed',     show: selectedClip.type === 'video' },
    { id: 'audio',  icon: <Volume2 size={14}/>,     label: 'Audio',     show: selectedClip.type === 'video' || selectedClip.type === 'audio' },
  ];

  return (
    <div className="w-64 bg-panel border-l border-neutral-800 flex flex-col z-10 shrink-0">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 size={15} className="text-accent" />
          <span className="text-sm font-semibold text-white capitalize">{selectedClip.type} Clip</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => duplicateClip(selectedClip.trackId, selectedClip.id)} className="btn-icon" title="Duplicate">
            <Scissors size={13} />
          </button>
          <button onClick={() => removeClip(selectedClip.trackId, selectedClip.id)} className="btn-icon text-red-400 hover:text-red-300 hover:bg-red-950" title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Clip info */}
      <div className="px-3 py-2 border-b border-neutral-800 grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-neutral-900 rounded px-2 py-1.5">
          <span className="text-neutral-500 block">Start</span>
          <span className="text-neutral-200 font-mono">
            {Math.floor(selectedClip.start / 60).toString().padStart(2,'0')}:{(selectedClip.start % 60).toFixed(1).padStart(4,'0')}
          </span>
        </div>
        <div className="bg-neutral-900 rounded px-2 py-1.5">
          <span className="text-neutral-500 block">Duration</span>
          <span className="text-neutral-200 font-mono">{selectedClip.duration.toFixed(1)}s</span>
        </div>
      </div>

      {/* Split at playhead */}
      <div className="px-3 py-2 border-b border-neutral-800">
        <button
          onClick={() => splitClip(selectedClip.trackId, selectedClip.id, playhead)}
          className="w-full btn-ghost border border-neutral-700 text-xs py-1.5"
        >
          <Scissors size={13} /> Split at Playhead
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800 overflow-x-auto no-scrollbar">
        {TABS.filter(t => t.show).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-2 text-[9px] font-semibold uppercase tracking-wider transition-colors shrink-0
              ${tab === t.id ? 'text-accent border-b-2 border-accent' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">

        {/* ── TRANSFORM ─────────────────────────── */}
        {tab === 'basic' && (
          <>
            <SliderRow label="Opacity" value={p.opacity ?? 1} min={0} max={1} unit="%" onChange={v => upd({ opacity: v })} />
            <SliderRow label="Scale"   value={p.scale ?? 1}   min={0.1} max={3} onChange={v => upd({ scale: v })} />
            <SliderRow label="Rotation" value={p.rotation ?? 0} min={-180} max={180} step={1} unit="°" onChange={v => upd({ rotation: v })} />
            <SliderRow label="X Position" value={p.x ?? 0} min={-100} max={100} step={1} unit="%" onChange={v => upd({ x: v })} />
            <SliderRow label="Y Position" value={p.y ?? 0} min={-100} max={100} step={1} unit="%" onChange={v => upd({ y: v })} />
            <div className="flex gap-2">
              <button onClick={() => upd({ flipH: !(p.flipH) })}
                className={`flex-1 btn-ghost border text-xs py-1.5 ${p.flipH ? 'border-accent text-accent' : 'border-neutral-700'}`}>
                <FlipHorizontal size={13}/> Flip H
              </button>
              <button onClick={() => upd({ flipV: !(p.flipV) })}
                className={`flex-1 btn-ghost border text-xs py-1.5 ${p.flipV ? 'border-accent text-accent' : 'border-neutral-700'}`}>
                <FlipVertical size={13}/> Flip V
              </button>
            </div>
            <button onClick={() => upd({ opacity:1,scale:1,rotation:0,x:0,y:0,flipH:false,flipV:false })}
              className="w-full btn-ghost border border-neutral-700 text-xs">
              <RotateCcw size={12}/> Reset Transform
            </button>
          </>
        )}

        {/* ── COLOR ─────────────────────────────── */}
        {tab === 'color' && (
          <>
            <SliderRow label="Brightness" value={p.brightness ?? 0} min={-100} max={100} step={1} onChange={v => upd({ brightness: v })} />
            <SliderRow label="Contrast"   value={p.contrast ?? 0}   min={-100} max={100} step={1} onChange={v => upd({ contrast: v })} />
            <SliderRow label="Saturation" value={p.saturation ?? 0} min={-100} max={100} step={1} onChange={v => upd({ saturation: v })} />
            <SliderRow label="Hue"        value={p.hue ?? 0}        min={-180} max={180} step={1} unit="°" onChange={v => upd({ hue: v })} />
            <SliderRow label="Sharpness"  value={p.sharpness ?? 0}  min={0}    max={100} step={1} onChange={v => upd({ sharpness: v })} />
            <SliderRow label="Vignette"   value={p.vignette ?? 0}   min={0}    max={100} step={1} onChange={v => upd({ vignette: v })} />
            <SliderRow label="Temperature" value={p.temperature ?? 0} min={-100} max={100} step={1} onChange={v => upd({ temperature: v })} />
            <button onClick={() => upd({ brightness:0,contrast:0,saturation:0,hue:0,sharpness:0,vignette:0,temperature:0 })}
              className="w-full btn-ghost border border-neutral-700 text-xs">
              <RotateCcw size={12}/> Reset Color
            </button>

            {/* Filters */}
            <div>
              <p className="prop-label mb-2">Filters</p>
              <div className="grid grid-cols-3 gap-1.5">
                {['none','vivid','warm','cool','vintage','dramatic','noir','fade'].map(f => (
                  <button key={f} onClick={() => upd({ filter: f === 'none' ? '' : f })}
                    className={`py-1.5 rounded-lg text-[10px] font-medium capitalize border transition-colors
                      ${(p.filter ?? '') === (f === 'none' ? '' : f) ? 'border-accent text-accent bg-accent/10' : 'border-neutral-700 text-neutral-500 hover:text-neutral-300'}`}
                  >{f}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── TEXT ──────────────────────────────── */}
        {tab === 'text' && (
          <>
            <div>
              <p className="prop-label mb-1.5">Content</p>
              <textarea
                value={selectedClip.text ?? ''}
                onChange={e => updateClip(selectedClip.trackId, selectedClip.id, { text: e.target.value })}
                rows={3}
                className="input-sm resize-none"
              />
            </div>
            <SliderRow label="Font Size" value={p.fontSize ?? 40} min={8} max={200} step={1} unit="px" onChange={v => upd({ fontSize: v })} />
            <div>
              <p className="prop-label mb-1.5">Font Family</p>
              <select value={p.fontFamily ?? 'Inter'} onChange={e => upd({ fontFamily: e.target.value })}
                className="input-sm">
                {['Inter','Roboto','Montserrat','Playfair Display','Oswald','Bebas Neue','Pacifico','Dancing Script'].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              {(['normal','bold'] as const).map(w => (
                <button key={w} onClick={() => upd({ fontWeight: w })}
                  className={`flex-1 btn-ghost border text-xs py-1.5 ${p.fontWeight === w ? 'border-accent text-accent' : 'border-neutral-700'}`}>
                  {w === 'bold' ? <strong>B</strong> : 'Normal'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {(['left','center','right'] as const).map(a => (
                <button key={a} onClick={() => upd({ textAlign: a })}
                  className={`flex-1 btn-ghost border text-[10px] py-1.5 ${p.textAlign === a ? 'border-accent text-accent' : 'border-neutral-700'}`}>
                  {a}
                </button>
              ))}
            </div>
            <div>
              <p className="prop-label mb-1.5">Text Color</p>
              <input type="color" value={p.textColor ?? '#ffffff'}
                onChange={e => upd({ textColor: e.target.value })}
                className="w-full h-9 rounded-lg border border-neutral-700 bg-neutral-900 cursor-pointer px-1"
              />
            </div>
            <div>
              <p className="prop-label mb-1.5">Animations</p>
              <div className="grid grid-cols-2 gap-1.5">
                {['none','fade-in','slide-up','zoom-in','typewriter','bounce'].map(a => (
                  <button key={a} onClick={() => upd({ textAnimation: a === 'none' ? '' : a })}
                    className={`py-1.5 rounded-lg text-[10px] font-medium capitalize border transition-colors
                      ${(p.textAnimation ?? '') === (a === 'none' ? '' : a) ? 'border-accent text-accent bg-accent/10' : 'border-neutral-700 text-neutral-500 hover:text-neutral-300'}`}
                  >{a}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── SPEED ─────────────────────────────── */}
        {tab === 'speed' && (
          <>
            <SliderRow label="Speed" value={p.speed ?? 1} min={0.1} max={4} step={0.05} unit="x" onChange={v => upd({ speed: v })} />
            <div className="grid grid-cols-4 gap-1.5">
              {[0.25, 0.5, 1, 2].map(s => (
                <button key={s} onClick={() => upd({ speed: s })}
                  className={`py-1.5 rounded-lg text-xs border transition-colors
                    ${(p.speed ?? 1) === s ? 'border-accent text-accent bg-accent/10' : 'border-neutral-700 text-neutral-500 hover:text-neutral-300'}`}
                >{s}x</button>
              ))}
            </div>
            <div className="bg-neutral-900 rounded-lg p-3 text-xs text-neutral-400 space-y-1">
              <p>Adjusted duration: <span className="text-white">{(selectedClip.duration / (p.speed ?? 1)).toFixed(1)}s</span></p>
              <p className="text-[10px] text-neutral-600">Speed affects playback without changing timeline length</p>
            </div>
          </>
        )}

        {/* ── AUDIO ─────────────────────────────── */}
        {tab === 'audio' && (
          <>
            <SliderRow label="Volume" value={p.volume ?? 1} min={0} max={2} unit="x" onChange={v => upd({ volume: v })} />
            <button
              onClick={() => upd({ muted: !p.muted })}
              className={`w-full btn-ghost border text-sm py-2 ${p.muted ? 'border-red-500 text-red-400' : 'border-neutral-700'}`}
            >
              <Volume2 size={14} /> {p.muted ? 'Unmute' : 'Mute'}
            </button>
            <SliderRow label="Fade In"  value={p.fade ?? 0} min={0} max={5} unit="s" onChange={v => upd({ fade: v })} />
          </>
        )}

      </div>
    </div>
  );
}
