import React, { useState } from 'react';
import { 
  Type, Heart, Hash, Layers, Image as ImageIcon, Upload, Plus, Sparkles, 
  Trash2, ArrowRight, FolderDown, RotateCcw, AlertCircle, Calculator, 
  Library, BookOpen, Download 
} from 'lucide-react';
import { LIBRARY_SHAPES, LibraryShape } from '../utils/shapeHelper';
import FrameCreator from './FrameCreator';
import { compressImage } from '../utils/imageHelper';

interface SidebarMoldesProps {
  onAddText: (type: 'text' | 'curved-text', initialText?: string) => void;
  onAddMold: (shape: LibraryShape) => void;
  onAddLetterMold: (letter: string) => void;
  onAddNumberMold: (num: string) => void;
  onAddTextMold: (word: string, font: string) => void;
  uploads: string[];
  onUploadImage: (base64: string) => void;
  onSelectUploadForActiveMold: (base64: string) => void;
  activeItemId: string | null;
  activeItemHasMask: boolean;
  customMolds: { id: string; name: string; maskUrl: string }[];
  onAddCustomMoldToPage: (id: string, name: string, maskUrl: string) => void;
  onDeleteCustomMold: (id: string) => void;
  onDeleteUpload: (index: number) => void;
  onAddCustomMold: (name: string, transparentPngDataUrl: string) => void;
  
  // Custom interactive assets
  userEmail: string;
  imagePack: { id: string; name: string; url: string; createdAt: string }[];
  courses: { id: string; name: string; url: string; size?: string; createdAt: string }[];
  onAddImageToPack: (name: string, url: string) => Promise<void>;
  onDeleteImageFromPack: (id: string) => Promise<void>;
  onAddCoursePDF: (name: string, url: string, size?: string) => Promise<void>;
  onDeleteCoursePDF: (id: string) => Promise<void>;
}

const FONTS_LIST = [
  'Inter', 'Space Grotesk', 'Montserrat', 'Bebas Neue', 'Anton', 'Bungee', 
  'Lobster', 'Pacifico', 'Cookie', 'Caveat', 'Comfortaa', 'Fredoka', 
  'Great Vibes', 'Sacramento', 'Permanent Marker', 'Special Elite', 'Unbounded', 'Creepster'
];

export default function SidebarMoldes({
  onAddText,
  onAddMold,
  onAddLetterMold,
  onAddNumberMold,
  onAddTextMold,
  uploads,
  onUploadImage,
  onSelectUploadForActiveMold,
  activeItemId,
  activeItemHasMask,
  customMolds,
  onAddCustomMoldToPage,
  onDeleteCustomMold,
  onDeleteUpload,
  onAddCustomMold,
  userEmail,
  imagePack,
  courses,
  onAddImageToPack,
  onDeleteImageFromPack,
  onAddCoursePDF,
  onDeleteCoursePDF,
}: SidebarMoldesProps) {
  const [activeTab, setActiveTab] = useState<'moldes' | 'textos' | 'letras' | 'uploads' | 'meus-moldes' | 'calculadora' | 'pack-imagens' | 'cursos'>('moldes');
  
  // Categorized shapes
  const categories = Array.from(new Set(LIBRARY_SHAPES.map(s => s.category)));
  const [selectedCategory, setSelectedCategory] = useState<string>('Formatos Geométricos');

  // Text/Word mould state
  const [wordText, setWordText] = useState('RESI');
  const [wordFont, setWordFont] = useState('Bebas Neue');

  // Calculator States
  const [calcMode, setCalcMode] = useState<'weight' | 'dimensions'>('weight');
  const [calcWeightInput, setCalcWeightInput] = useState<number>(12);
  const [calcWidth, setCalcWidth] = useState<number>(50);
  const [calcHeight, setCalcHeight] = useState<number>(50);
  const [calcThickness, setCalcThickness] = useState<number>(4);
  const [calcShape, setCalcShape] = useState<'rect' | 'oval'>('rect');

  // Pack Upload States
  const [packImgName, setPackImgName] = useState('');
  const [isUploadingPack, setIsUploadingPack] = useState(false);

  // PDF Course Upload States
  const [courseName, setCourseName] = useState('');
  const [isUploadingCourse, setIsUploadingCourse] = useState(false);

  // Math conversions
  let calcTotal = 0;
  if (calcMode === 'weight') {
    calcTotal = calcWeightInput;
  } else {
    let volume = 0;
    if (calcShape === 'rect') {
      volume = calcWidth * calcHeight * calcThickness;
    } else {
      volume = Math.PI * (calcWidth / 2) * (calcHeight / 2) * calcThickness;
    }
    calcTotal = volume * 0.0011; // Standard density approximation for craft resin
  }
  const calcResina = (calcTotal * 100) / 150;
  const calcEndurecedor = (calcTotal * 50) / 150;

  // Drag and drop upload helper
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
       const file = files[i];
       const reader = new FileReader();
       reader.onload = () => {
         compressImage(reader.result as string).then((compressedBase64) => {
           onUploadImage(compressedBase64);
         });
       };
       reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = () => {
            compressImage(reader.result as string).then((compressedBase64) => {
              onUploadImage(compressedBase64);
            });
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  return (
    <div className="no-print w-80 bg-white border-r border-zinc-200 flex flex-col h-[calc(100vh-3.5rem)] select-none shrink-0 relative z-30 font-sans">
      
      {/* Category Tabs */}
      <div className="flex flex-col bg-zinc-50 p-2.5 border-b border-zinc-200 shrink-0 gap-1.5" id="sidebar-tabs">
        <button
          onClick={() => setActiveTab('moldes')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-start gap-1.5 transition-all text-nowrap cursor-pointer w-full ${
            activeTab === 'moldes' ? 'bg-white text-indigo-600 font-bold border border-zinc-205 shadow-xs' : 'text-zinc-550 hover:text-indigo-600 hover:bg-zinc-100'
          }`}
        >
          <Heart className="w-3.5 h-3.5 text-indigo-505" />
          Formatos e Moldes
        </button>

        <button
          onClick={() => setActiveTab('letras')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-start gap-1.5 transition-all text-nowrap cursor-pointer w-full ${
            activeTab === 'letras' ? 'bg-white text-indigo-600 font-bold border border-zinc-205 shadow-xs' : 'text-zinc-550 hover:text-indigo-600 hover:bg-zinc-100'
          }`}
        >
          <Hash className="w-3.5 h-3.5 text-indigo-505" />
          Letras e Números
        </button>

        <button
          onClick={() => setActiveTab('textos')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-start gap-1.5 transition-all text-nowrap cursor-pointer w-full ${
            activeTab === 'textos' ? 'bg-white text-indigo-600 font-bold border border-zinc-205 shadow-xs' : 'text-zinc-550 hover:text-indigo-600 hover:bg-zinc-100'
          }`}
        >
          <Type className="w-3.5 h-3.5 text-indigo-505" />
          Textos Decorativos
        </button>

        <button
          onClick={() => setActiveTab('uploads')}
          className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-start gap-1.5 transition-all text-nowrap cursor-pointer w-full relative overflow-hidden ${
            activeTab === 'uploads' 
              ? 'bg-emerald-600 text-white font-extrabold border border-emerald-700 shadow-md scale-[1.02]' 
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs'
          }`}
        >
          <Upload className={`w-3.5 h-3.5 ${activeTab === 'uploads' ? 'text-white' : 'text-emerald-605 text-emerald-600'}`} />
          <span>Fotos / Upload de Estampas</span>
          <span className={`absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${activeTab === 'uploads' ? 'bg-white' : 'bg-emerald-500 animate-ping'}`} />
        </button>

        <button
          onClick={() => setActiveTab('meus-moldes')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-start gap-1.5 transition-all text-nowrap cursor-pointer w-full ${
            activeTab === 'meus-moldes' ? 'bg-white text-indigo-600 font-bold border border-zinc-205 shadow-xs' : 'text-zinc-550 hover:text-indigo-600 hover:bg-zinc-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-indigo-505" />
          Meus Moldes Salvos
        </button>

        {/* New Calculator Tab */}
        <button
          onClick={() => setActiveTab('calculadora')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-start gap-1.5 transition-all text-nowrap cursor-pointer w-full ${
            activeTab === 'calculadora' ? 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200' : 'text-zinc-550 hover:text-indigo-600 hover:bg-zinc-100'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-teal-605" />
          Calculadora de Resina
        </button>

        {/* New Premium Image Pack Tab */}
        <button
          onClick={() => setActiveTab('pack-imagens')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-start gap-1.5 transition-all text-nowrap cursor-pointer w-full ${
            activeTab === 'pack-imagens' ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-805 border border-indigo-200' : 'text-zinc-550 hover:text-indigo-600 hover:bg-zinc-100'
          }`}
        >
          <Library className="w-3.5 h-3.5 text-indigo-505" />
          Pack de Imagens Premium
        </button>

        {/* New Courses/Handouts PDF Tab */}
        <button
          onClick={() => setActiveTab('cursos')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-start gap-1.5 transition-all text-nowrap cursor-pointer w-full ${
            activeTab === 'cursos' ? 'bg-amber-50 hover:bg-amber-100 text-amber-805 border border-amber-200' : 'text-zinc-550 hover:text-indigo-600 hover:bg-zinc-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-605" />
          Cursos e Apostilas (PDF)
        </button>
      </div>

      {/* Pane Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white">
        
        {/* TAB 1: MOLDES / FORMATOS */}
        {activeTab === 'moldes' && (
          <div className="space-y-4" id="pane-moldes">
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-2">Categoria</label>
              <div className="grid grid-cols-2 gap-1.5 bg-zinc-50 p-1.5 rounded-xl border border-zinc-200">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg truncate text-center cursor-pointer transition-all ${
                      selectedCategory === cat 
                        ? 'bg-indigo-600 text-white shadow font-bold' 
                        : 'text-zinc-600 hover:text-zinc-800 hover:bg-zinc-150'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-3">Selecione para Inserir na Folha A4:</span>
              <div className="grid grid-cols-2 gap-3" id="moldes-list">
                {LIBRARY_SHAPES.filter(s => s.category === selectedCategory).map((shape) => (
                  <button
                    id={`mold-item-${shape.id}`}
                    key={shape.id}
                    onClick={() => onAddMold(shape)}
                    className="group bg-zinc-50 hover:bg-white border border-zinc-200 hover:border-indigo-500 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-102 transform duration-200 hover:shadow-md"
                  >
                    <div className="w-16 h-16 rounded-lg bg-white flex items-center justify-center mb-2.5 group-hover:bg-indigo-50 transition-colors border border-zinc-100">
                      <svg 
                        viewBox="0 0 100 100" 
                        className="w-12 h-12 text-zinc-500 group-hover:text-indigo-600 drop-shadow transition-colors"
                        dangerouslySetInnerHTML={{ __html: shape.svgMarkup }}
                        fill="currentColor"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-700 group-hover:text-indigo-650 truncate max-w-full">
                      {shape.name}
                    </span>
                    <span className="text-[9px] text-zinc-450 mt-0.5">
                      {shape.defaultWidth} x {shape.defaultHeight} mm
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LETRAS E NUMEROS VAZADOS */}
        {activeTab === 'letras' && (
          <div className="space-y-5" id="pane-letras">
            {/* Word to Frame Converter - disabled/hidden for now */}
            {false && (
              <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-xl space-y-3.5 relative">
                <div className="absolute top-1 right-2 text-[8px] bg-pink-100 border border-pink-250 text-pink-700 font-bold px-1.5 rounded">
                  Destaque
                </div>
                <h4 className="text-[11px] font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-600" />
                  Criar Mold de Palavra / Nome
                </h4>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  Escreva um nome inteiro. Nós o transformaremos em um molde para colocar uma foto dentro!
                </p>

                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Escreva o Nome</label>
                  <input
                    id="word-name-mold-input"
                    type="text"
                    maxLength={12}
                    className="w-full bg-white border border-zinc-200 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 uppercase font-extrabold text-center spacing-wide tracking-wider outline-none"
                    value={wordText}
                    onChange={(e) => setWordText(e.target.value.toUpperCase())}
                    placeholder="EX: LUIZA"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Escolha a Fonte</label>
                  <select
                    id="word-font-mold-select"
                    className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-700 outline-none focus:border-indigo-500 cursor-pointer font-semibold"
                    style={{ fontFamily: wordFont }}
                    value={wordFont}
                    onChange={(e) => setWordFont(e.target.value)}
                  >
                    {FONTS_LIST.map(f => (
                      <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                    ))}
                  </select>
                </div>

                <button
                  id="create-word-mold-btn"
                  onClick={() => onAddTextMold(wordText, wordFont)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-550 hover:to-pink-550 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                >
                  Gerar Molde "{wordText}" <ArrowRight className="w-3 h-3 ml-0.5" />
                </button>
              </div>
            )}

            {/* Individual A-Z Letters */}
            <div>
              <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-2.5">Letras Vazadas (A - Z):</span>
              <div className="grid grid-cols-4 gap-1.5 bg-zinc-50 p-2.5 border border-zinc-200 rounded-xl" id="alphabet-list">
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                  <button
                    id={`letter-mold-${letter}`}
                    key={letter}
                    onClick={() => onAddLetterMold(letter)}
                    className="aspect-square bg-white border border-zinc-200 hover:border-indigo-500 hover:bg-indigo-50 font-black rounded-lg text-sm text-zinc-750 hover:text-indigo-600 flex items-center justify-center transition-all hover:scale-105 cursor-pointer font-sans shadow-xs"
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>

            {/* Individual 0-9 Numbers */}
            <div>
              <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-2.5">Números Vazados (0 - 9):</span>
              <div className="grid grid-cols-5 gap-1.5 bg-zinc-50 p-2.5 border border-zinc-200 rounded-xl" id="number-list">
                {'0123456789'.split('').map(num => (
                  <button
                    id={`number-mold-${num}`}
                    key={num}
                    onClick={() => onAddNumberMold(num)}
                    className="aspect-square bg-white border border-zinc-200 hover:border-indigo-500 hover:bg-indigo-50 font-black rounded-lg text-sm text-zinc-750 hover:text-indigo-600 flex items-center justify-center transition-all hover:scale-105 cursor-pointer font-sans shadow-xs"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TEXTOS */}
        {activeTab === 'textos' && (
          <div className="space-y-4" id="pane-textos">
            <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Inserir Texto Decorativo:</span>
            <p className="text-[10px] text-zinc-500 leading-relaxed max-w-full">
              Ideal para nomes, datas ou dedicatórias sob e sobre os chaveiros.
            </p>

            <button
              id="add-simple-text-btn"
              onClick={() => onAddText('text')}
              className="w-full bg-zinc-50 border border-zinc-200 hover:border-indigo-400 hover:bg-white p-3.5 rounded-xl flex items-center justify-between group transition-all cursor-pointer text-left shadow-xs"
            >
              <div>
                <span className="font-bold text-xs text-zinc-800 group-hover:text-indigo-600 block transition-colors">Texto Reto</span>
                <span className="text-[9px] text-zinc-450 mt-0.5 block">Nome, número ou frase comum</span>
              </div>
              <Plus className="w-4 h-4 text-zinc-400 group-hover:text-indigo-600 transition-colors" />
            </button>

            <button
              id="add-curved-text-btn"
              onClick={() => onAddText('curved-text')}
              className="w-full bg-zinc-50 border border-zinc-200 hover:border-indigo-400 hover:bg-white p-3.5 rounded-xl flex items-center justify-between group transition-all cursor-pointer text-left shadow-xs"
            >
              <div>
                <span className="font-bold text-xs text-zinc-800 group-hover:text-indigo-600 block transition-colors">Texto Curvado / Arqueado</span>
                <span className="text-[9px] text-zinc-450 mt-0.5 block">Perfeito para moldes redondos</span>
              </div>
              <Plus className="w-4 h-4 text-zinc-400 group-hover:text-indigo-600 transition-colors" />
            </button>
          </div>
        )}

        {/* TAB 4: UPLOADS DE FOTOS */}
        {activeTab === 'uploads' && (
          <div className="space-y-4" id="pane-uploads">
            <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Upload de Imagens</span>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Carregue suas estampas, fotos, logos ou fundos decorados.
            </p>

            {/* Drag Area */}
            <div
              id="dropzone-area"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                dragActive 
                  ? 'border-indigo-500 bg-indigo-50/20' 
                  : 'border-zinc-300 hover:border-indigo-400 bg-zinc-50'
              }`}
            >
              <ImageIcon className="w-8 h-8 text-zinc-400 mb-2.5" />
              <span className="text-[11px] font-bold text-zinc-700">Arraste fotos aqui</span>
              <span className="text-[9px] text-zinc-450 mt-1">ou selecione do aparelho</span>
              
              <input
                id="file-upload-input"
                type="file"
                multiple
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileUpload}
              />
            </div>

            {/* Uploaded images display */}
            <div>
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-zinc-200">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500">Imagens Carregadas ({uploads.length})</span>
                {uploads.length > 0 && <span className="text-[9px] text-indigo-600 font-bold">Arraste para o canvas</span>}
              </div>

              {activeItemId && activeItemHasMask && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-start gap-1.5 text-emerald-700 text-[10px] mb-3">
                  <AlertCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Molde selecionado!</strong> Arraste uma foto ou clique nela para preencher o molde.
                  </span>
                </div>
              )}

              {uploads.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 bg-zinc-50 rounded-lg border border-zinc-200 font-mono text-[10px]">
                  Nenhuma imagem carregada ainda.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2" id="uploads-grid">
                  {uploads.map((b64, idx) => (
                    <div 
                      key={idx} 
                      draggable 
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", b64);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      className="group relative aspect-square bg-white rounded-lg border border-zinc-200 overflow-hidden hover:border-indigo-500 transition-all cursor-grab active:cursor-grabbing"
                    >
                      <button
                        onClick={() => {
                          onSelectUploadForActiveMold(b64);
                        }}
                        className="w-full h-full p-1 cursor-pointer"
                        title="Inserir ou aplicar imagem"
                      >
                        <img 
                          src={b64} 
                          alt="Upload" 
                          className="w-full h-full object-contain rounded" 
                          referrerPolicy="no-referrer"
                        />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Deletar imagem do histórico?')) {
                            onDeleteUpload(idx);
                          }
                        }}
                        className="absolute bottom-1 right-1 p-1 bg-black/80 rounded hover:bg-red-650 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Remover"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: MEUS MOLDES (CUSTOMIZADOS) */}
        {activeTab === 'meus-moldes' && (
          <div className="space-y-4" id="pane-meus-moldes">
            <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Moldes Personalizados</span>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Insira e remova os moldes transparentes criados na ferramenta "PNG para Frame".
            </p>

            {customMolds.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 bg-zinc-50 rounded-lg border border-zinc-200 font-mono text-[10px]">
                Nenhum molde personalizado cadastrado. Use a ferramenta abaixo em destaque para criar o seu!
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3" id="custom-molds-list">
                {customMolds.map((m) => (
                  <div
                    key={m.id}
                    className="group bg-zinc-50 border border-zinc-200 hover:border-indigo-500 rounded-xl p-2.5 flex flex-col items-center justify-center text-center transition-all relative"
                  >
                    <button
                      onClick={() => onAddCustomMoldToPage(m.id, m.name, m.maskUrl)}
                      className="w-full flex flex-col items-center cursor-pointer"
                    >
                      <div className="w-14 h-14 rounded-lg bg-white p-1 flex items-center justify-center mb-2.5 group-hover:bg-indigo-50 transition-colors border border-zinc-100">
                        <img 
                          src={m.maskUrl} 
                          alt={m.name} 
                          className="max-w-full max-h-full object-contain opacity-70 group-hover:opacity-100 transition-all text-zinc-650" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-[9px] font-bold text-zinc-700 group-hover:text-indigo-600 truncate max-w-full block">
                        {m.name}
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Excluir o molde "${m.name}" permanentemente?`)) {
                          onDeleteCustomMold(m.id);
                        }
                      }}
                      className="absolute top-1.5 right-1.5 p-1 bg-white hover:bg-red-50 rounded border border-zinc-100 hover:text-red-650 text-zinc-400 transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* HIGH PROFILE HIGHLIGHTED CUSTOM MOLD MAKER EMBED */}
            <div className="pt-4 border-t border-zinc-200 mt-6">
              <FrameCreator onAddCustomMold={onAddCustomMold} />
            </div>
          </div>
        )}

        {/* TAB 6: CALCULADORA DE RESINAS (100:50 RULE) */}
        {activeTab === 'calculadora' && (
          <div className="space-y-4" id="pane-calculadora">
            <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Calculadora de Resina & Endurecedor</span>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Calcule as quantidades exatas baseando-se na regra de proporção <strong>100:50</strong> (2 partes de resina para 1 parte de endurecedor).
            </p>

            {/* Glass-style Interactive Digital Calculator Tool */}
            <div className="bg-zinc-900 border border-zinc-800 text-emerald-400 p-4 rounded-2xl font-mono text-center shadow-lg relative overflow-hidden select-none">
              {/* Internal decorative elements to look like a screen */}
              <div className="absolute top-2 right-3 text-[7px] text-zinc-600 uppercase tracking-widest font-sans">REGRA 100g / 50g</div>
              <div className="text-[8px] text-zinc-500 uppercase text-left tracking-wider mb-1 font-sans">Mistura Estimada Total:</div>
              <div className="text-3xl font-extrabold tracking-tight bg-zinc-950 border border-zinc-800 p-3 rounded-xl w-full mb-3 text-right text-emerald-400 shadow-inner">
                {Number(calcTotal).toFixed(1)} <span className="text-xs text-zinc-500 font-sans">g</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-left font-sans">
                <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-850">
                  <div className="text-zinc-500 text-[8px] uppercase tracking-wider font-bold">Resina (100)</div>
                  <div className="text-emerald-300 font-extrabold text-sm mt-0.5">{Number(calcResina).toFixed(1)} g</div>
                </div>
                <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-850">
                  <div className="text-zinc-500 text-[8px] uppercase tracking-wider font-bold">Endurecedor (50)</div>
                  <div className="text-teal-300 font-extrabold text-sm mt-0.5">{Number(calcEndurecedor).toFixed(1)} g</div>
                </div>
              </div>
            </div>

            {/* Input Selection Panels */}
            <div className="space-y-3 pt-2">
              <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200">
                <button
                  onClick={() => setCalcMode('weight')}
                  className={`flex-1 text-[10px] py-1.5 font-bold rounded-lg cursor-pointer transition-all ${
                    calcMode === 'weight' ? 'bg-white text-indigo-650 shadow font-bold' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Por Peso Total
                </button>
                <button
                  onClick={() => setCalcMode('dimensions')}
                  className={`flex-1 text-[10px] py-1.5 font-bold rounded-lg cursor-pointer transition-all ${
                    calcMode === 'dimensions' ? 'bg-white text-indigo-650 shadow font-bold' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Por Tamanho da Peça
                </button>
              </div>

              {calcMode === 'weight' ? (
                <div className="bg-zinc-50 p-3 border border-zinc-200 rounded-xl">
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Insira o Peso Total Desejado (Gramos):</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      className="w-full bg-white border border-zinc-200 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 font-bold outline-none"
                      value={calcWeightInput || ''}
                      onChange={(e) => setCalcWeightInput(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="Ex: 12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px] font-mono">g</span>
                  </div>
                  <span className="block text-[9px] text-zinc-450 mt-1.5">Estime o peso total baseado na peça inteira (ex: chaveiro tem 12g).</span>
                </div>
              ) : (
                <div className="space-y-2.5 bg-zinc-50 p-3 border border-zinc-200 rounded-xl">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] font-bold text-zinc-505 uppercase tracking-wider mb-1">Largura (mm)</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs text-zinc-805"
                        value={calcWidth || ''}
                        onChange={(e) => setCalcWidth(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="Largura em mm"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-zinc-505 uppercase tracking-wider mb-1">Altura / Compr. (mm)</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs text-zinc-805"
                        value={calcHeight || ''}
                        onChange={(e) => setCalcHeight(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="Altura em mm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] font-bold text-zinc-505 uppercase tracking-wider mb-1">Espessura (mm)</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs text-zinc-805"
                        value={calcThickness || ''}
                        onChange={(e) => setCalcThickness(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="Ex: 4"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-zinc-505 uppercase tracking-wider mb-1">Estilo do Molde</label>
                      <select
                        className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs text-zinc-705 cursor-pointer"
                        value={calcShape}
                        onChange={(e) => setCalcShape(e.target.value as 'rect' | 'oval')}
                      >
                        <option value="rect">Retangular / Quadrado</option>
                        <option value="oval">Círculo / Oval</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Tips Section */}
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 space-y-1.5 mt-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Dica Essencial de Resinagem
                </span>
                <p className="text-[10.5px] leading-relaxed font-semibold">
                  Primeiro coloque sempre a resina e depois o endurecedor!
                </p>
                <p className="text-[9.5px] text-amber-800 leading-relaxed">
                  Colocar a resina primeiro e depois o endurecedor previne o acúmulo de sobras nas bordas e garante uma catálise perfeitamente lisa e sem estrias na cura.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: PREMIUM IMAGE PACK FOR KEYCHAINS */}
        {activeTab === 'pack-imagens' && (
          <div className="space-y-4" id="pane-pack-imagens">
            <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Pack de Imagens Premium</span>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Arraste ou clique nessas estampas profissionais de alta definição em alta qualidade para usá-las em seus chaveiros!
            </p>

            {/* ADMIN-ONLY UPLOADER INSIDE ACCOUNTS (NOT ADMIN CONSOLE OVERLAY) */}
            {userEmail === 'admin123@resina.com' && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 space-y-3">
                <h4 className="text-[10px] uppercase tracking-wider font-bold text-indigo-900 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-700 animate-pulse" />
                  Upload de Estampa (Fácil Admin)
                </h4>
                
                <div>
                  <label className="block text-[8.5px] font-bold text-zinc-550 uppercase tracking-widest mb-1">Título da Estampa</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs text-zinc-800 outline-none"
                    value={packImgName}
                    onChange={(e) => setPackImgName(e.target.value)}
                    placeholder="Ex: Fundo Glitter Azul"
                  />
                </div>

                <div>
                  <label className="block text-[8.5px] font-bold text-zinc-550 uppercase tracking-widest mb-1">Selecione Arquivo de Imagem</label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingPack}
                    className="text-xs text-zinc-600 block w-full file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-750 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!packImgName.trim()) {
                        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                        setPackImgName(baseName);
                      }
                      setIsUploadingPack(true);
                      const reader = new FileReader();
                      reader.onload = () => {
                        compressImage(reader.result as string).then((compressed) => {
                          onAddImageToPack(packImgName || 'Estampa Premium', compressed)
                            .then(() => {
                              alert('Estampa adicionada ao Pack Premium com sucesso!');
                              setPackImgName('');
                            })
                            .catch(err => {
                              alert(`Erro ao fazer upload: ${err.message || err}`);
                            })
                            .finally(() => {
                              setIsUploadingPack(false);
                            });
                        });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>
              </div>
            )}

            {/* User feed grid */}
            <div>
              {activeItemId && activeItemHasMask && (
                <div className="bg-emerald-50 border border-emerald-250 rounded-lg p-2 flex items-start gap-1.5 text-emerald-800 text-[9.5px] mb-3">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span>Clique na foto abaixo para preencher seu molde selecionado.</span>
                </div>
              )}

              {imagePack.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 bg-zinc-50 rounded-xl border border-zinc-200 font-mono text-[9px]">
                  Nenhum item adicionado ao Pack ainda.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5" id="premium-pack-grid">
                  {imagePack.map((img) => (
                    <div
                      key={img.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", img.url);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      className="group relative aspect-square bg-white rounded-xl border border-zinc-200 overflow-hidden hover:border-indigo-500 transition-all cursor-grab active:cursor-grabbing hover:shadow shadow-xs"
                    >
                      <button
                        onClick={() => onSelectUploadForActiveMold(img.url)}
                        className="w-full h-full p-0.5 cursor-pointer text-center flex flex-col justify-between"
                        title="Aplicar estampa ao molde ativo"
                      >
                        <div className="flex-1 w-full h-full overflow-hidden flex items-center justify-center bg-zinc-50">
                          <img 
                            src={img.url} 
                            alt={img.name} 
                            className="max-w-full max-h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="bg-black/40 text-white text-[8.5px] font-bold py-1 w-full truncate absolute bottom-0">
                          {img.name}
                        </div>
                      </button>

                      {userEmail === 'admin123@resina.com' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Excluir estampa "${img.name}" do pack?`)) {
                              onDeleteImageFromPack(img.id)
                                .then(() => alert('Excluído do pack!'))
                                .catch(err => alert('Erro: ' + err.message));
                            }
                          }}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded shadow hover:bg-red-700 cursor-pointer"
                          title="Remover do pack"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 8: COURSES AND HANDOUTS OF THE PRODUCT */}
        {activeTab === 'cursos' && (
          <div className="space-y-4" id="pane-cursos">
            <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Apostilas e Cursos (PDF)</span>
            <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">
              Acesse aqui todo o material de estudo, e-books e cursos completos em formato PDF prontos para download!
            </p>

            {/* ADMIN PDF UPLOADER FORM (ACCOUNTS) */}
            {userEmail === 'admin123@resina.com' && (
              <div className="bg-amber-50 border border-amber-250 rounded-xl p-3.5 space-y-3">
                <h4 className="text-[10px] uppercase tracking-wider font-bold text-amber-900 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                  Adicionar E-book / Curso PDF
                </h4>

                <div>
                  <label className="block text-[8.5px] font-bold text-zinc-550 uppercase tracking-widest mb-1">Nome do Arquivo PDF</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-amber-200 rounded-lg px-2 py-1 text-xs text-zinc-800 outline-none"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="Ex: Manual do Chaveiro Perfeito"
                  />
                </div>

                <div>
                  <label className="block text-[8.5px] font-bold text-zinc-550 uppercase tracking-widest mb-1">Selecione o arquivo (.pdf)</label>
                  <input
                    type="file"
                    accept=".pdf"
                    disabled={isUploadingCourse}
                    className="text-xs text-zinc-650 block w-full file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-700 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!courseName.trim()) {
                        const cleanNodeName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                        setCourseName(cleanNodeName);
                      }
                      
                      const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + " MB";
                      setIsUploadingCourse(true);
                      
                      const reader = new FileReader();
                      reader.onload = () => {
                        const rawData = reader.result as string;
                        onAddCoursePDF(courseName || 'E-book de Resina', rawData, sizeFormatted)
                          .then(() => {
                            alert('Apostila PDF cadastrada com sucesso!');
                            setCourseName('');
                          })
                          .catch((err) => {
                            alert(`Falha no upload do PDF: ${err.message || err}`);
                          })
                          .finally(() => {
                            setIsUploadingCourse(false);
                          });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Courses items rendering */}
            <div className="space-y-3" id="courses-docs-list">
              {courses.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 bg-zinc-50 rounded-xl border border-zinc-200 font-mono text-[9px]">
                  Nenhuma apostila cadastrada ainda.
                </div>
              ) : (
                courses.map((doc) => (
                  <div 
                    key={doc.id}
                    className="p-3 bg-zinc-50 hover:bg-white border border-zinc-200 hover:border-amber-400 rounded-xl flex items-center justify-between gap-3 transition-all hover:shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 border border-amber-200">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10.5px] font-bold text-zinc-700 truncate" title={doc.name}>
                          {doc.name}
                        </span>
                        <span className="block text-[9px] text-zinc-450 font-mono uppercase mt-0.5">
                          PDF • {doc.size || '1.1 MB'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={doc.url}
                        download={`${doc.name}.pdf`}
                        className="p-1 px-2.5 bg-zinc-150 hover:bg-indigo-600 hover:text-white rounded-lg text-zinc-700 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 border border-zinc-200 shadow-sm"
                        title="Dê DOWNLOAD da aula / apostila"
                      >
                        <Download className="w-3 h-3" />
                        Baixar
                      </a>

                      {userEmail === 'admin123@resina.com' && (
                        <button
                          onClick={() => {
                            if (confirm(`Excluir documento "${doc.name}"?`)) {
                              onDeleteCoursePDF(doc.id)
                                .then(() => alert('Excluído!'))
                                .catch(err => alert('Erro: ' + err.message));
                            }
                          }}
                          className="p-1.5 bg-red-50 hover:bg-red-650 hover:text-white text-red-650 rounded-lg border border-red-100 transition-colors cursor-pointer"
                          title="Remover apostila"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
