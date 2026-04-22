import { Router, Request, Response } from 'express';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

const router = Router();

// ── Types ────────────────────────────────────────────────────
interface ClipEntry {
  mediaUrl: string;
  start: number;
  duration: number;
  mediaOffset?: number;
}

type Resolution = '360p' | '480p' | '720p' | '1080p' | '4k';

const RESOLUTION_MAP: Record<Resolution, string> = {
  '360p':  '640x360',
  '480p':  '854x480',
  '720p':  '1280x720',
  '1080p': '1920x1080',
  '4k':    '3840x2160',
};

// ── POST /export ─────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const {
    timeline,
    resolution = '1080p',
    format     = 'mp4',
    fps        = 30,
  } = req.body;

  if (!timeline?.tracks) {
    return res.status(400).json({ error: 'Invalid timeline data' });
  }

  // Collect all video clips sorted by start time
  const clips: ClipEntry[] = [];
  for (const track of timeline.tracks) {
    if (track.type === 'video') {
      for (const clip of track.clips) {
        if (clip.mediaUrl) {
          clips.push({
            mediaUrl:    clip.mediaUrl,
            start:       clip.start,
            duration:    clip.duration,
            mediaOffset: clip.mediaOffset,
          });
        }
      }
    }
  }
  clips.sort((a, b) => a.start - b.start);

  if (clips.length === 0) {
    return res.status(400).json({ error: 'No video clips in timeline to export' });
  }

  const uploadsDir    = path.join(__dirname, '../../uploads');
  const ext           = format === 'webm' ? 'webm' : 'mp4';
  const exportFilename = `export-${Date.now()}.${ext}`;
  const exportPath    = path.join(uploadsDir, exportFilename);

  // Build concat list
  const concatListPath = path.join(uploadsDir, `concat-${Date.now()}.txt`);
  const concatLines: string[] = [];

  for (const clip of clips) {
    const filePath = path.join(uploadsDir, path.basename(clip.mediaUrl));
    if (fs.existsSync(filePath)) {
      const offset = clip.mediaOffset ?? 0;
      concatLines.push(`file '${filePath}'`);
      concatLines.push(`inpoint ${offset}`);
      concatLines.push(`outpoint ${offset + clip.duration}`);
    }
  }

  if (concatLines.length === 0) {
    return res.status(400).json({ error: 'Could not locate uploaded clip files on server' });
  }

  fs.writeFileSync(concatListPath, concatLines.join('\n'));

  const size        = RESOLUTION_MAP[resolution as Resolution] ?? '1920x1080';
  const isWebm      = format === 'webm';
  const videoCodec  = isWebm ? 'libvpx-vp9' : 'libx264';
  const audioCodec  = isWebm ? 'libopus'     : 'aac';

  const outputOptions: string[] = [
    `-r ${fps}`,
    `-s ${size}`,
    '-preset fast',
    '-crf 23',
  ];
  if (!isWebm) outputOptions.push('-movflags +faststart');
  if (isWebm)  outputOptions.push('-b:v 0', '-deadline realtime');

  ffmpeg()
    .input(concatListPath)
    .inputOptions(['-f', 'concat', '-safe', '0'])
    .videoCodec(videoCodec)
    .audioCodec(audioCodec)
    .outputOptions(outputOptions)
    .output(exportPath)
    .on('end', () => {
      if (fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath);
      res.json({ status: 'success', downloadUrl: `/uploads/${exportFilename}` });
    })
    .on('error', (err) => {
      console.error('FFmpeg export error:', err);
      if (fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath);
      res.status(500).json({ error: 'Export failed', detail: err.message });
    })
    .run();
});

export { router as exportRouter };
