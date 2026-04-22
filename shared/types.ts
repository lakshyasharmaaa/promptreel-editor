// ─── Core types shared between frontend and backend ──────────

export type ClipType = 'video' | 'audio' | 'text' | 'effect' | 'sticker' | 'image';
export type TrackType = 'video' | 'audio' | 'text' | 'effect' | 'sticker';
export type TransitionType = 'fade' | 'dissolve' | 'wipe_left' | 'wipe_right' | 'zoom' | 'slide_left' | 'slide_right';

export interface ClipProperties {
  // transform
  opacity?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  x?: number;
  y?: number;
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
  // color
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
  sharpness?: number;
  vignette?: number;
  temperature?: number;
  tint?: number;
  fade?: number;
  // video
  speed?: number;
  volume?: number;
  muted?: boolean;
  // text
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
  textBg?: string;
  textStroke?: string;
  textStrokeWidth?: number;
  textAnimation?: string;
  // filter / effect
  filter?: string;
  // sticker
  stickerUrl?: string;
  // keyframes
  keyframes?: Keyframe[];
}

export interface Keyframe {
  time: number;      // seconds from clip start
  property: string;
  value: number;
}

export interface Clip {
  id: string;
  type: ClipType;
  trackId: string;
  start: number;        // on timeline (seconds)
  duration: number;     // visible duration
  mediaOffset?: number; // trim-in point within source
  mediaUrl?: string;
  thumbnailUrl?: string;
  text?: string;
  properties: ClipProperties;
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  clips: Clip[];
  locked?: boolean;
  muted?: boolean;
  visible?: boolean;
}

export interface ProjectTimeline {
  tracks: Track[];
  duration: number;
  playheadPosition: number;
}

export interface Project {
  id: string;
  name: string;
  timeline: ProjectTimeline;
  createdAt: string;
  updatedAt?: string;
}

export interface MediaFile {
  id: string;
  url: string;
  thumbnailUrl: string;
  type: 'video' | 'image' | 'audio';
  name: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface ExportOptions {
  resolution: '360p' | '480p' | '720p' | '1080p' | '4k';
  format: 'mp4' | 'webm' | 'gif';
  fps: number;
  bitrate?: number;
}
