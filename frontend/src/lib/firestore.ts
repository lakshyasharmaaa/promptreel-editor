import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Project } from '@shared/types';

export async function saveProject(userId: string, project: Project): Promise<void> {
  const ref = doc(db, 'users', userId, 'projects', project.id);
  await setDoc(ref, { ...project, updatedAt: new Date().toISOString() });
}

export async function loadProject(userId: string, projectId: string): Promise<Project | null> {
  const ref  = doc(db, 'users', userId, 'projects', projectId);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as Project;
  return null;
}

export async function listProjects(userId: string): Promise<Array<{ id: string; name: string; updatedAt?: string }>> {
  const col  = collection(db, 'users', userId, 'projects');
  const snap = await getDocs(col);
  return snap.docs.map(d => {
    const data = d.data();
    return { id: d.id, name: data.name ?? 'Untitled', updatedAt: data.updatedAt };
  });
}
