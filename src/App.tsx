import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, FileText, Layers, AlertTriangle, Plus, Layout, 
  HelpCircle, Image as ImageIcon, CheckCircle2, ChevronRight, ChevronLeft 
} from 'lucide-react';
import { EditorItem, Project } from './types';
import HeaderToolbar from './components/HeaderToolbar';
import SidebarMolds from './components/SidebarMoldes';
import CanvasArea from './components/CanvasArea';
import InspectorPanel from './components/InspectorPanel';
import LoginModal from './components/LoginModal';
import FrameCreator from './components/FrameCreator';
import AdminPanel from './components/AdminPanel';
import { getLoggedInUser, setLoggedInUser, getUserProjects, saveProject, deleteProject, createNewProject } from './utils/storage';
import { LibraryShape } from './utils/shapeHelper';
import { jsPDF } from 'jspdf';

const safeJson = (res: Response) => {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res.text().then(text => {
    throw new Error(`Resposta inesperada do servidor: ${text.substring(0, 100)}`);
  });
};

export default function App() {
  // Session / Authentication state - Always start on the login area
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [projectName, setProjectName] = useState('Meu Projeto de Chaveiros');
  const [projectItems, setProjectItems] = useState<EditorItem[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  
  // Custom geometry bounding boxes (0 to 100 relative space)
  const [shapeBBoxes, setShapeBBoxes] = useState<Record<string, { x: number; y: number; width: number; height: number }>>({});

  const handleUpdateShapeBBox = (itemId: string, bbox: { x: number; y: number; width: number; height: number }) => {
    setShapeBBoxes(prev => {
      const existing = prev[itemId];
      if (existing &&
          existing.x === bbox.x &&
          existing.y === bbox.y &&
          existing.width === bbox.width &&
          existing.height === bbox.height) {
        return prev;
      }
      return {
        ...prev,
        [itemId]: bbox
      };
    });
  };
  
  // Selection and History stacks
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<EditorItem[][]>([]);
  const [redoStack, setRedoStack] = useState<EditorItem[][]>([]);
  
  // Workspace Config States
  const [zoom, setZoom] = useState<number>(0.85); //Fits on standard screens
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);

  // Upload/Meus Moldes Lists
  const [uploads, setUploads] = useState<string[]>([]);
  const [customMolds, setCustomMolds] = useState<{ id: string; name: string; maskUrl: string }[]>([]);

  // Collapse controllers for responsive sidebars with ease of access on mobile
  const [leftSidebarOpen, setLeftSidebarOpen] = useState<boolean>(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState<boolean>(true);

  // Custom interactive pack of images & courses state
  const [imagePack, setImagePack] = useState<{ id: string; name: string; url: string; createdAt: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string; url: string; size?: string; createdAt: string }[]>([]);
  const [driveLinks, setDriveLinks] = useState<string[]>([]);

  const fetchImagePackAndCourses = () => {
    fetch('/api/image-pack')
      .then(res => res.json())
      .then(data => setImagePack(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error loading image pack:", err));

    fetch('/api/courses')
      .then(res => res.json())
      .then(data => setCourses(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error loading courses:", err));

    fetch('/api/drive-links')
      .then(res => res.json())
      .then(data => setDriveLinks(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error loading drive links:", err));
  };

  useEffect(() => {
    if (userEmail) {
      fetchImagePackAndCourses();
    }
  }, [userEmail]);

  const handleAddImageToPack = async (name: string, url: string) => {
    try {
      const res = await fetch('/api/image-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_email: userEmail, name, url })
      });
      const data = await safeJson(res);
      fetchImagePackAndCourses();
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleDeleteImageFromPack = async (id: string) => {
    try {
      const res = await fetch(`/api/image-pack/${id}?admin_email=${encodeURIComponent(userEmail || '')}`, {
        method: 'DELETE'
      });
      const data = await safeJson(res);
      fetchImagePackAndCourses();
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleAddCoursePDF = async (name: string, url: string, size?: string) => {
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_email: userEmail, name, url, size })
      });
      const data = await safeJson(res);
      fetchImagePackAndCourses();
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleDeleteCoursePDF = async (id: string) => {
    try {
      const res = await fetch(`/api/courses/${id}?admin_email=${encodeURIComponent(userEmail || '')}`, {
        method: 'DELETE'
      });
      const data = await safeJson(res);
      fetchImagePackAndCourses();
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleSaveDriveLinks = async (links: string[]) => {
    try {
      const res = await fetch('/api/drive-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_email: userEmail, links })
      });
      const data = await safeJson(res);
      fetchImagePackAndCourses();
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Clipboard for Ctrl+C / Ctrl+V
  const [clipboardItem, setClipboardItem] = useState<EditorItem | null>(null);

  // Ref to track the last saved or loaded state to prevent redundant saves
  const lastSavedStateRef = useRef<{ name: string; items: any[] } | null>(null);

  // Load matching user projects and uploaded states once entered
  useEffect(() => {
    if (userEmail) {
      fetch(`/api/projects?email=${encodeURIComponent(userEmail)}`)
        .then(safeJson)
        .then(projs => {
          const serverProjects = projs || [];
          const backupProjs = getUserProjects(userEmail);
          const serverIds = new Set(serverProjects.map((p: Project) => p.id));
          
          let anySynced = false;
          backupProjs.forEach(proj => {
            if (!serverIds.has(proj.id)) {
              anySynced = true;
              fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(proj)
              })
              .then(safeJson)
              .then(() => {
                console.log(`Synced local project "${proj.name}" to server automatically!`);
              })
              .catch(err => {
                console.error(`Failed to automatically sync project "${proj.name}" to server:`, err);
              });
            }
          });

          if (anySynced) {
            // Re-fetch after syncing to ensure frontend has server-verified list
            setTimeout(() => {
              fetch(`/api/projects?email=${encodeURIComponent(userEmail)}`)
                .then(safeJson)
                .then(updatedProjs => {
                  if (updatedProjs && updatedProjs.length > 0) {
                    setSavedProjects(updatedProjs);
                  }
                })
                .catch(err => console.error(err));
            }, 1500);
          }

          if (serverProjects.length > 0) {
            setSavedProjects(serverProjects);
            loadProjectState(serverProjects[serverProjects.length - 1]);
          } else {
            if (backupProjs.length > 0) {
              setSavedProjects(backupProjs);
              loadProjectState(backupProjs[backupProjs.length - 1]);
            } else {
              handleNewProject();
            }
          }
        })
        .catch(err => {
          console.error("Failed to load projects from server, falling back to local storage", err);
          const projs = getUserProjects(userEmail);
          setSavedProjects(projs);
          if (projs.length > 0) {
            loadProjectState(projs[projs.length - 1]);
          } else {
            handleNewProject();
          }
        });

      // Load uploaded images and custom molds caches for this user email
      try {
        const cachedUploads = localStorage.getItem(`resina_uploads_${userEmail}`);
        if (cachedUploads) setUploads(JSON.parse(cachedUploads));

        const cachedMolds = localStorage.getItem(`resina_custom_molds_${userEmail}`);
        if (cachedMolds) setCustomMolds(JSON.parse(cachedMolds));
      } catch (e) {
        console.error('Error loading caches from localstorage', e);
      }
    }
  }, [userEmail]);

  // Debounced Autosave Effect
  useEffect(() => {
    if (!userEmail || !projectId) return;

    // Compare with last saved/loaded state to avoid saving when nothing changed or during initial loads
    const isNew = !lastSavedStateRef.current;
    const nameChanged = lastSavedStateRef.current && lastSavedStateRef.current.name !== projectName;
    const itemsChanged = lastSavedStateRef.current && JSON.stringify(lastSavedStateRef.current.items) !== JSON.stringify(projectItems);

    if (!isNew && !nameChanged && !itemsChanged) {
      return;
    }

    const delayDebounce = setTimeout(() => {
      const activeId = projectId;
      const projectToSave: Project = {
        id: activeId,
        name: projectName.trim() || 'Sem Título',
        email: userEmail,
        items: projectItems,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Update ref immediately to prevent duplicate triggers while request is in flight
      lastSavedStateRef.current = { name: projectToSave.name, items: projectToSave.items };

      // Save locally as secondary backup
      saveProject(projectToSave);

      // Save to server
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectToSave)
      })
      .then(safeJson)
      .then(() => {
        return fetch(`/api/projects?email=${encodeURIComponent(userEmail)}`);
      })
      .then(safeJson)
      .then(projs => {
        setSavedProjects(projs || []);
      })
      .catch(err => {
        console.error("Autosave failed to reach server:", err);
      });
    }, 2000); // 2 second debounce

    return () => clearTimeout(delayDebounce);
  }, [projectItems, projectName, projectId, userEmail]);

  // Handle Login submission
  const handleLogin = (email: string) => {
    setLoggedInUser(email);
    setUserEmail(email);
  };

  // Handle Logout Sair
  const handleLogout = () => {
    if (confirm('Deseja realmente sair da sua conta? Verifique se seus projetos foram salvos para não perdê-los!')) {
      setLoggedInUser(null);
      setUserEmail(null);
      setProjectItems([]);
      setSelectedItemId(null);
    }
  };

  // State update wrapper to automate Undo Stack history tracking
  const updateProjectItems = (newItems: EditorItem[], skipStack = false) => {
    if (!skipStack) {
      setUndoStack(prev => [...prev, projectItems]);
      setRedoStack([]); // Clear Redo
    }
    setProjectItems(newItems);
  };

  // Direct element modifier from inspector or drag
  const handleUpdateItem = (updated: EditorItem) => {
    const updatedList = projectItems.map(i => i.id === updated.id ? updated : i);
    updateProjectItems(updatedList);
  };

  // Undo / Redo triggers
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, projectItems]);
    setProjectItems(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, projectItems]);
    setProjectItems(next);
  };

  // Create a brand new project of clean slate
  const handleNewProject = () => {
    if (projectItems.length > 0 && !confirm('Criar nova folha em branco? Lembre-se de salvar suas alterações atuais!')) {
      return;
    }
    const id = 'proj_' + Math.random().toString(36).substring(2, 9);
    setProjectId(id);
    setProjectName('Chaveiros de Resina A4');
    setProjectItems([]);
    setSelectedItemId(null);
    setUndoStack([]);
    setRedoStack([]);
  };

  // Load project onto editor workspace state
  const loadProjectState = (proj: Project) => {
    setProjectId(proj.id);
    setProjectName(proj.name);
    setProjectItems(proj.items);
    setSelectedItemId(null);
    setUndoStack([]);
    setRedoStack([]);
    lastSavedStateRef.current = { name: proj.name, items: proj.items };
  };

  // Save layout state local storage
  const handleSaveProject = () => {
    if (!userEmail) return;
    const activeId = projectId || 'proj_' + Math.random().toString(36).substring(2, 9);
    if (!projectId) {
      setProjectId(activeId);
    }
    const projectToSave: Project = {
      id: activeId,
      name: projectName.trim() || 'Sem Título',
      email: userEmail,
      items: projectItems,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Save to local storage as a robust secondary copy
    saveProject(projectToSave);
    lastSavedStateRef.current = { name: projectToSave.name, items: projectToSave.items };

    // Remote Save
    fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectToSave)
    })
    .then(safeJson)
    .then(() => {
      return fetch(`/api/projects?email=${encodeURIComponent(userEmail)}`);
    })
    .then(safeJson)
    .then(projs => {
      setSavedProjects(projs || []);
      showFloatingToast(`Projeto "${projectToSave.name}" salvo online com sucesso!`);
    })
    .catch(err => {
      console.error("Failed to save remote project, stored locally", err);
      const projs = getUserProjects(userEmail);
      setSavedProjects(projs);
      showFloatingToast(`Projeto "${projectToSave.name}" salvo no navegador!`);
    });
  };

  const showFloatingToast = (message: string) => {
    const toast = document.createElement('div');
    toast.className = "fixed bottom-4 right-4 bg-emerald-600 border border-emerald-500 text-white rounded-xl px-4 py-3 shadow-xl z-50 text-xs font-semibold flex items-center gap-1.5 animate-bounce";
    toast.innerHTML = `<span>✓</span> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  };

  // Delete project trigger
  const handleDeleteProject = (id: string) => {
    if (!userEmail) return;
    
    fetch(`/api/projects/${id}?email=${encodeURIComponent(userEmail)}`, {
      method: 'DELETE'
    })
    .then(() => fetch(`/api/projects?email=${encodeURIComponent(userEmail)}`))
    .then(safeJson)
    .then(projs => {
      setSavedProjects(projs || []);
      if (projectId === id) {
        handleNewProject();
      }
    })
    .catch(err => {
      console.error(err);
      deleteProject(id);
      setSavedProjects(getUserProjects(userEmail));
      if (projectId === id) {
        handleNewProject();
      }
    });
  };

  // Individual Element Duplicator trigger
  const handleDuplicateItem = (item: EditorItem) => {
    const copy: EditorItem = {
      ...item,
      id: 'item_' + Math.random().toString(36).substring(2, 9),
      x: Math.min(180, item.x + 8), // Offset slightly to right
      y: Math.min(260, item.y + 8), // Offset slightly down
      name: `${item.name} (Cópia)`,
    };
    updateProjectItems([...projectItems, copy]);
    setSelectedItemId(copy.id); // Autofocus newly copied element
  };

  // Remove elements trigger
  const handleDeleteItem = (id: string) => {
    const filtered = projectItems.filter(i => i.id !== id);
    updateProjectItems(filtered);
    if (selectedItemId === id) setSelectedItemId(null);
  };

  // SVG Elements Layer arrangement zindex triggers
  const handleLayerChange = (direction: 'front' | 'back') => {
    if (!selectedItemId) return;
    const activeIdx = projectItems.findIndex(i => i.id === selectedItemId);
    if (activeIdx < 0) return;

    const copy = [...projectItems];
    const targetItem = copy[activeIdx];
    copy.splice(activeIdx, 1); // remove from sequence

    if (direction === 'front') {
      // Append to top layer index
      copy.push(targetItem);
    } else {
      // Shift to bottom layout index
      copy.unshift(targetItem);
    }
    updateProjectItems(copy);
  };

  // Page layout alignments (Left, Horizontal Center, Right, Top, Vertical Center, Bottom)
  const handleAlignItem = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!selectedItemId) return;
    const item = projectItems.find(i => i.id === selectedItemId);
    if (!item || item.isLocked) return;

    const copy = { ...item };
    const pageW = 210; // mm
    const pageH = 297; // mm

    switch (alignment) {
      case 'left':
        copy.x = 10; // left margins padding preset
        break;
      case 'center':
        copy.x = (pageW - item.width) / 2;
        break;
      case 'right':
        copy.x = pageW - item.width - 10;
        break;
      case 'top':
        copy.y = 10;
        break;
      case 'middle':
        copy.y = (pageH - item.height) / 2;
        break;
      case 'bottom':
        copy.y = pageH - item.height - 10;
        break;
    }
    handleUpdateItem(copy);
  };

  // LIBRARY INSERT TRIGGERS

  // Add standard mold outlines (heart, circle, dog bone, pens etc)
  const handleAddMold = (shape: LibraryShape) => {
    const newId = 'item_' + Math.random().toString(36).substring(2, 9);
    const newItem: EditorItem = {
      id: newId,
      type: 'mold',
      name: shape.name,
      shapeType: shape.id as any,
      x: 35, // Centered default coordinates around rules metrics
      y: 40,
      width: shape.defaultWidth,
      height: shape.defaultHeight,
      rotation: 0,
      isLocked: false,
      opacity: 1.0,
      mirrorH: false,
      mirrorV: false,
      contourColor: '#1e3a8a',
      contourWidth: 0,
      backgroundColor: '#f3f4f6',
      imgSrc: null,
      imgScale: 1.0,
      imgOffsetX: 0,
      imgOffsetY: 0,
      imgRotation: 0,
      imgMirrorH: false,
      imgMirrorV: false,
      hasHole: true, // Keychain ring hole preset true
      holePosition: 'top-center',
      holeSize: 4.5,
      holeOffset: 3.5,
    };
    updateProjectItems([...projectItems, newItem]);
    setSelectedItemId(newId);
  };

  // Add a letter-mold
  const handleAddLetterMold = (letter: string) => {
    const newId = 'item_' + Math.random().toString(36).substring(2, 9);
    const newItem: EditorItem = {
      id: newId,
      type: 'mold',
      name: `Letra ${letter} Vazada`,
      shapeType: 'letter',
      letterChar: letter,
      fontFamily: 'Bebas Neue', // Bold block display fonts default for letters
      x: 35,
      y: 45,
      width: 40,
      height: 40,
      rotation: 0,
      isLocked: false,
      opacity: 1.0,
      mirrorH: false,
      mirrorV: false,
      contourColor: '#db2777', // Rose contour highlight
      contourWidth: 0,
      backgroundColor: '#f3f4f6',
      imgSrc: null,
      imgScale: 1.0,
      imgOffsetX: 0,
      imgOffsetY: 0,
      imgRotation: 0,
      imgMirrorH: false,
      imgMirrorV: false,
      hasHole: true,
      holePosition: 'top-center',
      holeSize: 4.0,
      holeOffset: 3.0,
    };
    updateProjectItems([...projectItems, newItem]);
    setSelectedItemId(newId);
  };

  // Add a number-mold
  const handleAddNumberMold = (num: string) => {
    const newId = 'item_' + Math.random().toString(36).substring(2, 9);
    const newItem: EditorItem = {
      id: newId,
      type: 'mold',
      name: `Número ${num} Vazado`,
      shapeType: 'number',
      letterChar: num,
      fontFamily: 'Anton',
      x: 40,
      y: 50,
      width: 35,
      height: 45,
      rotation: 0,
      isLocked: false,
      opacity: 1.0,
      mirrorH: false,
      mirrorV: false,
      contourColor: '#4f46e5',
      contourWidth: 0,
      backgroundColor: '#eaebee',
      imgSrc: null,
      imgScale: 1.0,
      imgOffsetX: 0,
      imgOffsetY: 0,
      imgRotation: 0,
      imgMirrorH: false,
      imgMirrorV: false,
      hasHole: true,
      holePosition: 'top-center',
      holeSize: 4.0,
      holeOffset: 3.0,
    };
    updateProjectItems([...projectItems, newItem]);
    setSelectedItemId(newId);
  };

  // Add custom typed Name/Word as single continuous mold path
  const handleAddTextMold = (word: string, font: string) => {
    if (!word.trim()) return;
    const newId = 'item_' + Math.random().toString(36).substring(2, 9);
    const newItem: EditorItem = {
      id: newId,
      type: 'mold',
      name: `Mould Palavra "${word.trim()}"`,
      isTextMold: true,
      text: word.trim().toUpperCase(),
      fontFamily: font,
      x: 25,
      y: 60,
      width: Math.min(160, word.trim().length * 15),
      height: 35,
      rotation: 0,
      isLocked: false,
      opacity: 1.0,
      mirrorH: false,
      mirrorV: false,
      contourColor: '#111827',
      contourWidth: 0,
      backgroundColor: '#f3f4f6',
      imgSrc: null,
      imgScale: 1.0,
      imgOffsetX: 0,
      imgOffsetY: 0,
      imgRotation: 0,
      imgMirrorH: false,
      imgMirrorV: false,
      hasHole: false, // Word molds generally don't carry automatic holes
    };
    updateProjectItems([...projectItems, newItem]);
    setSelectedItemId(newId);
  };

  // Add standard decorative texts
  const handleAddText = (type: 'text' | 'curved-text', initialText = '') => {
    const newId = 'item_' + Math.random().toString(36).substring(2, 9);
    const newItem: EditorItem = {
      id: newId,
      type,
      name: type === 'text' ? 'Texto Regular' : 'Texto Curvado',
      text: initialText || (type === 'text' ? 'Nome Personalizado' : 'Amor Eterno'),
      fontFamily: 'Montserrat',
      fontSize: 22,
      fillColor: '#1e1b4b', // deep rich navy
      strokeColor: '#ef4444', // nice thin glow
      strokeWidth: 0,
      x: 35,
      y: 75,
      width: 70,
      height: type === 'text' ? 14 : 35, // Curved text boxes are taller to display the dynamic arc bounding box
      rotation: 0,
      isLocked: false,
      opacity: 1.0,
      mirrorH: false,
      mirrorV: false,
      curveRadius: 75, // positive arc down default
      isBold: true,
      isItalic: false,
      letterSpacing: 0,
    };
    updateProjectItems([...projectItems, newItem]);
    setSelectedItemId(newId);
  };

  // Image Upload helper functions
  const handleUploadImage = (base64: string) => {
    const newList = [base64, ...uploads].slice(0, 30); // cache maximum 30 custom graphics
    setUploads(newList);
    if (userEmail) {
      localStorage.setItem(`resina_uploads_${userEmail}`, JSON.stringify(newList));
    }
  };

  const handleDeleteUpload = (idx: number) => {
    const newList = uploads.filter((_, i) => i !== idx);
    setUploads(newList);
    if (userEmail) {
      localStorage.setItem(`resina_uploads_${userEmail}`, JSON.stringify(newList));
    }
  };

  // Put custom image upload inside selected mask container outline
  const handleSelectUploadForActiveMold = (base64: string) => {
    if (!selectedItemId) {
      // If no element select, insert as standalone background frame object automatically
      const newId = 'item_' + Math.random().toString(36).substring(2, 9);
      const newItem: EditorItem = {
        id: newId,
        type: 'mold',
        name: 'Background Estampa',
        shapeType: 'rectangle',
        x: 40,
        y: 60,
        width: 60,
        height: 60,
        rotation: 0,
        isLocked: false,
        opacity: 1.0,
        mirrorH: false,
        mirrorV: false,
        contourWidth: 0,
        backgroundColor: '#ffff',
        imgSrc: base64,
        imgScale: 1.0,
        imgOffsetX: 0,
        imgOffsetY: 0,
        imgRotation: 0,
        imgMirrorH: false,
        imgMirrorV: false,
      };
      updateProjectItems([...projectItems, newItem]);
      setSelectedItemId(newId);
      return;
    }
    
    // Fill mask element
    const item = projectItems.find(i => i.id === selectedItemId);
    if (item && (item.type === 'mold' || item.isTextMold)) {
      handleUpdateItem({
        ...item,
        imgSrc: base64,
      });
    }
  };

  // Add customized frame (PNG Transparency Tracer tool trace output saved)
  const handleAddCustomMold = (name: string, transparentPngDataUrl: string) => {
    const newMold = {
      id: 'custom_' + Math.random().toString(36).substring(2, 9),
      name: name,
      maskUrl: transparentPngDataUrl,
    };
    const newList = [newMold, ...customMolds];
    setCustomMolds(newList);

    if (userEmail) {
      localStorage.setItem(`resina_custom_molds_${userEmail}`, JSON.stringify(newList));
    }
  };

  const handleDeleteCustomMold = (id: string) => {
    const newList = customMolds.filter(m => m.id !== id);
    setCustomMolds(newList);
    if (userEmail) {
      localStorage.setItem(`resina_custom_molds_${userEmail}`, JSON.stringify(newList));
    }
  };

  const handleAddCustomMoldToPage = (id: string, name: string, maskUrl: string) => {
    const newId = 'item_' + Math.random().toString(36).substring(2, 9);
    const newItem: EditorItem = {
      id: newId,
      type: 'mold',
      name: `Custom Mold: ${name}`,
      shapeType: 'custom-trace' as any,
      customPngMask: maskUrl,
      x: 40,
      y: 50,
      width: 50,
      height: 50,
      rotation: 0,
      isLocked: false,
      opacity: 1.0,
      mirrorH: false,
      mirrorV: false,
      contourWidth: 0,
      backgroundColor: '#eaebee',
      imgSrc: null,
      imgScale: 1.0,
      imgOffsetX: 0,
      imgOffsetY: 0,
      imgRotation: 0,
      imgMirrorH: false,
      imgMirrorV: false,
    };
    updateProjectItems([...projectItems, newItem]);
    setSelectedItemId(newId);
  };

  // Keyboard desktop shortcuts setup (Copy, Paste, Zoom, Undo, Redo, Cancel, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if writing in input / textarea fields
      const tag = e.target ? (e.target as HTMLElement).tagName.toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return;
      }

      // 1. DELETE | BACKSPACE (Apagar selecionado)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItemId) {
        e.preventDefault();
        handleDeleteItem(selectedItemId);
      }

      // 2. COPY (Ctrl + C)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedItemId) {
        e.preventDefault();
        const activeItem = projectItems.find(i => i.id === selectedItemId);
        if (activeItem) {
          setClipboardItem(activeItem);
        }
      }

      // 3. PASTE (Ctrl + V)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        if (clipboardItem) {
          const shiftValue = 5; // offset 5mm displacement
          const copy: EditorItem = {
            ...clipboardItem,
            id: 'item_' + Math.random().toString(36).substring(2, 9),
            x: Math.min(180, clipboardItem.x + shiftValue),
            y: Math.min(260, clipboardItem.y + shiftValue),
            name: `${clipboardItem.name} (Cópia)`,
          };
          updateProjectItems([...projectItems, copy]);
          setSelectedItemId(copy.id);
          // Set freshly created item as focus trigger target to allow repetitive sequences
          setClipboardItem(copy);
        }
      }

      // 4. UNDO (Ctrl + Z)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // 5. REDO (Ctrl + Y or Ctrl + Shift + Z)
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        handleRedo();
      }

      // 6. SAVE (Ctrl + S)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveProject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedItemId, projectItems, clipboardItem, userEmail, projectId, projectName]);

  // High quality client PDF exporter
  const handleExportPDF = () => {
    trackImageGeneration();
    window.print();
  };

  // Triggers print view directly
  const handlePrint = () => {
    trackImageGeneration();
    window.print();
  };

  const trackImageGeneration = () => {
    if (userEmail) {
      fetch('/api/track-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      })
      .then(safeJson)
      .then(data => {
        console.log("Image generation tracked successfully:", data);
      })
      .catch(err => console.error("Error tracking generation:", err));
    }
  };

  // Fallback to initial modal if login is blank
  if (!userEmail) {
    return <LoginModal onLogin={handleLogin} defaultEmail="" />;
  }

  const activeItem = projectItems.find(i => i.id === selectedItemId) || null;
  const activeHasMask = activeItem ? (activeItem.type === 'mold' || !!activeItem.isTextMold) : false;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-50 text-zinc-800 font-sans">
      
      {/* Header toolbar */}
      <HeaderToolbar
        projectName={projectName}
        onRenameProject={setProjectName}
        onNewProject={handleNewProject}
        onSaveProject={handleSaveProject}
        onExportPDF={handleExportPDF}
        onPrint={handlePrint}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        zoom={zoom}
        setZoom={setZoom}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showRuler={showRuler}
        setShowRuler={setShowRuler}
        snapToGrid={snapToGrid}
        setSnapToGrid={setSnapToGrid}
        userEmail={userEmail}
        onLogout={handleLogout}
        savedProjects={savedProjects}
        onLoadProject={loadProjectState}
        onDeleteProject={handleDeleteProject}
        isAdmin={userEmail === 'admin123@resina.com'}
        showAdmin={showAdmin}
        onToggleAdmin={() => setShowAdmin(!showAdmin)}
      />

      {/* Admin Panel overlay */}
      {showAdmin && userEmail === 'admin123@resina.com' && (
        <AdminPanel onClose={() => setShowAdmin(false)} adminEmail={userEmail} />
      )}

      {/* Main workspace frame */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Library sidebar with responsive and collapsible styling */}
        <div className={`transition-all duration-300 flex select-none shrink-0 relative z-30 h-full ${leftSidebarOpen ? 'w-80' : 'w-0'}`}>
          <div className={`w-80 h-full transition-transform duration-300 ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <SidebarMolds
              onAddText={handleAddText}
              onAddMold={handleAddMold}
              onAddLetterMold={handleAddLetterMold}
              onAddNumberMold={handleAddNumberMold}
              onAddTextMold={handleAddTextMold}
              uploads={uploads}
              onUploadImage={handleUploadImage}
              onSelectUploadForActiveMold={handleSelectUploadForActiveMold}
              activeItemId={selectedItemId}
              activeItemHasMask={activeHasMask}
              customMolds={customMolds}
              onAddCustomMoldToPage={handleAddCustomMoldToPage}
              onDeleteCustomMold={handleDeleteCustomMold}
              onDeleteUpload={handleDeleteUpload}
              onAddCustomMold={handleAddCustomMold}
              userEmail={userEmail}
              imagePack={imagePack}
              courses={courses}
              onAddImageToPack={handleAddImageToPack}
              onDeleteImageFromPack={handleDeleteImageFromPack}
              onAddCoursePDF={handleAddCoursePDF}
              onDeleteCoursePDF={handleDeleteCoursePDF}
              driveLinks={driveLinks}
              onSaveDriveLinks={handleSaveDriveLinks}
            />
          </div>
          
          {/* Floating toggle button for Left Panel */}
          <button
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            className="absolute -right-3.5 top-1/2 -translate-y-1/2 bg-white border border-zinc-200 rounded-full p-1 shadow-md hover:bg-zinc-50 z-50 text-zinc-650 transition-all hover:scale-105 active:scale-95 cursor-pointer no-print flex items-center justify-center w-7 h-7"
            title={leftSidebarOpen ? "Ocultar Biblioteca" : "Mostrar Biblioteca"}
          >
            {leftSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Central interactive sheet canvas area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Printable workspace container */}
          <CanvasArea
            items={projectItems}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            onUpdateItem={handleUpdateItem}
            zoom={zoom}
            showGrid={showGrid}
            showRuler={showRuler}
            snapToGrid={snapToGrid}
            shapeBBoxes={shapeBBoxes}
            onUpdateShapeBBox={handleUpdateShapeBBox}
          />
        </div>

        {/* Right context inspector sidebar with collapsible state */}
        <div className={`transition-all duration-300 flex select-none shrink-0 relative z-30 h-full ${rightSidebarOpen ? 'w-80' : 'w-0'}`}>
          {/* Floating toggle button for Right Panel */}
          <button
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            className="absolute -left-3.5 top-1/2 -translate-y-1/2 bg-white border border-zinc-200 rounded-full p-1 shadow-md hover:bg-zinc-50 z-50 text-zinc-650 transition-all hover:scale-105 active:scale-95 cursor-pointer no-print flex items-center justify-center w-7 h-7"
            title={rightSidebarOpen ? "Ocultar Ajustes" : "Mostrar Ajustes"}
          >
            {rightSidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <div className={`w-80 h-full transition-transform duration-300 ${rightSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <InspectorPanel
              selectedItem={activeItem}
              onUpdateItem={handleUpdateItem}
              onDuplicateItem={handleDuplicateItem}
              onDeleteItem={handleDeleteItem}
              onAlignItem={handleAlignItem}
              onLayerChange={handleLayerChange}
              shapeBBoxes={shapeBBoxes}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
