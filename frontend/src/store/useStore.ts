import { create } from 'zustand';
import { Project, Clip, MediaFile, Track } from '@shared/types';

// ─── Extended types ──────────────────────────────────────────
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export interface TransitionEntry {
  fromClipId: string;
  toClipId: string;
  type: string;
  duration: number;
}

export interface EditorState {
  currentProject: Project | null;
  selectedClip: Clip | null;
  isPlaying: boolean;
  zoom: number;
  mediaLibrary: MediaFile[];
  aspectRatio: AspectRatio;
  volume: number;
  isMuted: boolean;
  transitions: TransitionEntry[];
  splitAt: number | null;
  history: Project[];        // undo stack
  historyIndex: number;

  // Actions
  setProject: (p: Project) => void;
  setSelectedClip: (c: Clip | null) => void;
  setIsPlaying: (v: boolean) => void;
  setZoom: (v: number) => void;
  addMedia: (m: MediaFile) => void;
  removeMedia: (id: string) => void;
  setPlayheadPosition: (posOrFn: number | ((prev: number) => number)) => void;
  addClip: (trackId: string, clip: Clip) => void;
  updateClip: (trackId: string, clipId: string, updates: Partial<Clip>) => void;
  removeClip: (trackId: string, clipId: string) => void;
  splitClip: (trackId: string, clipId: string, atTime: number) => void;
  duplicateClip: (trackId: string, clipId: string) => void;
  setAspectRatio: (r: AspectRatio) => void;
  setVolume: (v: number) => void;
  setIsMuted: (v: boolean) => void;
  addTransition: (t: TransitionEntry) => void;
  removeTransition: (fromClipId: string) => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  renameProject: (name: string) => void;
}

// ─── Initial state ────────────────────────────────────────────
const DEFAULT_TRACKS: Track[] = [
  { id: 'v1', name: 'Video 1',  type: 'video',  clips: [], locked: false, muted: false, visible: true },
  { id: 'v2', name: 'Video 2',  type: 'video',  clips: [], locked: false, muted: false, visible: true },
  { id: 'a1', name: 'Audio',    type: 'audio',  clips: [], locked: false, muted: false, visible: true },
  { id: 't1', name: 'Text',     type: 'text',   clips: [], locked: false, muted: false, visible: true },
  { id: 'e1', name: 'Effects',  type: 'effect', clips: [], locked: false, muted: false, visible: true },
  { id: 's1', name: 'Stickers', type: 'sticker',clips: [], locked: false, muted: false, visible: true },
];

const makeInitialProject = (): Project => ({
  id: `proj_${Date.now()}`,
  name: 'Untitled Project',
  createdAt: new Date().toISOString(),
  timeline: { duration: 300, playheadPosition: 0, tracks: DEFAULT_TRACKS },
});

// ─── Store ────────────────────────────────────────────────────
export const useStore = create<EditorState>((set, get) => ({
  currentProject: makeInitialProject(),
  selectedClip: null,
  isPlaying: false,
  zoom: 1,
  mediaLibrary: [],
  aspectRatio: '16:9',
  volume: 1,
  isMuted: false,
  transitions: [],
  splitAt: null,
  history: [],
  historyIndex: -1,

  setProject: (p) => set({ currentProject: p }),
  setSelectedClip: (c) => set({ selectedClip: c }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setZoom: (v) => set({ zoom: Math.max(0.1, Math.min(10, v)) }),
  addMedia: (m) => set((s) => ({ mediaLibrary: [...s.mediaLibrary, m] })),
  removeMedia: (id) => set((s) => ({ mediaLibrary: s.mediaLibrary.filter(m => m.id !== id) })),
  setAspectRatio: (r) => set({ aspectRatio: r }),
  setVolume: (v) => set({ volume: v }),
  setIsMuted: (v) => set({ isMuted: v }),
  addTransition: (t) => set((s) => ({ transitions: [...s.transitions.filter(x => x.fromClipId !== t.fromClipId), t] })),
  removeTransition: (id) => set((s) => ({ transitions: s.transitions.filter(t => t.fromClipId !== id) })),

  renameProject: (name) => set((s) => s.currentProject ? { currentProject: { ...s.currentProject, name } } : s),

  setPlayheadPosition: (posOrFn) => set((s) => {
    if (!s.currentProject) return s;
    const prev = s.currentProject.timeline.playheadPosition;
    const next = typeof posOrFn === 'function' ? posOrFn(prev) : posOrFn;
    return {
      currentProject: {
        ...s.currentProject,
        timeline: { ...s.currentProject.timeline, playheadPosition: Math.max(0, next) },
      },
    };
  }),

  addClip: (trackId, clip) => {
    get().pushHistory();
    set((s) => {
      if (!s.currentProject) return s;
      return {
        currentProject: {
          ...s.currentProject,
          timeline: {
            ...s.currentProject.timeline,
            tracks: s.currentProject.timeline.tracks.map(t =>
              t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
            ),
          },
        },
      };
    });
  },

  updateClip: (trackId, clipId, updates) => set((s) => {
    if (!s.currentProject) return s;
    return {
      currentProject: {
        ...s.currentProject,
        timeline: {
          ...s.currentProject.timeline,
          tracks: s.currentProject.timeline.tracks.map(t =>
            t.id === trackId
              ? { ...t, clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c) }
              : t
          ),
        },
      },
      selectedClip: s.selectedClip?.id === clipId ? { ...s.selectedClip, ...updates } : s.selectedClip,
    };
  }),

  removeClip: (trackId, clipId) => {
    get().pushHistory();
    set((s) => {
      if (!s.currentProject) return s;
      return {
        currentProject: {
          ...s.currentProject,
          timeline: {
            ...s.currentProject.timeline,
            tracks: s.currentProject.timeline.tracks.map(t =>
              t.id === trackId ? { ...t, clips: t.clips.filter(c => c.id !== clipId) } : t
            ),
          },
        },
        selectedClip: s.selectedClip?.id === clipId ? null : s.selectedClip,
      };
    });
  },

  splitClip: (trackId, clipId, atTime) => {
    get().pushHistory();
    set((s) => {
      if (!s.currentProject) return s;
      const tracks = s.currentProject.timeline.tracks.map(t => {
        if (t.id !== trackId) return t;
        const newClips = t.clips.flatMap(c => {
          if (c.id !== clipId || atTime <= c.start || atTime >= c.start + c.duration) return [c];
          const leftDur = atTime - c.start;
          const rightDur = c.duration - leftDur;
          const mediaOffset = (c.mediaOffset ?? 0) + leftDur;
          const left: Clip  = { ...c, duration: leftDur, id: `${c.id}_L` };
          const right: Clip = { ...c, duration: rightDur, id: `${c.id}_R`, start: atTime, mediaOffset };
          return [left, right];
        });
        return { ...t, clips: newClips };
      });
      return { currentProject: { ...s.currentProject, timeline: { ...s.currentProject.timeline, tracks } } };
    });
  },

  duplicateClip: (trackId, clipId) => {
    get().pushHistory();
    set((s) => {
      if (!s.currentProject) return s;
      const tracks = s.currentProject.timeline.tracks.map(t => {
        if (t.id !== trackId) return t;
        const idx = t.clips.findIndex(c => c.id === clipId);
        if (idx < 0) return t;
        const orig = t.clips[idx];
        const dup: Clip = { ...orig, id: `${orig.id}_dup_${Date.now()}`, start: orig.start + orig.duration };
        const clips = [...t.clips];
        clips.splice(idx + 1, 0, dup);
        return { ...t, clips };
      });
      return { currentProject: { ...s.currentProject, timeline: { ...s.currentProject.timeline, tracks } } };
    });
  },

  pushHistory: () => set((s) => {
    if (!s.currentProject) return s;
    const newHistory = s.history.slice(0, s.historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(s.currentProject)));
    return { history: newHistory.slice(-30), historyIndex: newHistory.length - 1 };
  }),

  undo: () => set((s) => {
    const idx = s.historyIndex;
    if (idx < 0) return s;
    return { currentProject: JSON.parse(JSON.stringify(s.history[idx])), historyIndex: idx - 1 };
  }),

  redo: () => set((s) => {
    const idx = s.historyIndex + 1;
    if (idx >= s.history.length) return s;
    return { currentProject: JSON.parse(JSON.stringify(s.history[idx])), historyIndex: idx };
  }),
}));
