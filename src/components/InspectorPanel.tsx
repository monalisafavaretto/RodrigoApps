import React from 'react';
import { 
  Trash2, Copy, Combine, ChevronUp, ChevronDown, Lock, Unlock, 
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Sparkles, 
  FlipHorizontal, FlipVertical, Move, RefreshCw, Layers, Sliders, CheckSquare,
  Type, ImageIcon
} from 'lucide-react';
import { EditorItem } from '../types';

interface InspectorPanelProps {
  selectedItem: EditorItem | null;
  onUpdateItem: (updated: EditorItem) => void;
  onDuplicateItem: (item: EditorItem) => void;
  onDeleteItem: (id: string) => void;
  onAlignItem: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onLayerChange: (direction: 'front' | 'back') => void;
  shapeBBoxes: Record<string, { x: number; y: number; width: number; height: number }>;
}

const FONTS_LIST = [
  'Inter', 'Space Grotesk', 'Montserrat', 'Bebas Neue', 'Anton', 'Bungee', 
  'Lobster', 'Pacifico', 'Cookie', 'Caveat', 'Comfortaa', 'Fredoka', 
  'Great Vibes', 'Sacramento', 'Permanent Marker', 'Special Elite', 'Unbounded', 'Creepster'
];

export default function InspectorPanel({
  selectedItem,
  onUpdateItem,
  onDuplicateItem,
  onDeleteItem,
  onAlignItem,
  onLayerChange,
  shapeBBoxes,
}: InspectorPanelProps) {
  if (!selectedItem) {
    return (
      <div className="no-print w-80 bg-white border-l border-zinc-200 p-6 flex flex-col justify-center items-center text-center h-[calc(100vh-3.5rem)] select-none shrink-0 text-zinc-500">
        <Combine className="w-12 h-12 text-zinc-300 mb-4 stroke-1" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-650">Nenhum Item Selecionado</h3>
        <p className="text-[10px] text-zinc-455 max-w-[200px] mt-2 leading-relaxed">
          Selecione uma letra, molde ou texto decorativo na folha A4 para ajustar tamanho, rotação, espelhamento e imagens.
        </p>
      </div>
    );
  }

  const isLocked = selectedItem.isLocked;

  // Retrieve custom geometry subset bounding box
  const bbox = shapeBBoxes[selectedItem.id] || { x: 0, y: 0, width: 100, height: 100 };
  const hScale = (bbox.width || 100) / 100;
  const vScale = (bbox.height || 100) / 100;
  const xOffsetScale = bbox.x / 100;
  const yOffsetScale = bbox.y / 100;

  // Actual mold dimensions
  const moldWidth = selectedItem.width * hScale;
  const moldHeight = selectedItem.height * vScale;
  const moldX = selectedItem.x + selectedItem.width * xOffsetScale;
  const moldY = selectedItem.y + selectedItem.height * yOffsetScale;

  // Position & Dimension changes in mm
  const handleChangeDimension = (field: 'width' | 'height' | 'x' | 'y', val: number) => {
    if (isNaN(val)) return;
    const updated = { ...selectedItem };
    
    if (field === 'width') {
      updated.width = val / hScale;
    } else if (field === 'height') {
      updated.height = val / vScale;
    } else if (field === 'x') {
      const newOuterX = val - selectedItem.width * xOffsetScale;
      updated.x = newOuterX;
    } else if (field === 'y') {
      const newOuterY = val - selectedItem.height * yOffsetScale;
      updated.y = newOuterY;
    }
    onUpdateItem(updated);
  };

  const handleToggleLock = () => {
    onUpdateItem({ ...selectedItem, isLocked: !selectedItem.isLocked });
  };

  const handleToggleMirror = (type: 'h' | 'v') => {
    if (type === 'h') {
      onUpdateItem({ ...selectedItem, mirrorH: !selectedItem.mirrorH });
    } else {
      onUpdateItem({ ...selectedItem, mirrorV: !selectedItem.mirrorV });
    }
  };

  // Internal image adjustment triggers
  const handleUpdateImageSettings = (fields: Partial<Pick<EditorItem, 'imgScale' | 'imgOffsetX' | 'imgOffsetY' | 'imgRotation' | 'imgMirrorH' | 'imgMirrorV'>>) => {
    onUpdateItem({
      ...selectedItem,
      ...fields
    });
  };

  const handleAutofillImage = () => {
    // Fill bounds logic
    onUpdateItem({
      ...selectedItem,
      imgScale: 1.2,
      imgOffsetX: 0,
      imgOffsetY: 0,
      imgRotation: 0,
    });
  };

  const handleClearImage = () => {
    onUpdateItem({
      ...selectedItem,
      imgSrc: null
    });
  };

  return (
    <div className="no-print w-80 bg-white border-l border-zinc-200 flex flex-col h-[calc(100vh-3.5rem)] select-none shrink-0 text-zinc-700 font-sans z-30">
      
      {/* Title */}
      <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
        <div>
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-650">Propriedades</span>
          <h3 className="text-xs font-bold text-zinc-805 uppercase truncate max-w-[150px]" title={selectedItem.name}>
            {selectedItem.name}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDuplicateItem(selectedItem)}
            className="p-1.5 hover:bg-zinc-150 text-zinc-500 hover:text-indigo-650 rounded-lg transition-colors cursor-pointer"
            title="Duplicar Item (Ctrl+C e depois Ctrl+V)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteItem(selectedItem.id)}
            className="p-1.5 hover:bg-rose-50 text-zinc-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
            title="Excluir Item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar font-sans text-xs">
        
        {/* Aspect and Lock State Indicator */}
        {isLocked && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2.5 flex items-center gap-2 text-[10px]">
            <Lock className="w-4 h-4 shrink-0 pointer-events-none text-amber-600" />
            <span>Este item está travado! Destrave para movimentá-lo ou redimensionar.</span>
          </div>
        )}

        {/* DIMENSOES E POSICIONAMENTO */}
        <div className="space-y-3">
          <h4 className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            Dimensões na Folha (A4)
          </h4>
          
          <div className="grid grid-cols-2 gap-3" id="inspector-dimensions">
            {/* Width */}
            <div>
              <label className="block text-[9px] text-zinc-550 uppercase tracking-widest mb-1.5 font-bold">Largura (mm)</label>
              <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-1.5 focus-within:bg-white focus-within:border-indigo-505 transition-all">
                <input
                  id="width-input-mm"
                  disabled={isLocked}
                  type="number"
                  min="2"
                  max="210"
                  step="0.5"
                  className="w-full bg-transparent text-zinc-800 focus:outline-none font-bold text-xs disabled:text-zinc-400"
                  value={Math.round(moldWidth * 10) / 10}
                  onChange={(e) => handleChangeDimension('width', parseFloat(e.target.value))}
                />
                <span className="text-[9px] font-mono text-zinc-400">mm</span>
              </div>
              <span className="text-[9px] font-mono text-zinc-400 pl-1 font-semibold">
                ({(moldWidth / 10).toFixed(2)} cm)
              </span>
            </div>

            {/* Height */}
            <div>
              <label className="block text-[9px] text-zinc-550 uppercase tracking-widest mb-1.5 font-bold">Altura (mm)</label>
              <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-1.5 focus-within:bg-white focus-within:border-indigo-505 transition-all">
                <input
                  id="height-input-mm"
                  disabled={isLocked}
                  type="number"
                  min="2"
                  max="297"
                  step="0.5"
                  className="w-full bg-transparent text-zinc-800 focus:outline-none font-bold text-xs disabled:text-zinc-400"
                  value={Math.round(moldHeight * 10) / 10}
                  onChange={(e) => handleChangeDimension('height', parseFloat(e.target.value))}
                />
                <span className="text-[9px] font-mono text-zinc-400">mm</span>
              </div>
              <span className="text-[9px] font-mono text-zinc-400 pl-1 font-semibold">
                ({(moldHeight / 10).toFixed(2)} cm)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3" id="inspector-coordinates">
            {/* Position X */}
            <div>
              <label className="block text-[9px] text-zinc-550 uppercase tracking-widest mb-1.5 font-bold">Posição X (cm)</label>
              <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-1.5 focus-within:bg-white focus-within:border-indigo-505 transition-all">
                <input
                  id="x-input"
                  disabled={isLocked}
                  type="number"
                  step="0.1"
                  className="w-full bg-transparent text-zinc-800 focus:outline-none font-bold text-xs disabled:text-zinc-400"
                  value={Math.round((moldX / 10) * 10) / 10}
                  onChange={(e) => handleChangeDimension('x', parseFloat(e.target.value) * 10)}
                />
                <span className="text-[9px] font-mono text-zinc-400">cm</span>
              </div>
            </div>

            {/* Position Y */}
            <div>
              <label className="block text-[9px] text-zinc-550 uppercase tracking-widest mb-1.5 font-bold">Posição Y (cm)</label>
              <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-1.5 focus-within:bg-white focus-within:border-indigo-505 transition-all">
                <input
                  id="y-input"
                  disabled={isLocked}
                  type="number"
                  step="0.1"
                  className="w-full bg-transparent text-zinc-800 focus:outline-none font-bold text-xs disabled:text-zinc-400"
                  value={Math.round((moldY / 10) * 10) / 10}
                  onChange={(e) => handleChangeDimension('y', parseFloat(e.target.value) * 10)}
                />
                <span className="text-[9px] font-mono text-zinc-400">cm</span>
              </div>
            </div>
          </div>

          {/* Boundaries warning */}
          {(moldX < 0 || moldY < 0 || moldX + moldWidth > 210 || moldY + moldHeight > 297) && (
            <div className="text-[9px] text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-lg leading-relaxed duration-300 font-semibold shadow-xs">
              ⚠️ Alerta: Este item excedeu a margem imprimível da folha A4. Ele pode ser recortado ao imprimir.
            </div>
          )}
        </div>

        {/* ROTACAO E ESPELHAMENTO DO OBJETO INTEIRO */}
        <div className="space-y-3 pt-3 border-t border-zinc-200">
          <h4 className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Rotação & Espelho</h4>
          
          <div className="space-y-1.5">
            <div className="flex justify-between text-[9px] text-zinc-500 font-mono mb-1 font-semibold">
              <span>Girar Objeto</span>
              <span>{selectedItem.rotation}°</span>
            </div>
            
            <input
              id="rotation-slider"
              disabled={isLocked}
              type="range"
              min="-180"
              max="180"
              step="5"
              className="w-full accent-indigo-650 h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
              value={selectedItem.rotation}
              onChange={(e) => onUpdateItem({ ...selectedItem, rotation: parseInt(e.target.value) })}
            />
          </div>

          <div className="flex gap-2 pt-1" id="mirror-object-btns">
            <button
              id="mirror-h-btn"
              disabled={isLocked}
              onClick={() => handleToggleMirror('h')}
              className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                selectedItem.mirrorH 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                  : 'bg-zinc-50 border-zinc-200 text-zinc-650 hover:text-zinc-800 hover:bg-zinc-100'
              }`}
              title="Espelhar horizontalmente (ideal para resinas poured-in moldes)"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              Espelhar H
            </button>
            <button
              id="mirror-v-btn"
              disabled={isLocked}
              onClick={() => handleToggleMirror('v')}
              className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                selectedItem.mirrorV
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                  : 'bg-zinc-50 border-zinc-200 text-zinc-650 hover:text-zinc-800 hover:bg-zinc-100'
              }`}
            >
              <FlipVertical className="w-3.5 h-3.5" />
              Espelhar V
            </button>
          </div>
        </div>

        {/* AJUSTES SE FOR MOLD / MASCARA */}
        {(selectedItem.type === 'mold' || selectedItem.isTextMold) && (
          <div className="space-y-4 pt-3 border-t border-zinc-200" id="mold-specific-settings">
            
            {/* Se for Letter/Number Mold ou TextMold, permitir trocar de Fonte */}
            {(selectedItem.shapeType === 'letter' || selectedItem.shapeType === 'number' || selectedItem.isTextMold) && (
              <div className="space-y-1.5 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-indigo-650 flex items-center gap-1">
                  <Type className="w-3.5 h-3.5 text-indigo-500" />
                  Fonte da Letra / Molde
                </label>
                <select
                  disabled={isLocked}
                  className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-700 outline-none focus:border-indigo-505 cursor-pointer font-bold"
                  style={{ fontFamily: selectedItem.fontFamily }}
                  value={selectedItem.fontFamily || 'Bebas Neue'}
                  onChange={(e) => onUpdateItem({ ...selectedItem, fontFamily: e.target.value })}
                >
                  {FONTS_LIST.map(f => (
                    <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                  ))}
                </select>
                <span className="text-[8px] text-zinc-500 block leading-tight pt-1 font-mono">
                  Mude o estilo da letra a qualquer momento. A imagem interna obedece ao novo contorno!
                </span>
              </div>
            )}

            {/* Foto Interna */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-pink-600 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-pink-500" />
                Imagem Interna do Mold
              </h4>

              {selectedItem.imgSrc ? (
                <div className="space-y-3 bg-zinc-50 border border-zinc-200 rounded-xl p-3">
                  {/* Miniature */}
                  <div className="flex items-center gap-3">
                    <img 
                      src={selectedItem.imgSrc} 
                      alt="Crop" 
                      className="w-10 h-10 object-cover rounded bg-white border border-zinc-200" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-zinc-800 font-bold block truncate">Foto aplicada</span>
                      <button
                        onClick={handleClearImage}
                        className="text-[9px] text-rose-600 font-bold hover:underline cursor-pointer"
                      >
                        Remover Foto
                      </button>
                    </div>
                  </div>

                  {/* Zoom inside the mold */}
                  <div>
                    <div className="flex justify-between text-[9px] text-zinc-500 font-mono font-semibold">
                      <span>Zoom da Foto</span>
                      <span>{Math.round((selectedItem.imgScale || 1.0) * 100)}%</span>
                    </div>
                    <input
                      disabled={isLocked}
                      type="range"
                      min="0.2"
                      max="4.0"
                      step="0.05"
                      className="w-full accent-pink-500 h-1 mt-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                      value={selectedItem.imgScale || 1.0}
                      onChange={(e) => handleUpdateImageSettings({ imgScale: parseFloat(e.target.value) })}
                    />
                  </div>

                  {/* Offset X inside the mold */}
                  <div>
                    <div className="flex justify-between text-[9px] text-zinc-500 font-mono font-semibold">
                      <span>Mover X (mm)</span>
                      <span>{(selectedItem.imgOffsetX || 0)} mm</span>
                    </div>
                    <input
                      disabled={isLocked}
                      type="range"
                      min="-100"
                      max="100"
                      step="1"
                      className="w-full accent-pink-500 h-1 mt-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                      value={selectedItem.imgOffsetX || 0}
                      onChange={(e) => handleUpdateImageSettings({ imgOffsetX: parseInt(e.target.value) })}
                    />
                  </div>

                  {/* Offset Y inside the mold */}
                  <div>
                    <div className="flex justify-between text-[9px] text-zinc-500 font-mono font-semibold">
                      <span>Mover Y (mm)</span>
                      <span>{(selectedItem.imgOffsetY || 0)} mm</span>
                    </div>
                    <input
                      disabled={isLocked}
                      type="range"
                      min="-100"
                      max="100"
                      step="1"
                      className="w-full accent-pink-500 h-1 mt-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                      value={selectedItem.imgOffsetY || 0}
                      onChange={(e) => handleUpdateImageSettings({ imgOffsetY: parseInt(e.target.value) })}
                    />
                  </div>

                  {/* Rotation inside the mold */}
                  <div>
                    <div className="flex justify-between text-[9px] text-zinc-500 font-mono font-semibold">
                      <span>Girar Foto Interna</span>
                      <span>{(selectedItem.imgRotation || 0)}°</span>
                    </div>
                    <input
                      disabled={isLocked}
                      type="range"
                      min="-180"
                      max="180"
                      step="5"
                      className="w-full accent-pink-500 h-1 mt-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                      value={selectedItem.imgRotation || 0}
                      onChange={(e) => handleUpdateImageSettings({ imgRotation: parseInt(e.target.value) })}
                    />
                  </div>

                  {/* Mirror Inside mask */}
                  <div className="flex gap-1.5 pt-1">
                    <button
                      disabled={isLocked}
                      onClick={() => handleUpdateImageSettings({ imgMirrorH: !selectedItem.imgMirrorH })}
                      className={`flex-1 py-1 rounded text-[9px] border cursor-pointer transition-all font-bold ${
                        selectedItem.imgMirrorH 
                          ? 'bg-pink-600 border-pink-600 text-white shadow-xs' 
                          : 'bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-100'
                      }`}
                      title="Espelhar apenas a foto dentro do molde"
                    >
                      Refletir Foto H
                    </button>
                    <button
                      disabled={isLocked}
                      onClick={handleAutofillImage}
                      className="flex-1 py-1 text-[9px] bg-white hover:bg-zinc-100 hover:text-zinc-800 text-zinc-600 rounded border border-zinc-200 cursor-pointer font-bold"
                    >
                      Resetar Foto
                    </button>
                  </div>

                </div>
              ) : (
                <div className="p-4 bg-zinc-50 text-center border border-dashed border-zinc-200 rounded-xl space-y-2 mt-2">
                  <div className="text-[10px] text-zinc-455 leading-normal">
                    Nenhuma foto aplicada ao formato ainda.
                  </div>
                  <div className="text-[9px] text-indigo-700 font-extrabold uppercase tracking-wider bg-indigo-50 border border-indigo-200 py-1.5 px-2.5 rounded-lg select-all">
                    Aba "Fotos / Upload" ➔ Arraste pra cá!
                  </div>
                </div>
              )}
            </div>

            {/* Estilo do Molde: Contour */}
            <div className="space-y-3 pt-3 border-t border-zinc-200">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Desenho do Molde (Contorno)</h4>

              {/* Contour slider */}
              <div>
                <div className="flex justify-between text-[9px] text-zinc-500 font-mono font-semibold">
                  <span>Espessura do Contorno (Borda)</span>
                  <span>{selectedItem.contourWidth || 0}</span>
                </div>
                <input
                  disabled={isLocked}
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  className="w-full accent-indigo-650 h-1 mt-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                  value={selectedItem.contourWidth ?? 0}
                  onChange={(e) => onUpdateItem({ ...selectedItem, contourWidth: parseInt(e.target.value) })}
                />
                <span className="text-[8px] text-zinc-450 block leading-tight pt-1 font-mono">
                  0 = sem contorno, 1 = borda fina, 2 = médio, ..., 5 = forte
                </span>
              </div>

               {/* Color selectors */}
              <div id="contour-colors">
                <div>
                  <label className="block text-[9px] text-zinc-550 uppercase mb-1 font-bold">Cor da Borda</label>
                  <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg p-1">
                    <input
                      disabled={isLocked}
                      type="color"
                      className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer"
                      value={selectedItem.contourColor || '#000000'}
                      onChange={(e) => onUpdateItem({ ...selectedItem, contourColor: e.target.value })}
                    />
                    <input
                      disabled={isLocked}
                      type="text"
                      className="w-full bg-transparent text-[10px] uppercase font-mono text-zinc-650 focus:outline-none font-bold"
                      value={selectedItem.contourColor || '#000000'}
                      onChange={(e) => onUpdateItem({ ...selectedItem, contourColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AJUSTES SE FOR TEXT / TEXT CURVADO */}
        {(selectedItem.type === 'text' || selectedItem.type === 'curved-text') && (
          <div className="space-y-4 pt-3 border-t border-zinc-200" id="text-specific-settings">
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-indigo-650 flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-indigo-500" />
              Opções de Texto
            </h4>

            {/* Editable Content */}
            <div>
              <label className="block text-[9px] text-zinc-500 uppercase mb-1 font-bold">Editar Texto</label>
              <textarea
                id="text-content-textarea"
                disabled={isLocked}
                rows={3}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 font-bold focus:outline-none focus:border-indigo-500 transition-all resize-none"
                value={selectedItem.text || ''}
                onChange={(e) => onUpdateItem({ ...selectedItem, text: e.target.value })}
              />
            </div>

            {/* Font Family selector Google Fonts */}
            <div>
              <label className="block text-[9px] text-zinc-500 uppercase mb-1 font-bold">Família da Fonte</label>
              <select
                id="text-font-select"
                disabled={isLocked}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-700 outline-none focus:border-indigo-500 cursor-pointer font-bold"
                style={{ fontFamily: selectedItem.fontFamily }}
                value={selectedItem.fontFamily || 'Inter'}
                onChange={(e) => onUpdateItem({ ...selectedItem, fontFamily: e.target.value })}
              >
                {FONTS_LIST.map(f => (
                  <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3" id="text-style-controls">
              {/* Size Slider */}
              <div>
                <label className="block text-[9px] text-zinc-500 uppercase mb-1 font-bold">Tamanho (pt)</label>
                <input
                  disabled={isLocked}
                  type="number"
                  min="6"
                  max="120"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none text-zinc-800 font-bold"
                  value={selectedItem.fontSize || 16}
                  onChange={(e) => onUpdateItem({ ...selectedItem, fontSize: parseInt(e.target.value) || 12 })}
                />
              </div>

              {/* Spacing */}
              <div>
                <label className="block text-[9px] text-zinc-500 uppercase mb-1 font-bold">Espaçamento</label>
                <input
                  disabled={isLocked}
                  type="number"
                  min="-20"
                  max="50"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none text-zinc-800 font-bold"
                  value={selectedItem.letterSpacing || 0}
                  onChange={(e) => onUpdateItem({ ...selectedItem, letterSpacing: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* CURVATURA SE FOR TEXT CURVADO */}
            {selectedItem.type === 'curved-text' && (
              <div className="space-y-1 bg-zinc-50 p-3 border border-zinc-200 rounded-xl">
                <div className="flex justify-between text-[9px] text-zinc-500 font-mono font-semibold">
                  <span>Raio da Curva (Força)</span>
                  <span>{selectedItem.curveRadius || 80} mm</span>
                </div>
                <input
                  disabled={isLocked}
                  type="range"
                  min="-300"
                  max="300"
                  step="5"
                  className="w-full accent-indigo-650 h-1 mt-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                  value={selectedItem.curveRadius || 80}
                  onChange={(e) => onUpdateItem({ ...selectedItem, curveRadius: parseInt(e.target.value) })}
                />
                <span className="text-[8px] text-zinc-450 block leading-tight mt-1 text-center font-mono font-semibold">
                  Positivo encurva para baixo, Negativo encurva para cima
                </span>
              </div>
            )}

            {/* Formatting Triggers */}
            <div className="flex gap-2">
              <button
                disabled={isLocked}
                onClick={() => onUpdateItem({ ...selectedItem, isBold: !selectedItem.isBold })}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                  selectedItem.isBold ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' : 'bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-100'
                }`}
              >
                <Bold className="w-3.5 h-3.5" /> Negrito
              </button>
              <button
                disabled={isLocked}
                onClick={() => onUpdateItem({ ...selectedItem, isItalic: !selectedItem.isItalic })}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                  selectedItem.isItalic ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' : 'bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-100'
                }`}
              >
                <Italic className="w-3.5 h-3.5" /> Itálico
              </button>
            </div>

            {/* Paint: Font Fill and Outline stroke */}
            <div className="space-y-3 pt-3 border-t border-zinc-200">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Cores do Texto</h4>
              
              <div className="grid grid-cols-2 gap-3" id="text-colors">
                <div>
                  <label className="block text-[8px] uppercase tracking-wider font-bold text-zinc-450 mb-1">Preenchimento</label>
                  <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 p-1 rounded-lg">
                    <input
                      disabled={isLocked}
                      type="color"
                      className="w-5.5 h-5.5 border-0 rounded bg-transparent cursor-pointer"
                      value={selectedItem.fillColor || '#ffffff'}
                      onChange={(e) => onUpdateItem({ ...selectedItem, fillColor: e.target.value })}
                    />
                    <input
                      disabled={isLocked}
                      type="text"
                      className="w-full bg-transparent text-[9px] uppercase font-mono text-zinc-700 focus:outline-none font-bold"
                      value={selectedItem.fillColor || '#ffffff'}
                      onChange={(e) => onUpdateItem({ ...selectedItem, fillColor: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] uppercase tracking-wider font-bold text-zinc-450 mb-1">Borda (Stroke)</label>
                  <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 p-1 rounded-lg">
                    <input
                      disabled={isLocked}
                      type="color"
                      className="w-5.5 h-5.5 border-0 rounded bg-transparent cursor-pointer"
                      value={selectedItem.strokeColor || '#000000'}
                      onChange={(e) => onUpdateItem({ ...selectedItem, strokeColor: e.target.value })}
                    />
                    <input
                      disabled={isLocked}
                      type="text"
                      className="w-full bg-transparent text-[9px] uppercase font-mono text-zinc-700 focus:outline-none font-bold"
                      value={selectedItem.strokeColor || '#000000'}
                      onChange={(e) => onUpdateItem({ ...selectedItem, strokeColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Stroke width */}
              <div>
                <div className="flex justify-between text-[9px] text-zinc-500 font-mono font-semibold">
                  <span>Espessura da borda texto</span>
                  <span>{selectedItem.strokeWidth || 0} mm</span>
                </div>
                <input
                  disabled={isLocked}
                  type="range"
                  min="0"
                  max="4"
                  step="0.1"
                  className="w-full accent-indigo-650 h-1 mt-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer animate-none"
                  value={selectedItem.strokeWidth || 0}
                  onChange={(e) => onUpdateItem({ ...selectedItem, strokeWidth: parseFloat(e.target.value) })}
                />
              </div>
            </div>

          </div>
        )}

        {/* ALINHAMENTOS E ORGANIZACAO DE CAMADA */}
        <div className="space-y-3 pt-3 border-t border-zinc-200" id="sorting-layers-settings">
          <h4 className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-zinc-500" />
            Organização & Alinhamento
          </h4>

          {/* Quick Align relative to A4 Page */}
          <div className="grid grid-cols-3 gap-1" id="page-align-quick-btns">
            <button
              disabled={isLocked}
              onClick={() => onAlignItem('left')}
              className="py-1 px-1.5 bg-zinc-50 hover:bg-zinc-100 hover:text-zinc-800 border border-zinc-200 text-zinc-600 rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
              title="Alinhar à margem esquerda"
            >
              Esquerda
            </button>
            <button
              disabled={isLocked}
              onClick={() => onAlignItem('center')}
              className="py-1 px-1.5 bg-zinc-50 hover:bg-zinc-100 hover:text-zinc-800 border border-zinc-200 text-zinc-600 rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
              title="Centralizar horizontalmente na folha"
            >
              C. Horiz
            </button>
            <button
              disabled={isLocked}
              onClick={() => onAlignItem('right')}
              className="py-1 px-1.5 bg-zinc-50 hover:bg-zinc-100 hover:text-zinc-800 border border-zinc-200 text-zinc-600 rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
              title="Alinhar à margem direita"
            >
              Direita
            </button>
            <button
              disabled={isLocked}
              onClick={() => onAlignItem('top')}
              className="py-1 px-1.5 bg-zinc-50 hover:bg-zinc-100 hover:text-zinc-800 border border-zinc-200 text-zinc-600 rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
              title="Alinhar ao topo da página"
            >
              Topo
            </button>
            <button
              disabled={isLocked}
              onClick={() => onAlignItem('middle')}
              className="py-1 px-1.5 bg-zinc-50 hover:bg-zinc-100 hover:text-zinc-800 border border-zinc-200 text-zinc-600 rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
              title="Centralizar verticalmente na folha"
            >
              C. Vert
            </button>
            <button
              disabled={isLocked}
              onClick={() => onAlignItem('bottom')}
              className="py-1 px-1.5 bg-zinc-50 hover:bg-zinc-100 hover:text-zinc-800 border border-zinc-200 text-zinc-600 rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
              title="Alinhar à base da página"
            >
              Base
            </button>
          </div>

          {/* Layers ordering */}
          <div className="flex gap-2 pt-1" id="order-layers-btns">
            <button
              disabled={isLocked}
              onClick={() => onLayerChange('front')}
              className="flex-1 py-1.5 bg-zinc-50 hover:bg-zinc-100 hover:text-zinc-800 border border-zinc-200 rounded-lg text-zinc-600 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
              title="Trazer elemento para a frente"
            >
              <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
              Trazer p/ Frente
            </button>
            <button
              disabled={isLocked}
              onClick={() => onLayerChange('back')}
              className="flex-1 py-1.5 bg-zinc-50 hover:bg-zinc-100 hover:text-zinc-800 border border-zinc-200 rounded-lg text-zinc-600 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
              title="Enviar elemento para trás"
            >
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              Enviar p/ Trás
            </button>
          </div>
        </div>

        {/* LOCK TOGGLE IN BASE */}
        <div className="pt-2">
          <button
            id="toggle-lock-interactive-btn"
            onClick={handleToggleLock}
            className={`w-full py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-nowrap cursor-pointer ${
              selectedItem.isLocked
                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 shadow-xs'
                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200 hover:border-zinc-305'
            }`}
          >
            {selectedItem.isLocked ? (
              <>
                <Unlock className="w-4 h-4 text-rose-600" />
                Destravar Posição / Medidas
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-emerald-600" />
                Travar Posição / Medidas
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
