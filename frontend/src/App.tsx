import { useEffect } from 'react';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import PropertiesPanel from './components/Layout/PropertiesPanel';
import Canvas from './components/Editor/Canvas';
import Timeline from './components/Editor/Timeline';
import { useStore } from './store/useStore';
import './lib/firebase'; // initialize firebase early

function App() {
  const { removeClip, selectedClip } = useStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClip) {
        removeClip(selectedClip.trackId, selectedClip.id);
      }
      if (e.code === 'Space') {
        e.preventDefault();
        useStore.getState().setIsPlaying(!useStore.getState().isPlaying);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClip, removeClip]);

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-white overflow-hidden font-sans">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Canvas / preview area */}
          <div className="flex-1 bg-neutral-950 flex items-center justify-center overflow-hidden">
            <Canvas />
          </div>
          {/* Timeline */}
          <div className="border-t border-neutral-800" style={{ height: '42%', minHeight: 260 }}>
            <Timeline />
          </div>
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
}

export default App;
