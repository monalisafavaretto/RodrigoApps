import React, { useState, useRef, useEffect } from 'react';
import { Upload, Check, RefreshCw, Layers, Image as ImageIcon } from 'lucide-react';
import { compressImage } from '../utils/imageHelper';

interface FrameCreatorProps {
  onAddCustomMold: (name: string, transparentPngDataUrl: string) => void;
}

export default function FrameCreator({ onAddCustomMold }: FrameCreatorProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [moldName, setMoldName] = useState('Novo Molde Criado');
  const [threshold, setThreshold] = useState(230); // White pixel trigger (0-255)
  const [tolerance, setTolerance] = useState(30);  // color range tolerance
  const [invert, setInvert] = useState(false);      // Invert transparency map
  const [processing, setProcessing] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      compressImage(reader.result as string).then((compressedBase64) => {
        setImageSrc(compressedBase64);
        setStep(2);
      });
    };
    reader.readAsDataURL(file);
  };

  // Run transparent pixel chroma keying on Canvas 2D
  const applyTransparencyFilter = () => {
    if (!imageSrc || !canvasRef.current) return;
    setProcessing(true);

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas display bounds to image size but locked to high resolution max 300x300 for mask accuracy in sidebar
      const maxDim = 300;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      // Extract pixel buffer
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Filter: loop pixels, test white range or brightness
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a === 0) continue; // Skip already transparent pixels

        // Brighter pixels represents white/light backgrounds
        const brightness = (r + g + b) / 3;

        // Perfect chroma key logic: If brightness or RGB is near White target, make transparent
        const isNearWhite = r >= threshold - tolerance && g >= threshold - tolerance && b >= threshold - tolerance;

        if (invert) {
          // Keep only white, transparentize everything else
          if (!isNearWhite) {
            data[i + 3] = 0; // Transparent
          } else {
            // Keep solid white/shape
            data[i] = 40;
            data[i+1] = 40;
            data[i+2] = 45;
            data[i+3] = 255;
          }
        } else {
          // Transparentize white
          if (isNearWhite) {
            data[i + 3] = 0;
          } else {
            // Fill solid dark silhouette to act as a clean SVG clip mask placeholder or keep original mask alpha
            data[i] = 40;
            data[i+1] = 40;
            data[i+2] = 45;
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      setProcessedUrl(canvas.toDataURL('image/png'));
      setProcessing(false);
    };
  };

  useEffect(() => {
    if (step === 2 && imageSrc) {
      applyTransparencyFilter();
    }
  }, [step, imageSrc, threshold, tolerance, invert]);

  const handleSaveFrame = () => {
    if (!processedUrl) return;
    onAddCustomMold(moldName.trim() || 'Custom Frame', processedUrl);
    // Reset wizard
    setImageSrc(null);
    setProcessedUrl(null);
    setStep(1);
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50/70 to-pink-50/70 rounded-xl border-2 border-indigo-200/50 p-4 mt-2 shadow-xs">
      <div className="flex flex-col mb-3 pb-2.5 border-b border-indigo-100">
        <h3 className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
          <Layers className="w-3.5 h-3.5 text-pink-500" />
          Criar Molde Personalizado
        </h3>
        <p className="text-[9px] text-zinc-500 mt-0.5 leading-snug font-medium">
          Transforme logo, silhueta ou desenho (PNG/JPG) em molde vazado para suas fotos!
        </p>
      </div>

      {step === 1 && (
        <div id="upload-frame-trigger" className="border border-dashed border-indigo-300 hover:border-indigo-500 bg-white/80 rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all relative cursor-pointer group">
          <Upload className="w-7 h-7 text-indigo-500 mb-2 group-hover:scale-105 transition-transform" />
          <p className="text-[10px] font-bold text-indigo-650">Enviar Desenho / Silhueta</p>
          <p className="text-[8px] text-zinc-400 mt-1 max-w-[190px] leading-relaxed select-none">
            Ideal: imagens com fundo branco ou transparentes (desenhos de colorir).
          </p>
          <input
            id="file-frame-input"
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleFileChange}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2.5">
            {/* Canvas Preview */}
            <div className="bg-zinc-950 rounded-lg p-2.5 border border-zinc-800 flex flex-col items-center justify-center min-h-[120px] relative">
              <span className="absolute top-1 right-1 text-[7px] font-mono text-indigo-400 px-1 py-0.2 bg-indigo-950/70 border border-indigo-900 rounded select-none">
                Área Vazada (Corte)
              </span>
              <canvas ref={canvasRef} className="max-w-full max-h-[100px] object-contain border border-dashed border-zinc-700/60 rounded bg-zinc-90 w-auto h-auto" />
              {processing && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-[9px] text-white gap-1.5 rounded-lg">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  <span>Extraindo formato...</span>
                </div>
              )}
            </div>

            {/* Adjustments Panel */}
            <div className="space-y-2.5 p-2 bg-white/90 rounded-lg border border-indigo-100/60">
              <div>
                <label className="block text-[8px] uppercase tracking-wider font-bold text-zinc-500 mb-1">
                  Nome do Molde
                </label>
                <input
                  id="custom-frame-name-input"
                  type="text"
                  maxLength={24}
                  className="w-full bg-zinc-50 border border-zinc-200 text-[10px] font-bold px-2 py-1 rounded text-zinc-700 outline-none focus:border-indigo-450"
                  value={moldName}
                  onChange={(e) => setMoldName(e.target.value)}
                />
              </div>

              {/* Threshold Slider */}
              <div>
                <div className="flex justify-between text-[8px] text-zinc-500 font-mono font-bold">
                  <span>Isolar fundo</span>
                  <span>{threshold}</span>
                </div>
                <input
                  id="thresh-slider"
                  type="range"
                  min="50"
                  max="255"
                  className="w-full accent-indigo-600 h-1 mt-0.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                />
              </div>

              {/* Tolerance Slider */}
              <div>
                <div className="flex justify-between text-[8px] text-zinc-500 font-mono font-bold">
                  <span>Tolerância de cor</span>
                  <span>{tolerance}</span>
                </div>
                <input
                  id="tolerance-slider"
                  type="range"
                  min="5"
                  max="100"
                  className="w-full accent-indigo-600 h-1 mt-0.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                  value={tolerance}
                  onChange={(e) => setTolerance(Number(e.target.value))}
                />
              </div>

              {/* Invert mask logic */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  id="invert-checkbox"
                  type="checkbox"
                  checked={invert}
                  className="accent-indigo-600 rounded"
                  onChange={(e) => setInvert(e.target.checked)}
                />
                <label htmlFor="invert-checkbox" className="text-[9px] text-zinc-650 font-bold select-none cursor-pointer">
                  Inverter máscara (Preencher branco)
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-100">
            <button
              onClick={() => {
                setImageSrc(null);
                setProcessedUrl(null);
                setStep(1);
              }}
              className="px-2 py-1 text-[9px] font-bold text-zinc-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="save-frame-finish"
              disabled={processing || !processedUrl}
              onClick={handleSaveFrame}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[9px] rounded-lg flex items-center gap-1 shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-3 h-3" />
              Salvar Molde
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
