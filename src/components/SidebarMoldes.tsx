import React, { useState, useEffect } from 'react';
import { 
  Type, Heart, Hash, Layers, Image as ImageIcon, Upload, Plus, Sparkles, 
  Trash2, ArrowRight, FolderDown, RotateCcw, AlertCircle, Calculator, BookOpen, Download, FileText
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
}: SidebarMoldesProps) {
  const [activeTab, setActiveTab] = useState<'moldes' | 'textos' | 'letras' | 'uploads' | 'meus-moldes' | 'calculadora' | 'pack-imagens' | 'pdf-cursos'>('moldes');
  
  // Calculator states
  const [calcMode, setCalcMode] = useState<'medidas' | 'gramas'>('medidas');
  const [pieceShape, setPieceShape] = useState<'rect' | 'circle'>('rect');
  const [rectWidth, setRectWidth] = useState<number>(10);
  const [rectLength, setRectLength] = useState<number>(10);
  const [rectHeight, setRectHeight] = useState<number>(1); // cm
  const [circleDiameter, setCircleDiameter] = useState<number>(10);
  const [circleHeight, setCircleHeight] = useState<number>(1); // cm
  const [totalGrams, setTotalGrams] = useState<number>(12);

  // DB Fetched items for Pack de Imagens and courses/apostilas
  const [packImages, setPackImages] = useState<{ id: string; name: string; url: string; createdAt: string }[]>([]);
  const [pdfCourses, setPdfCourses] = useState<{ id: string; name: string; url: string; createdAt: string }[]>([]);

  useEffect(() => {
    fetch('/api/pack-images')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPackImages(data.packImages || []);
        }
      })
      .catch(err => console.error("Error loading image packs:", err));

    fetch('/api/pdf-courses')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPdfCourses(data.pdfCourses || []);
        }
      })
      .catch(err => console.error("Error loading PDF courses:", err));
  }, [activeTab]); // Refetch when tabs change to always stay updated

  // Categorized shapes
  const categories = Array.from(new Set(LIBRARY_SHAPES.map(s => s.category)));
  const [selectedCategory, setSelectedCategory] = useState<string>('Formatos Geométricos');

  // Text/Word mould state
  const [wordText, setWordText] = useState('RESI');
  const [wordFont, setWordFont] = useState('Bebas Neue');

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

        <div className="border-t border-zinc-200 my-1"></div>

        <button
          onClick={() => setActiveTab('pack-imagens')}
          className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-start gap-1.5 transition-all text-nowrap cursor-pointer w-full ${
            activeTab === 'pack-imagens' ? 'bg-indigo-600 text-white font-extrabold shadow-md' : 'text-zinc-650 hover:text-indigo-600 hover:bg-zinc-100'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Pack de Imagens</span>
          <span className={`ml-auto text-[9px] px-1 py-0.5 rounded ${activeTab === 'pack-imagens' ? 'bg-indigo-550 text-white' : 'bg-indigo-100 text-indigo-600'}`}>HD</span>
        </button>

        <button
          onClick={() => setActiveTab('pdf-cursos')}
          className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-start gap-1.5 transition-all text-nowrap cursor-pointer w-full ${
            activeTab === 'pdf-cursos' ? 'bg-indigo-600 text-white font-extrabold shadow-md' : 'text-zinc-650 hover:text-indigo-600 hover:bg-zinc-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Apostilas / Cursos</span>
        </button>

        <button
          onClick={() => setActiveTab('calculadora')}
          className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-start gap-1.5 transition-all text-nowrap cursor-pointer w-full ${
            activeTab === 'calculadora' ? 'bg-amber-600 text-white font-extrabold shadow-md' : 'bg-amber-50 hover:bg-amber-100 text-amber-805 text-amber-800 border border-amber-200'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Calculadora de Resina</span>
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

        {/* TAB 6: PACK DE IMAGENS */}
        {activeTab === 'pack-imagens' && (
          <div className="space-y-4" id="pane-pack-imagens">
            <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Pack de Imagens Premium</span>
            <p className="text-[10px] text-zinc-500 leading-relaxed pb-1">
              Escolha entre o acervo exclusivo de imagens em alta definição fornecido pela administração. Clique em "Usar no Editor" para carregar ou faça o download de forma avulsa.
            </p>

            <div className="grid grid-cols-1 gap-4 select-none" id="pack-images-sidebar-list">
              {packImages.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 bg-zinc-50 rounded-lg border border-zinc-200 font-mono text-[10px]">
                  Sem imagens no pacote no momento.
                </div>
              ) : (
                packImages.map((img) => (
                  <div
                    key={img.id}
                    className="group bg-white border border-zinc-200 hover:border-indigo-500 rounded-xl p-3 flex flex-col gap-2.5 transition-all text-left relative"
                  >
                    <img 
                      src={img.url} 
                      alt={img.name} 
                      className="w-full h-36 object-cover rounded-lg bg-[#f9fafb] border border-zinc-100" 
                      referrerPolicy="no-referrer"
                    />
                    
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-zinc-800 truncate">{img.name}</h4>
                      <p className="text-[9px] text-zinc-400 font-mono mt-0.5">Disponibilizado para sua conta</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={() => {
                          onUploadImage(img.url);
                        }}
                        className="py-1.5 px-2 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg text-[10px] font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Usar no Editor
                      </button>

                      <a
                        href={img.url}
                        download={`pack-image-${img.id}.png`}
                        className="py-1.5 px-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-750 rounded-lg text-[10px] font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1 border border-zinc-200"
                      >
                        <Download className="w-3 h-3" />
                        Baixar HD
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 7: APOSTILAS / CURSOS */}
        {activeTab === 'pdf-cursos' && (
          <div className="space-y-4" id="pane-pdf-cursos">
            <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Apostilas & Treinamentos</span>
            <p className="text-[10px] text-zinc-500 leading-relaxed pb-1">
              Conteúdos didáticos, materiais de apoio e e-books exclusivos liberados pela administração para apoiar a sua produção profissional:
            </p>

            <div className="space-y-3" id="pdf-courses-sidebar-list">
              {pdfCourses.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 bg-zinc-50 rounded-lg border border-zinc-200 font-mono text-[10px]">
                  Nenhuma apostila disponível para download no momento.
                </div>
              ) : (
                pdfCourses.map((pdf) => (
                  <div
                    key={pdf.id}
                    className="bg-white border border-zinc-200 rounded-xl p-3 flex flex-col gap-2 relative hover:border-indigo-400 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-red-50 border border-red-100 rounded-lg text-red-505 text-red-500 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 pr-2">
                        <h4 className="text-xs font-black text-zinc-800 truncate" title={pdf.name}>{pdf.name}</h4>
                        <p className="text-[9px] text-[#22c55e] font-mono mt-0.5 font-bold uppercase tracking-wider">Download Liberado</p>
                      </div>
                    </div>

                    <a
                      href={pdf.url}
                      download={`${pdf.name}.pdf`}
                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg text-[10px] font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar Apostila (PDF)
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 8: CALCULADORA DE RESINA */}
        {activeTab === 'calculadora' && (
          <div className="space-y-4 text-left font-sans" id="pane-calculadora">
            <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Cálculo de Proporção (Regra 100/50)</span>
            
            <p className="text-[10px] text-zinc-500 leading-relaxed pb-1">
              Calcule as quantidades exatas de Resina e Endurecedor para sua peça. Nosso sistema utiliza as proporções para evitar desperdício de material.
            </p>

            {/* Calculated Screen LCD Header component */}
            <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3.5 text-white flex flex-col gap-3 shadow-inner relative overflow-hidden">
              <div className="absolute top-1.5 right-2 font-mono text-[8px] text-zinc-650 flex items-center gap-1 select-none font-bold">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                SYSTEM RESINA-CALC
              </div>

              {/* Liquid crystal display panel */}
              <div className="bg-[#a3b899] text-zinc-900 font-mono p-3 rounded-lg text-right select-all shadow-inner border border-zinc-800 flex flex-col justify-between h-18 mt-1.5">
                <span className="text-[9px] text-zinc-800 uppercase tracking-widest leading-none font-bold">Massa de Resina + Catalisador (Total)</span>
                <span className="text-xl font-black tracking-tight leading-none text-zinc-[950] font-sans">
                  {calcMode === 'medidas' ? (
                    (() => {
                      const vol = pieceShape === 'rect' 
                        ? (rectWidth * rectLength * rectHeight) 
                        : (Math.PI * Math.pow(circleDiameter / 2, 2) * circleHeight);
                      return `${vol.toFixed(1)} ml`;
                    })()
                  ) : (
                    `${totalGrams.toFixed(1)} g`
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3.5 text-center mt-1">
                <div className="bg-zinc-900/50 rounded-lg p-2.5 border border-zinc-850">
                  <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider">Massa Base Resina (2/3)</span>
                  <p className="text-sm font-bold text-sky-400 font-mono mt-1">
                    {calcMode === 'medidas' ? (
                      (() => {
                        const vol = pieceShape === 'rect' 
                          ? (rectWidth * rectLength * rectHeight) 
                          : (Math.PI * Math.pow(circleDiameter / 2, 2) * circleHeight);
                        return `${(vol * (100 / 150)).toFixed(1)} ml`;
                      })()
                    ) : (
                      `${(totalGrams * (100 / 150)).toFixed(1)} g`
                    )}
                  </p>
                </div>

                <div className="bg-zinc-900/50 rounded-lg p-2.5 border border-zinc-850 hover:border-amber-900/20 transition-all">
                  <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider">Endurecedor (1/3)</span>
                  <p className="text-sm font-bold text-amber-500 font-mono mt-1">
                    {calcMode === 'medidas' ? (
                      (() => {
                        const vol = pieceShape === 'rect' 
                          ? (rectWidth * rectLength * rectHeight) 
                          : (Math.PI * Math.pow(circleDiameter / 2, 2) * circleHeight);
                        return `${(vol * (50 / 150)).toFixed(1)} ml`;
                      })()
                    ) : (
                      `${(totalGrams * (50 / 150)).toFixed(1)} g`
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Selector methods */}
            <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200">
              <button
                type="button"
                onClick={() => setCalcMode('medidas')}
                className={`flex-1 py-1.5 px-2.5 rounded-md text-[10px] font-bold text-center cursor-pointer transition-colors ${calcMode === 'medidas' ? 'bg-white text-indigo-600 shadow-xs' : 'text-zinc-600 hover:text-indigo-650'}`}
              >
                Medidas da Peça (ml)
              </button>
              <button
                type="button"
                onClick={() => setCalcMode('gramas')}
                className={`flex-1 py-1.5 px-2.5 rounded-md text-[10px] font-bold text-center cursor-pointer transition-colors ${calcMode === 'gramas' ? 'bg-white text-indigo-600 shadow-xs' : 'text-zinc-600 hover:text-indigo-650'}`}
              >
                Peso Direto (g)
              </button>
            </div>

            {/* Form Inputs based on calcMode */}
            {calcMode === 'medidas' ? (
              <div className="space-y-3 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 text-left">
                <span className="block text-[9px] uppercase font-mono font-bold text-zinc-500">Tipo de Forma / Molde</span>
                
                <div className="grid grid-cols-2 gap-2 pb-1.5">
                  <button
                    type="button"
                    onClick={() => setPieceShape('rect')}
                    className={`py-1 rounded text-[9px] font-bold text-center cursor-pointer ${pieceShape === 'rect' ? 'bg-indigo-600 border border-indigo-700 text-white shadow-xs' : 'bg-white border border-zinc-200 text-zinc-600'}`}
                  >
                    Quadrado / Retangular
                  </button>
                  <button
                    type="button"
                    onClick={() => setPieceShape('circle')}
                    className={`py-1 rounded text-[9px] font-bold text-center cursor-pointer ${pieceShape === 'circle' ? 'bg-indigo-600 border border-indigo-700 text-white shadow-xs' : 'bg-white border border-zinc-200 text-zinc-600'}`}
                  >
                    Redondo / Molde Redond
                  </button>
                </div>

                {pieceShape === 'rect' ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-mono text-zinc-500 mb-1">Largura (cm)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs outline-none text-zinc-700 font-mono text-center font-bold"
                          value={rectWidth}
                          onChange={(e) => setRectWidth(Math.max(0.1, Number(e.target.value)))}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono text-zinc-500 mb-1">Comprimento (cm)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs outline-none text-zinc-700 font-mono text-center font-bold"
                          value={rectLength}
                          onChange={(e) => setRectLength(Math.max(0.1, Number(e.target.value)))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 mb-1">Grossura / Espessura (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs outline-none text-zinc-700 font-mono text-center font-bold"
                        value={rectHeight}
                        onChange={(e) => setRectHeight(Math.max(0.1, Number(e.target.value)))}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 mb-1">Diâmetro Total (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs outline-none text-zinc-700 font-mono text-center font-bold"
                        value={circleDiameter}
                        onChange={(e) => setCircleDiameter(Math.max(0.1, Number(e.target.value)))}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 mb-1">Grossura / Espessura (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs outline-none text-zinc-700 font-mono text-center font-bold"
                        value={circleHeight}
                        onChange={(e) => setCircleHeight(Math.max(0.1, Number(e.target.value)))}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 text-left">
                <div>
                  <label className="block text-[10px] font-mono uppercase font-black text-zinc-500 mb-1">Quantidade de Gramas Adutoras</label>
                  <p className="text-[9px] text-zinc-500 mb-2 leading-relaxed">Você vai pesar a resina na balança? Insira as gramas totais desejadas:</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      className="flex-1 bg-white border border-zinc-200 rounded-lg p-2.5 text-xs outline-none text-zinc-700 font-mono text-center font-bold"
                      value={totalGrams}
                      onChange={(e) => setTotalGrams(Math.max(1, Number(e.target.value)))}
                    />
                    <span className="text-xs font-mono font-bold text-zinc-500 bg-zinc-150 px-3 py-2 px-3 rounded-lg border border-zinc-200">g</span>
                  </div>
                </div>
              </div>
            )}

            {/* Dica / Amber Rule Tip section */}
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg flex items-start gap-2 text-left">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wider text-amber-900">Importante</span>
                <p className="text-[10px] text-amber-850 mt-0.5 leading-relaxed font-semibold">
                  Primeiro coloque sempre a resina e depois o endurecedor. Misture devagar em movimentos circulares para evitar bolhas.
                </p>
              </div>
            </div>
            
            <p className="text-[9px] text-center text-zinc-400 pt-1 font-mono leading-relaxed">
              *Proporção padrão calculada: 100g de Resina para 50g de Endurecedor (Proporção 2:1).
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
