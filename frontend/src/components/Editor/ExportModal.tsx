import { useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface Props { onClose: () => void; }

const RESOLUTIONS = ['360p', '480p', '720p', '1080p', '4k'] as const;
const FORMATS = ['mp4', 'webm'] as const;
const FPS_OPTIONS = [24, 30, 60];

export default function ExportModal({ onClose }: Props) {
  const { currentProject } = useStore();
  const [resolution, setResolution] = useState<typeof RESOLUTIONS[number]>('1080p');
  const [format, setFormat] = useState<typeof FORMATS[number]>('mp4');
  const [fps, setFps] = useState(30);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');

  const handleExport = async () => {
    if (!currentProject) return;
    setExporting(true);
    setProgress(0);
    // Simulate progress while waiting
    const iv = setInterval(() => setProgress(p => Math.min(p + 5, 90)), 400);
    try {
      const res = await fetch('http://localhost:3001/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeline: currentProject.timeline, resolution, format, fps }),
      });
      const data = await res.json();
      clearInterval(iv);
      setProgress(100);
      setDone(true);
      setDownloadUrl(`http://localhost:3001${data.downloadUrl}`);
    } catch (e) {
      clearInterval(iv);
      console.error(e);
      alert('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1e1e1e] border border-neutral-700 rounded-2xl w-[460px] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <h2 className="text-base font-semibold text-white">Export Video</h2>
          <button onClick={onClose} className="btn-icon"><X size={18}/></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Resolution */}
          <div>
            <p className="prop-label mb-2">Resolution</p>
            <div className="flex gap-2 flex-wrap">
              {RESOLUTIONS.map(r => (
                <button key={r} onClick={() => setResolution(r)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                    ${resolution === r ? 'bg-accent border-accent text-white' : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}
                >{r}</button>
              ))}
            </div>
          </div>
          {/* Format */}
          <div>
            <p className="prop-label mb-2">Format</p>
            <div className="flex gap-2">
              {FORMATS.map(f => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors uppercase
                    ${format === f ? 'bg-accent border-accent text-white' : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}
                >{f}</button>
              ))}
            </div>
          </div>
          {/* FPS */}
          <div>
            <p className="prop-label mb-2">Frame Rate</p>
            <div className="flex gap-2">
              {FPS_OPTIONS.map(f => (
                <button key={f} onClick={() => setFps(f)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors
                    ${fps === f ? 'bg-accent border-accent text-white' : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}
                >{f} fps</button>
              ))}
            </div>
          </div>

          {/* Progress */}
          {exporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-neutral-400">
                <span>Exporting…</span><span>{progress}%</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-accent transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          {done && (
            <a href={downloadUrl} download className="btn-accent w-full justify-center py-2.5">
              <Download size={16} /> Download Video
            </a>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost border border-neutral-700">Cancel</button>
          {!done && (
            <button onClick={handleExport} disabled={exporting} className="btn-accent disabled:opacity-60">
              {exporting ? <><Loader2 size={15} className="animate-spin"/> Exporting…</> : <><Download size={15}/>Export</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
