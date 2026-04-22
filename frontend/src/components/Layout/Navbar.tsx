import { useEffect, useState, useRef } from 'react';
import {
  Download, Save, LogIn, LogOut, Loader2, Wand2,
  Undo2, Redo2, Share2, FolderOpen, X,
} from 'lucide-react';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase';
import { saveProject, loadProject, listProjects } from '../../lib/firestore';
import { useStore } from '../../store/useStore';
import ExportModal from '../Editor/ExportModal';

export default function Navbar() {
  const { currentProject, undo, redo, history, historyIndex, renameProject, setProject } = useStore();
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(currentProject?.name ?? 'Untitled Project');
  const nameRef = useRef<HTMLInputElement>(null);

  // Open project modal
  const [showOpen, setShowOpen] = useState(false);
  const [projectList, setProjectList] = useState<Array<{ id: string; name: string; updatedAt?: string }>>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    setNameVal(currentProject?.name ?? 'Untitled Project');
  }, [currentProject?.name]);

  const handleSave = async () => {
    if (!currentProject || !user) { alert('Sign in to save your project.'); return; }
    setSaving(true);
    try { await saveProject(user.uid, currentProject); }
    catch (e) { console.error(e); alert('Save failed.'); }
    finally { setSaving(false); }
  };

  const handleOpenModal = async () => {
    if (!user) { alert('Sign in to open saved projects.'); return; }
    setShowOpen(true);
    setLoadingProjects(true);
    try {
      const list = await listProjects(user.uid);
      setProjectList(list.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleLoadProject = async (projectId: string) => {
    if (!user) return;
    setLoadingId(projectId);
    try {
      const project = await loadProject(user.uid, projectId);
      if (project) {
        setProject(project);
        setShowOpen(false);
      } else {
        alert('Project not found.');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to load project.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleNameCommit = () => {
    setEditingName(false);
    if (nameVal.trim()) renameProject(nameVal.trim());
  };

  return (
    <>
      <div className="h-12 bg-panel border-b border-neutral-800 flex items-center justify-between px-3 z-50 shrink-0">
        {/* Left — logo + name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-purple-700 flex items-center justify-center shadow-[0_0_14px_rgba(108,99,255,0.5)] shrink-0">
            <Wand2 size={15} className="text-white" />
          </div>
          <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-400 shrink-0">
            PromptReel
          </span>
          <div className="h-4 w-px bg-neutral-700 shrink-0" />
          {editingName ? (
            <input
              ref={nameRef}
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={handleNameCommit}
              onKeyDown={e => e.key === 'Enter' && handleNameCommit()}
              autoFocus
              className="bg-neutral-800 text-white text-sm px-2 py-0.5 rounded border border-accent focus:outline-none w-44"
            />
          ) : (
            <span
              onDoubleClick={() => setEditingName(true)}
              className="text-sm text-neutral-400 hover:text-white cursor-pointer truncate max-w-[160px]"
              title="Double-click to rename"
            >
              {currentProject?.name}
            </span>
          )}
        </div>

        {/* Center — undo/redo */}
        <div className="flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          <button
            onClick={undo} disabled={historyIndex < 0}
            className="btn-icon disabled:opacity-30" title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo} disabled={historyIndex >= history.length - 1}
            className="btn-icon disabled:opacity-30" title="Redo (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
        </div>

        {/* Right — open/save/export/auth */}
        <div className="flex items-center gap-2">
          <button onClick={handleOpenModal} className="btn-ghost" title="Open saved project">
            <FolderOpen size={15} /> Open
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-ghost disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save
          </button>
          <button className="btn-ghost">
            <Share2 size={15} /> Share
          </button>
          <button onClick={() => setShowExport(true)} className="btn-accent">
            <Download size={15} /> Export
          </button>
          <div className="h-4 w-px bg-neutral-700" />
          {user ? (
            <div className="flex items-center gap-1.5">
              {user.photoURL && (
                <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full border border-neutral-600 object-cover" />
              )}
              <button onClick={() => signOut(auth)} className="btn-icon" title="Sign out">
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => signInWithPopup(auth, googleProvider).catch(console.error)}
              className="btn-ghost border border-neutral-700"
            >
              <LogIn size={15} /> Sign in
            </button>
          )}
        </div>
      </div>

      {/* Export Modal */}
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}

      {/* Open Project Modal */}
      {showOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1e1e1e] border border-neutral-700 rounded-2xl w-[460px] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <FolderOpen size={16} className="text-accent" /> Open Project
              </h2>
              <button onClick={() => setShowOpen(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
              {loadingProjects ? (
                <div className="flex items-center justify-center py-12 text-neutral-500 gap-2">
                  <Loader2 size={18} className="animate-spin" /> Loading projects…
                </div>
              ) : projectList.length === 0 ? (
                <div className="text-center py-12 text-neutral-600 text-sm">
                  No saved projects found.<br />
                  <span className="text-[11px]">Save your current project first.</span>
                </div>
              ) : (
                projectList.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleLoadProject(p.id)}
                    disabled={loadingId === p.id}
                    className="w-full text-left px-4 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-accent rounded-xl transition-all flex items-center justify-between group disabled:opacity-60"
                  >
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-accent transition-colors">{p.name}</p>
                      {p.updatedAt && (
                        <p className="text-[10px] text-neutral-500 mt-0.5">
                          {new Date(p.updatedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {loadingId === p.id
                      ? <Loader2 size={14} className="animate-spin text-accent" />
                      : <FolderOpen size={14} className="text-neutral-600 group-hover:text-accent transition-colors" />
                    }
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
