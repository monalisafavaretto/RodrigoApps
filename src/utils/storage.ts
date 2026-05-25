import { Project } from '../types';

const STORAGE_KEY = 'resina_design_projects';
const CURRENT_USER_KEY = 'resina_design_user';

export function getLoggedInUser(): string | null {
  try {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function setLoggedInUser(email: string | null): void {
  try {
    if (email) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(email.trim().toLowerCase()));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (e) {
    console.error('Error saving user to localStorage', e);
  }
}

export function getAllSavedProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getUserProjects(email: string): Project[] {
  const normEmail = email.trim().toLowerCase();
  return getAllSavedProjects().filter(p => p.email.trim().toLowerCase() === normEmail);
}

export function saveProject(project: Project): void {
  try {
    const all = getAllSavedProjects();
    const idx = all.findIndex(p => p.id === project.id);
    
    const updatedProject = {
      ...project,
      updatedAt: new Date().toISOString()
    };

    if (idx >= 0) {
      all[idx] = updatedProject;
    } else {
      all.push(updatedProject);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Error saving project to localStorage', e);
  }
}

export function deleteProject(id: string): void {
  try {
    const all = getAllSavedProjects();
    const filtered = all.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Error deleting project from localStorage', e);
  }
}

export function createNewProject(name: string, email: string): Project {
  return {
    id: 'proj_' + Math.random().toString(36).substring(2, 9),
    name: name || 'Novo Chaveiro de Resina',
    email: email.trim().toLowerCase(),
    items: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
