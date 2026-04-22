import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

const router = Router();

const ALLOWED_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'image/jpeg',
  'image/png',
  'image/gif',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported file type'));
  },
});

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  const isVideo = req.file.mimetype.startsWith('video');
  const filePath = req.file.path;
  const filenameNoExt = path.parse(req.file.filename).name;

  if (isVideo) {
    // Generate thumbnail and get duration using ffmpeg
    const thumbnailFilename = `${filenameNoExt}-thumb.png`;
    ffmpeg(filePath)
      .screenshots({
        count: 1,
        folder: path.join(__dirname, '../../uploads'),
        filename: thumbnailFilename,
        size: '320x240'
      })
      .on('end', () => {
        // Now get duration
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          const duration = metadata?.format?.duration || 5;
          res.json({
            id: filenameNoExt,
            url: fileUrl,
            thumbnailUrl: `/uploads/${thumbnailFilename}`,
            duration: Math.ceil(duration)
          });
        });
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        res.status(500).json({ error: 'Failed to process video' });
      });
  } else {
    res.json({
      id: filenameNoExt,
      url: fileUrl,
      thumbnailUrl: fileUrl,
      duration: 5 // Default duration for images
    });
  }
});

export { router as uploadRouter };
