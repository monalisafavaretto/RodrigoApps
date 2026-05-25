import { useState } from 'react';
import { 
  Save, FileText, Printer, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, 
  Grid, Ruler, Plus, LogOut, FolderOpen, Trash2, Check, HelpCircle, Shield 
} from 'lucide-react';
import { Project } from '../types';

interface HeaderToolbarProps {
  projectName: string;
  onRenameProject: (newName: string) => void;
  onNewProject: () => void;
  onSaveProject: () => void;
  onExportPDF: () => void;
  onPrint: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  setZoom: (z: number) => void;
  showGrid: boolean;
  setShowGrid: (g: boolean) => void;
  showRuler: boolean;
  setShowRuler: (r: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (s: boolean) => void;
  userEmail: string;
  onLogout: () => void;
  savedProjects: Project[];
  onLoadProject: (proj: Project) => void;
  onDeleteProject: (id: string) => void;
  isAdmin?: boolean;
  showAdmin?: boolean;
  onToggleAdmin?: () => void;
}

export default function HeaderToolbar({
  projectName,
  onRenameProject,
  onNewProject,
  onSaveProject,
  onExportPDF,
  onPrint,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  zoom,
  setZoom,
  showGrid,
  setShowGrid,
  showRuler,
  setShowRuler,
  snapToGrid,
  setSnapToGrid,
  userEmail,
  onLogout,
  savedProjects,
  onLoadProject,
  onDeleteProject,
  isAdmin = false,
  showAdmin = false,
  onToggleAdmin,
}: HeaderToolbarProps) {
  const [showProjectsMenu, setShowProjectsMenu] = useState(false);
  const [showPrintWarning, setShowPrintWarning] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handlePrintClick = () => {
    setShowPrintWarning(true);
  };

  const confirmPrint = () => {
    setShowPrintWarning(false);
    onPrint();
  };

  return (
    <header className="no-print h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-4 select-none relative z-40 shadow-sm">
      
      {/* Brand & Project Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center shadow shadow-indigo-500/10 rotate-3 overflow-hidden">
            <img src="/favicon.svg" alt="ResinApp Logo" className="w-6 h-6 object-contain" />
          </div>
          <span className="text-sm font-bold tracking-tight text-zinc-800 hidden sm:block font-space">
            ResinApp
          </span>
        </div>
        
        <div className="h-4 w-px bg-zinc-200 hidden sm:block" />

        <div className="flex items-center gap-2">
          <input
            id="proj-name-input"
            type="text"
            className="bg-zinc-50 border border-zinc-200 hover:border-zinc-350 focus:border-indigo-500 focus:bg-white px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-800 placeholder-zinc-400 outline-none w-40 sm:w-64 transition-all"
            value={projectName}
            onChange={(e) => onRenameProject(e.target.value)}
            placeholder="Nome do seu projeto"
          />
        </div>
      </div>

      {/* Editor Controls: Save, Export, Print, History */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Undo/Redo */}
        <div className="flex items-center rounded-lg bg-zinc-100 border border-zinc-200 p-0.5">
          <button
            id="undo-btn"
            disabled={!canUndo}
            onClick={onUndo}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              canUndo ? 'text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900' : 'text-zinc-350 cursor-not-allowed opacity-40'
            }`}
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            id="redo-btn"
            disabled={!canRedo}
            onClick={onRedo}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              canRedo ? 'text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900' : 'text-zinc-350 cursor-not-allowed opacity-40'
            }`}
            title="Refazer (Ctrl+Y / Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* View Controls: Ruler, Grid, Snap */}
        <div className="hidden lg:flex items-center gap-1 rounded-lg bg-zinc-100 border border-zinc-200 p-0.5">
          <button
            id="toggle-ruler-btn"
            onClick={() => setShowRuler(!showRuler)}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${
              showRuler 
                ? 'bg-indigo-600/10 text-indigo-600 font-semibold border border-indigo-200' 
                : 'text-zinc-550 hover:text-zinc-800 border border-transparent'
            }`}
            title="Mostrar/Ocultar Régua"
          >
            <Ruler className="w-4 h-4" />
          </button>
          <button
            id="toggle-grid-btn"
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${
              showGrid 
                ? 'bg-indigo-600/10 text-indigo-600 font-semibold border border-indigo-200' 
                : 'text-zinc-550 hover:text-zinc-800 border border-transparent'
            }`}
            title="Mostrar/Ocultar Grade Geral"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center rounded-lg bg-zinc-100 border border-zinc-200 p-0.5 gap-1">
          <button
            id="zoom-out-btn"
            onClick={() => setZoom(Math.max(0.3, zoom - 0.1))}
            className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200 rounded-md transition-colors cursor-pointer"
            title="Aumentar área"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono font-bold text-zinc-605 px-1 w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            id="zoom-in-btn"
            onClick={() => setZoom(Math.min(3.0, zoom + 0.1))}
            className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200 rounded-md transition-colors cursor-pointer"
            title="Diminuir área"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            id="zoom-fit-btn"
            onClick={() => setZoom(0.85)}
            className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200 rounded-md transition-colors cursor-pointer"
            title="Ajustar à tela"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-zinc-200" />

        {/* Action Buttons: New, Open/List, Save, Export, Print */}
        <div className="flex items-center gap-1">
          <button
            id="new-proj-btn"
            onClick={onNewProject}
            className="p-1.5 md:px-2.5 md:py-1.5 text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer border border-transparent"
            title="Criar folha em branco"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline font-semibold">Novo</span>
          </button>

          <button
            id="project-list-btn"
            onClick={() => setShowProjectsMenu(!showProjectsMenu)}
            className={`p-1.5 md:px-2.5 md:py-1.5 text-zinc-650 hover:text-zinc-850 hover:bg-zinc-100 rounded-lg text-xs flex items-center gap-1 transition-all relative cursor-pointer border ${
              showProjectsMenu ? 'bg-zinc-150 text-zinc-900 border-zinc-200' : 'border-transparent'
            }`}
            title="Ver projetos salvos anteriormente"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="hidden md:inline font-semibold">Meus Projetos</span>
            {savedProjects.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-650 text-[9px] text-white flex items-center justify-center font-bold">
                {savedProjects.length}
              </span>
            )}
          </button>

          <button
            id="save-proj-btn"
            onClick={onSaveProject}
            className="p-1.5 md:px-2.5 md:py-1.5 text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer font-semibold shadow-xs"
            title="Salvar projeto localmente"
          >
            <Save className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Salvar</span>
          </button>

          <button
            id="pdf-btn"
            onClick={onExportPDF}
            className="p-1.5 md:px-3 md:py-1.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg text-xs flex items-center gap-1 font-semibold transition-all cursor-pointer shadow-sm shadow-indigo-600/10"
            title="Exportar arquivo PDF para impressão perfeita"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>

          <button
            id="print-btn"
            onClick={handlePrintClick}
            className="p-1.5 md:px-3 md:py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-lg text-xs flex items-center gap-1 font-semibold transition-all cursor-pointer shadow-xs"
            title="Imprimir folha A4 em tamanho 100% real"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* User Area */}
      <div className="flex items-center gap-3">
        {isAdmin && (
          <button
            onClick={onToggleAdmin}
            className={`p-1.5 px-3 rounded-lg text-xs font-bold cursor-pointer transition-all border flex items-center gap-1.5 ${
              showAdmin 
                ? 'bg-rose-600 border-rose-500 text-white shadow-md' 
                : 'bg-indigo-600/10 border-indigo-200 text-indigo-650 hover:bg-indigo-600/20'
            }`}
            title="Abrir Painel de Administração"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Painel Admin</span>
          </button>
        )}

        <button
          onClick={() => setShowHelp(!showHelp)}
          className="p-1.5 text-zinc-550 hover:text-zinc-850 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
          title="Ajuda / Guia"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <div className="hidden xl:flex flex-col items-end text-right">
          <span className="text-[10px] text-zinc-400 font-mono">Logado como:</span>
          <span className="text-xs font-bold text-zinc-650 max-w-[120px] truncate" title={userEmail}>
            {userEmail.split('@')[0]}
          </span>
        </div>

        <button
          id="logout-btn"
          onClick={onLogout}
          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          title="Sair / Trocar e-mail"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Projects Dropdown Menu */}
      {showProjectsMenu && (
        <div className="absolute top-[58px] left-4 md:left-auto right-4 md:right-32 w-80 bg-[#1e2025] border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Seus Projetos</h3>
            <button 
              className="text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
              onClick={() => setShowProjectsMenu(false)}
            >
              Fechar
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-zinc-800/60 font-sans">
            {savedProjects.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-xs">
                Nenhum projeto salvo para este e-mail.
              </div>
            ) : (
              savedProjects.map((p) => (
                <div key={p.id} className="p-3 hover:bg-zinc-800/50 flex items-center justify-between group transition-colors">
                  <button
                    onClick={() => {
                      onLoadProject(p);
                      setShowProjectsMenu(false);
                    }}
                    className="flex flex-col text-left flex-1 mr-3 cursor-pointer outline-none"
                  >
                    <span className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-400 truncate w-48">
                      {p.name}
                    </span>
                    <span className="text-[9px] text-zinc-500 mt-0.5">
                      Atualizado em: {new Date(p.updatedAt).toLocaleDateString('pt-BR')} {new Date(p.updatedAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Excluir o projeto "${p.name}" permanentemente?`)) {
                        onDeleteProject(p.id);
                      }
                    }}
                    className="p-1 text-zinc-600 hover:text-red-400 rounded transition-colors cursor-pointer"
                    title="Remover Projeto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Print Scaled Warning Box */}
      {showPrintWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0b0d]/85 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#1e2025] border border-zinc-800 rounded-xl p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Printer className="w-5 h-5 text-teal-400" />
              Aviso de Medidas Reais para Impressão
            </h3>
            <div className="text-sm text-zinc-300 space-y-3 mt-4 leading-relaxed">
              <p>
                Este editor simula uma folha <strong>A4 real (21cm x 29.7cm)</strong> para que seu chaveiro de resina saia com as medidas milimétricas corretas.
              </p>
              <div className="bg-zinc-900 border border-zinc-800/80 p-3.5 rounded-lg text-xs text-amber-400 space-y-1">
                <p className="font-semibold">Na janela de impressão que abrir a seguir:</p>
                <ol className="list-decimal list-inside pl-1 space-y-1 mt-1 text-zinc-300">
                  <li>Selecione <strong>"Escala: 100%"</strong> ou <strong>"Tamanho Real"</strong>.</li>
                  <li>Desative a opção "Ajustar à página" ou "Redimensionar".</li>
                  <li>Configure o tipo de papel e qualidade como de costume.</li>
                </ol>
              </div>
              <p className="text-xs text-zinc-400 mt-2">
                Dica: O espelhamento dos itens da folha ou letras pode ser configurado manualmente no painel direito se o seu molde de resina exigir aplicação reversa!
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPrintWarning(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="confirm-print-btn"
                onClick={confirmPrint}
                className="px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all cursor-pointer"
              >
                Entendi e Quero Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0b0d]/85 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-[#1e2025] border border-zinc-800 rounded-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Check className="w-5 h-5 text-indigo-400" />
              Instruções de Uso - ResinApp
            </h3>
            <div className="text-xs text-zinc-300 space-y-3.5 leading-relaxed font-sans">
              <div>
                <h4 className="font-semibold text-indigo-400 uppercase tracking-wider text-[10px] mb-1">Como criar chaveiros</h4>
                <p>Clique ou arraste moldes da biblioteca esquerda para trazê-los à folha A4. Insira imagens próprias enviando pelo painel lateral "Meus Uploads".</p>
              </div>
              <div>
                <h4 className="font-semibold text-indigo-400 uppercase tracking-wider text-[10px] mb-1">Colocar Imagens Dentro de Moldes</h4>
                <p>Clique no molde para selecioná-lo, em seguida vá em "Meus Uploads" e clique em qualquer imagem para inseri-la instantaneamente ali dentro. Use os botões do inspetor para mover, rotacionar ou redimensionar a foto dentro do contorno.</p>
              </div>
              <div>
                <h4 className="font-semibold text-indigo-400 uppercase tracking-wider text-[10px] mb-1">Impressão Perfeita</h4>
                <p>A folha central representa perfeitamente uma folha A4 em 100%. Quando o PDF for exportado ou a impressão disparada, use as opções da impressora sem margens e sem redimensionamento para sair exatamente sob medida em centímetros.</p>
              </div>
              <div>
                <h4 className="font-semibold text-indigo-400 uppercase tracking-wider text-[10px] mb-1">Espelhamento (Mirror)</h4>
                <p>Muitas peças de resina são montadas de trás para frente. Use o botão "Espelhar Horizontal" nas propriedades do molde para imprimir a imagem de forma espelhada.</p>
              </div>
              <div>
                <h4 className="font-semibold text-indigo-400 uppercase tracking-wider text-[10px] mb-1">Ferramenta Criar Molde (Image to Frame)</h4>
                <p>Importe um PNG ou desenho transparente no painel correspondente, configure o contraste de transparência para transformá-lo em um molde e arraste suas fotos para dentro!</p>
              </div>
              <div>
                <h4 className="font-semibold text-indigo-400 uppercase tracking-wider text-[10px] mb-1">Atalhos</h4>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-zinc-400 pl-1">
                  <li><kbd className="bg-zinc-900 border border-zinc-700 px-1 rounded">Ctrl+C</kbd> / <kbd className="bg-zinc-900 border border-zinc-700 px-1 rounded">Ctrl+V</kbd> - Copiar e colar itens</li>
                  <li><kbd className="bg-zinc-900 border border-zinc-700 px-1 rounded">Ctrl+Z</kbd> / <kbd className="bg-zinc-900 border border-zinc-700 px-1 rounded">Ctrl+Y</kbd> - Desfazer e refazer</li>
                  <li><kbd className="bg-zinc-900 border border-zinc-700 px-1 rounded">Delete</kbd> ou <kbd className="bg-zinc-900 border border-zinc-700 px-1 rounded">Backspace</kbd> - Exclui o item selecionado</li>
                  <li><kbd className="bg-zinc-900 border border-zinc-700 px-1 rounded">Ctrl+S</kbd> - Salva o projeto atual</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowHelp(false)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer"
              >
                Fechar Guia
              </button>
            </div>
          </div>
        </div>
      )}

    </header>
  );
}
