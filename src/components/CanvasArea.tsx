import React, { useRef, useState, useEffect } from 'react';
import { EditorItem } from '../types';
import { LIBRARY_SHAPES } from '../utils/shapeHelper';
import { compressImage } from '../utils/imageHelper';

interface CanvasAreaProps {
  items: EditorItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onUpdateItem: (updated: EditorItem) => void;
  zoom: number;
  showGrid: boolean;
  showRuler: boolean;
  snapToGrid: boolean;
  shapeBBoxes: Record<string, { x: number; y: number; width: number; height: number }>;
  onUpdateShapeBBox: (itemId: string, bbox: { x: number; y: number; width: number; height: number }) => void;
}

// Convert MM to PX based on standard zoom base: 1mm = 3.5px at 100% zoom
const BASE_PX_PER_MM = 3.5;

const RENDER_LANDSCAPE_SVG_NODES = (itemId: string) => {
  return (
    <g>
      <defs>
        <linearGradient id={`skyGrad-${itemId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="60%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#skyGrad-${itemId})`} />
      
      {/* Hills mimicking the uploaded layout */}
      <path d="M -10,110 L -10,75 Q 25,60 55,75 Q 80,85 110,65 L 110,110 Z" fill="#b1ec37" opacity="0.9" />
      <path d="M -10,110 L -10,85 Q 30,70 65,65 Q 85,58 110,70 L 110,110 Z" fill="#84cc16" opacity="0.75" />
      <path d="M -10,110 L -10,95 Q 20,83 48,82 Q 75,80 110,76 L 110,110 Z" fill="#65a30d" />
      
      {/* Cloud */}
      <g fill="#ffffff" opacity="0.95">
        <circle cx="35" cy="38" r="9" />
        <circle cx="46" cy="33" r="11" />
        <circle cx="58" cy="37" r="8" />
        <rect x="35" y="34" width="23" height="10" rx="5" />
      </g>
      
      {/* Central drag indicator icon */}
      <g transform="translate(50, 48) scale(0.6)" opacity="0.45">
        <circle cx="0" cy="0" r="15" fill="#ffffff" />
        <rect x="-7" y="-5" width="14" height="10" rx="1.5" fill="none" stroke="#0284c7" strokeWidth="1.5" />
        <circle cx="-3" cy="-2" r="1.5" fill="#0284c7" />
        <path d="M -7,3 L -3,-1 L 1,2 L 3,0 L 7,3" fill="none" stroke="#0284c7" strokeWidth="1.5" strokeLinejoin="round" />
      </g>
    </g>
  );
};

// Helper to calculate tight visual/ink bounding box for text in 100x100 coordinate space
const calculateTightTextBBox = (
  text: string,
  fontFamily: string,
  fontSize: number, // 80 or 60
  alignmentY: number, // 75 or 65
  letterSpacingNum: number = 0
): { x: number; y: number; width: number; height: number } => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { x: 10, y: 10, width: 80, height: 80 };
    }

    // Set a solid size to allow precise sub-pixel measurements
    canvas.width = 400;
    canvas.height = 400;

    // Configure the context font
    ctx.font = `bold ${fontSize}px "${fontFamily}"`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';

    const letterSpacing = letterSpacingNum || 0;
    if (letterSpacing && 'letterSpacing' in ctx) {
      (ctx as any).letterSpacing = `${letterSpacing}px`;
    }

    // Measure text metrics
    const metrics = ctx.measureText(text);

    // Ink boundaries relative to alignment center (x = 50) and baseline (y = alignmentY)
    const inkLeft = metrics.actualBoundingBoxLeft ?? (fontSize * 0.3);
    const inkRight = metrics.actualBoundingBoxRight ?? (fontSize * 0.3);
    const inkAscent = metrics.actualBoundingBoxAscent ?? (fontSize * 0.7);
    const inkDescent = metrics.actualBoundingBoxDescent ?? (fontSize * 0.15);

    const width = inkLeft + inkRight;
    const height = inkAscent + inkDescent;
    const x = 50 - inkLeft;
    const y = alignmentY - inkAscent;

    // Return tightly fitted bounds within the 100x100 space, with a small padding of 0.5% for aesthetics
    const pad = 0.5;
    return {
      x: Math.max(0, Math.min(100, x - pad)),
      y: Math.max(0, Math.min(100, y - pad)),
      width: Math.max(1, Math.min(100, width + pad * 2)),
      height: Math.max(1, Math.min(100, height + pad * 2))
    };
  } catch (err) {
    return { x: 15, y: 15, width: 70, height: 70 };
  }
};

const customBBoxCache = new Map<string, { x: number; y: number; width: number; height: number }>();

const measurePngTightBBox = (
  maskUrl: string,
  callback: (bbox: { x: number; y: number; width: number; height: number }) => void
) => {
  if (customBBoxCache.has(maskUrl)) {
    callback(customBBoxCache.get(maskUrl)!);
    return;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        callback({ x: 0, y: 0, width: 100, height: 100 });
        return;
      }
      const size = 100;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);
      const imgData = ctx.getImageData(0, 0, size, size);
      const data = imgData.data;

      let minX = size;
      let minY = size;
      let maxX = 0;
      let maxY = 0;
      let found = false;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const alpha = data[(y * size + x) * 4 + 3];
          if (alpha > 15) { // alpha threshold for translucent margins
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            found = true;
          }
        }
      }

      if (found) {
        // Add a small aesthetic padding (0.5% scale)
        const bbox = {
          x: Math.max(0, minX - 0.5),
          y: Math.max(0, minY - 0.5),
          width: Math.min(100, Math.max(1, maxX - minX + 1 + 1)),
          height: Math.min(100, Math.max(1, maxY - minY + 1 + 1)),
        };
        customBBoxCache.set(maskUrl, bbox);
        callback(bbox);
      } else {
        callback({ x: 0, y: 0, width: 100, height: 100 });
      }
    } catch (e) {
      callback({ x: 0, y: 0, width: 100, height: 100 });
    }
  };
  img.onerror = () => {
    callback({ x: 0, y: 0, width: 100, height: 100 });
  };
  img.src = maskUrl;
};

export default function CanvasArea({
  items,
  selectedItemId,
  onSelectItem,
  onUpdateItem,
  zoom,
  showGrid,
  showRuler,
  snapToGrid,
  shapeBBoxes,
  onUpdateShapeBBox,
}: CanvasAreaProps) {
  const fileSheetRef = useRef<HTMLDivElement | null>(null);
  
  // Drag and Resize state
  const [dragState, setDragState] = useState<{
    itemId: string;
    action: 'drag' | 'resize-br' | 'resize-r' | 'resize-b' | 'resize-tr' | 'rotate';
    startX: number;
    startY: number;
    startItemX: number;
    startItemY: number;
    startWidth: number;
    startHeight: number;
    startRotation: number;
  } | null>(null);

  const pxPerMm = BASE_PX_PER_MM * zoom;
  
  // Width & height of A4 sheet on screen
  const pagePxWidth = 210 * pxPerMm;
  const pagePxHeight = 297 * pxPerMm;

  // Measure SVG shape bounding boxes relative to 100x100 viewBox
  useEffect(() => {
    let active = true;
    const updateAllBBoxes = () => {
      if (!active) return;
      items.forEach(item => {
        const isText = item.isTextMold || item.shapeType === 'letter' || item.shapeType === 'number';
        if (isText) {
          const textStr = item.isTextMold ? (item.text || '') : (item.letterChar || 'A');
          const fontSize = item.isTextMold ? 60 : 80;
          const alignmentY = item.isTextMold ? 65 : 75;
          const letterSpacing = item.isTextMold ? (item.letterSpacing || 0) : 0;
          const fontFamily = item.fontFamily || 'Bebas Neue';
          
          const bbox = calculateTightTextBBox(textStr, fontFamily, fontSize, alignmentY, letterSpacing);
          const existing = shapeBBoxes[item.id];
          const diffLimit = 0.05;
          const isSubstantiallyDifferent = !existing || 
            Math.abs(existing.x - bbox.x) > diffLimit ||
            Math.abs(existing.y - bbox.y) > diffLimit ||
            Math.abs(existing.width - bbox.width) > diffLimit ||
            Math.abs(existing.height - bbox.height) > diffLimit;

          if (isSubstantiallyDifferent) {
            onUpdateShapeBBox(item.id, bbox);
          }
        } else if (item.shapeType === 'custom-trace' && item.customPngMask) {
          // Custom mold file upload: measure PNG tight bounds
          measurePngTightBBox(item.customPngMask, (bbox) => {
            if (!active) return;
            const existing = shapeBBoxes[item.id];
            const diffLimit = 0.1;
            const isSubstantiallyDifferent = !existing || 
              Math.abs(existing.x - bbox.x) > diffLimit ||
              Math.abs(existing.y - bbox.y) > diffLimit ||
              Math.abs(existing.width - bbox.width) > diffLimit ||
              Math.abs(existing.height - bbox.height) > diffLimit;

            if (isSubstantiallyDifferent) {
              onUpdateShapeBBox(item.id, bbox);
            }
          });
        } else {
          // Non-text shapes: use SVG getBBox() which is geometric and perfect
          const el = document.getElementById(`mold-geometry-${item.id}`);
          if (el) {
            try {
              const bbox = (el as any).getBBox();
              if (bbox && bbox.width > 0 && bbox.height > 0) {
                const existing = shapeBBoxes[item.id];
                const diffLimit = 0.05;
                const isSubstantiallyDifferent = !existing || 
                  Math.abs(existing.x - bbox.x) > diffLimit ||
                  Math.abs(existing.y - bbox.y) > diffLimit ||
                  Math.abs(existing.width - bbox.width) > diffLimit ||
                  Math.abs(existing.height - bbox.height) > diffLimit;

                if (isSubstantiallyDifferent) {
                  onUpdateShapeBBox(item.id, {
                    x: bbox.x,
                    y: bbox.y,
                    width: bbox.width,
                    height: bbox.height
                  });
                }
              }
            } catch (e) {
              // Ignore if element not layout-mounted yet
            }
          }
        }
      });
    };

    updateAllBBoxes();

    // Re-run when fonts are loaded to ensure correct metrics if they were delayed
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => {
        updateAllBBoxes();
      });
    }

    return () => {
      active = false;
    };
  }, [items, shapeBBoxes, onUpdateShapeBBox]);

  // Global mouse/touch move event listeners for canvas drag/scale
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!dragState) return;
      const targetItem = items.find(i => i.id === dragState.itemId);
      if (!targetItem || targetItem.isLocked) return;

      const deltaX = (clientX - dragState.startX) / pxPerMm;
      const deltaY = (clientY - dragState.startY) / pxPerMm;

      if (dragState.action === 'drag') {
        let newX = dragState.startItemX + deltaX;
        let newY = dragState.startItemY + deltaY;

        if (snapToGrid) {
          // Snaps to nearest 5mm or 2.5mm Grid ticks
          newX = Math.round(newX / 2.5) * 2.5;
          newY = Math.round(newY / 2.5) * 2.5;
        }

        onUpdateItem({
          ...targetItem,
          x: newX,
          y: newY,
        });
      } else if (dragState.action === 'resize-br') {
        let newWidth = dragState.startWidth + deltaX;
        let newHeight = dragState.startHeight + deltaY;

        if (snapToGrid) {
          newWidth = Math.round(newWidth / 2.5) * 2.5;
          newHeight = Math.round(newHeight / 2.5) * 2.5;
        }

        // Clamp minimum size to 5mm
        newWidth = Math.max(5, newWidth);
        newHeight = Math.max(5, newHeight);

        // Keep Aspect Ratio defaults
        const aspectRatio = dragState.startHeight / dragState.startWidth;
        // Adjust for proportional diagonal resizing
        newHeight = newWidth * aspectRatio;

        onUpdateItem({
          ...targetItem,
          width: newWidth,
          height: newHeight,
        });
      } else if (dragState.action === 'resize-r') {
        let newWidth = dragState.startWidth + deltaX;

        if (snapToGrid) {
          newWidth = Math.round(newWidth / 2.5) * 2.5;
        }

        newWidth = Math.max(5, newWidth);

        onUpdateItem({
          ...targetItem,
          width: newWidth,
        });
      } else if (dragState.action === 'resize-b') {
        let newHeight = dragState.startHeight + deltaY;

        if (snapToGrid) {
          newHeight = Math.round(newHeight / 2.5) * 2.5;
        }

        newHeight = Math.max(5, newHeight);

        onUpdateItem({
          ...targetItem,
          height: newHeight,
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleUp = () => {
      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [dragState, items, pxPerMm, snapToGrid]);

  const handleStartDrag = (
    e: React.MouseEvent | React.TouchEvent,
    item: EditorItem,
    action: 'drag' | 'resize-br' | 'resize-r' | 'resize-b'
  ) => {
    e.stopPropagation();
    if (item.isLocked) return;

    onSelectItem(item.id);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDragState({
      itemId: item.id,
      action,
      startX: clientX,
      startY: clientY,
      startItemX: item.x,
      startItemY: item.y,
      startWidth: item.width,
      startHeight: item.height,
      startRotation: item.rotation,
    });
  };

  // Helper inside loop to draw standard predefined mold content
  const renderMoldShape = (item: EditorItem) => {
    let shapeMarkup = '';
    
    if (item.shapeType === 'custom-trace' && item.customPngMask) {
      // Custom Traced dynamic transparent mask with CSS mask URL
      return (
        <div 
          className="w-full h-full relative"
          style={{
            WebkitMaskImage: `url(${item.customPngMask})`,
            maskImage: `url(${item.customPngMask})`,
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            backgroundColor: item.backgroundColor || '#dadbde',
            pointerEvents: 'auto',
          }}
        >
          {item.imgSrc ? (
            <img
              src={item.imgSrc}
              alt="Custom"
              referrerPolicy="no-referrer"
              className="absolute pointer-events-none"
              style={{
                left: `${50 + (item.imgOffsetX || 0)}%`,
                top: `${50 + (item.imgOffsetY || 0)}%`,
                transform: `translate(-50%, -50%) scale(${item.imgScale || 1}) rotate(${item.imgRotation || 0}deg) scaleX(${item.imgMirrorH ? -1 : 1})`,
                transformOrigin: 'center',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          ) : (
            // Custom trace beautiful landscape frame
            <div className="absolute inset-0 select-none pointer-events-none">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                {RENDER_LANDSCAPE_SVG_NODES(item.id)}
              </svg>
            </div>
          )}
        </div>
      );
    } else if (item.isTextMold && item.text) {
      // Dynamic multi-letter text word-mold
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full pointer-events-none">
          {/* Transparent measurement helper */}
          <g id={`mold-geometry-${item.id}`} fill="none" stroke="none" style={{ pointerEvents: 'none' }}>
            <text
              x="50"
              y="65"
              fontFamily={item.fontFamily || 'Bebas Neue'}
              fontSize="60"
              fontWeight="bold"
              letterSpacing={item.letterSpacing ? `${item.letterSpacing}px` : undefined}
              textAnchor="middle"
            >
              {item.text}
            </text>
          </g>
          <defs>
            <clipPath id={`clip-${item.id}`}>
              <text
                x="50"
                y="65"
                fontFamily={item.fontFamily || 'Bebas Neue'}
                fontSize="60"
                fontWeight="bold"
                letterSpacing={item.letterSpacing ? `${item.letterSpacing}px` : undefined}
                textAnchor="middle"
              >
                {item.text}
              </text>
            </clipPath>
          </defs>

          {/* BACKGROUND FILL OR CHIP */}
          <rect width="100" height="100" fill={item.backgroundColor || 'transparent'} clipPath={`url(#clip-${item.id})`} style={{ pointerEvents: 'auto' }} />

          <g clipPath={`url(#clip-${item.id})`} style={{ pointerEvents: 'auto' }}>
            {item.imgSrc ? (
              <image
                href={item.imgSrc}
                x={50 + (item.imgOffsetX || 0) - (50 * (item.imgScale || 1.2))}
                y={50 + (item.imgOffsetY || 0) - (50 * (item.imgScale || 1.2))}
                width={100 * (item.imgScale || 1.2)}
                height={100 * (item.imgScale || 1.2)}
                transform={`translate(50, 50) rotate(${item.imgRotation || 0}) scale(${item.imgMirrorH ? -1 : 1}, ${item.imgMirrorV ? -1 : 1}) translate(-50, -50)`}
              />
            ) : (
              RENDER_LANDSCAPE_SVG_NODES(item.id)
            )}
          </g>

          <text
            x="50"
            y="65"
            fontFamily={item.fontFamily || 'Bebas Neue'}
            fontSize="60"
            fontWeight="bold"
            letterSpacing={item.letterSpacing ? `${item.letterSpacing}px` : undefined}
            textAnchor="middle"
            fill="none"
            stroke={item.contourColor || '#000000'}
            strokeWidth={item.contourWidth ?? 0}
            style={{ pointerEvents: 'auto' }}
          >
            {item.text}
          </text>
        </svg>
      );
    } else if (item.shapeType === 'letter' || item.shapeType === 'number') {
      // Single A-Z or 0-9 transparent clip mold
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full pointer-events-none">
          {/* Transparent measurement helper */}
          <g id={`mold-geometry-${item.id}`} fill="none" stroke="none" style={{ pointerEvents: 'none' }}>
            <text
              x="50"
              y="75"
              fontFamily={item.fontFamily || 'Bebas Neue'}
              fontSize="80"
              fontWeight="bold"
              textAnchor="middle"
            >
              {item.letterChar || 'A'}
            </text>
          </g>
          <defs>
            <clipPath id={`clip-${item.id}`}>
              <text
                x="50"
                y="75"
                fontFamily={item.fontFamily || 'Bebas Neue'}
                fontSize="80"
                fontWeight="bold"
                textAnchor="middle"
              >
                {item.letterChar || 'A'}
              </text>
            </clipPath>
          </defs>

          <rect width="100" height="100" fill={item.backgroundColor || 'transparent'} clipPath={`url(#clip-${item.id})`} style={{ pointerEvents: 'auto' }} />

          <g clipPath={`url(#clip-${item.id})`} style={{ pointerEvents: 'auto' }}>
            {item.imgSrc ? (
              <image
                href={item.imgSrc}
                x={50 + (item.imgOffsetX || 0) - (50 * (item.imgScale || 1.2))}
                y={50 + (item.imgOffsetY || 0) - (50 * (item.imgScale || 1.2))}
                width={100 * (item.imgScale || 1.2)}
                height={100 * (item.imgScale || 1.2)}
                transform={`translate(50, 50) rotate(${item.imgRotation || 0}) scale(${item.imgMirrorH ? -1 : 1}, ${item.imgMirrorV ? -1 : 1}) translate(-50, -50)`}
              />
            ) : (
              RENDER_LANDSCAPE_SVG_NODES(item.id)
            )}
          </g>

          <text
            x="50"
            y="75"
            fontFamily={item.fontFamily || 'Bebas Neue'}
            fontSize="80"
            fontWeight="bold"
            textAnchor="middle"
            fill="none"
            stroke={item.contourColor || '#000000'}
            strokeWidth={item.contourWidth ?? 0}
            style={{ pointerEvents: 'auto' }}
          >
            {item.letterChar || 'A'}
          </text>
        </svg>
      );
    } else {
      // Standard dictionary molds
      const mold = LIBRARY_SHAPES.find(s => s.id === item.shapeType);
      shapeMarkup = mold ? mold.svgMarkup : '<rect x="10" y="10" width="80" height="80" rx="4" />';
      
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full pointer-events-none">
          {/* Transparent measurement helper */}
          <g id={`mold-geometry-${item.id}`} fill="none" stroke="none" style={{ pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: shapeMarkup }} />
          <defs>
            <clipPath id={`clip-${item.id}`} dangerouslySetInnerHTML={{ __html: shapeMarkup }} />
          </defs>

          {/* Background Solid Filler if transparent png is inactive */}
          <rect width="100" height="100" fill={item.backgroundColor || 'transparent'} clipPath={`url(#clip-${item.id})`} style={{ pointerEvents: 'auto' }} />

          <g clipPath={`url(#clip-${item.id})`} style={{ pointerEvents: 'auto' }}>
            {item.imgSrc ? (
              <image
                href={item.imgSrc}
                x={50 + (item.imgOffsetX || 0) - (50 * (item.imgScale || 1))}
                y={50 + (item.imgOffsetY || 0) - (50 * (item.imgScale || 1))}
                width={100 * (item.imgScale || 1)}
                height={100 * (item.imgScale || 1)}
                transform={`translate(50, 50) rotate(${item.imgRotation || 0}) scale(${item.imgMirrorH ? -1 : 1}, ${item.imgMirrorV ? -1 : 1}) translate(-50, -50)`}
              />
            ) : (
              RENDER_LANDSCAPE_SVG_NODES(item.id)
            )}
          </g>

          {/* Solid contour outline layer to draw actual outline borders inside the mold boundary limit */}
          {item.contourWidth && item.contourWidth > 0 && (
            <g dangerouslySetInnerHTML={{ __html: shapeMarkup }} fill="none" stroke={item.contourColor || '#000000'} strokeWidth={item.contourWidth} style={{ pointerEvents: 'auto' }} />
          )}
        </svg>
      );
    }
  };

  // Arc curved text path generator for SVG textpath
  const generateArcPath = (w: number, h: number, curveVal: number) => {
    const radius = Math.abs(curveVal || 80);
    const direction = curveVal >= 0 ? 1 : 0; // sweep flag
    
    // Draw horizontal path slightly suspended inside standard 0 0 100 100 viewbox
    if (curveVal >= 0) {
      // arching down
      return `M 10,35 A ${radius},${radius} 0 0,1 90,35`;
    } else {
      // arching up
      return `M 10,70 A ${radius},${radius} 0 0,0 90,70`;
    }
  };

  return (
    <div 
      className="flex-1 overflow-auto bg-slate-100 relative flex p-12 select-none custom-scrollbar"
      id="canvas-viewport"
      onClick={() => onSelectItem(null)}
    >
      {/* Scrollable area wrapper to size centering */}
      <div 
        className="relative scrollbar-none my-auto mx-auto shrink-0 transition-all duration-75"
        style={{
          width: `${pagePxWidth + (showRuler ? 26 : 0)}px`,
          height: `${pagePxHeight + (showRuler ? 26 : 0)}px`,
        }}
      >
        {/* Centered actual size A4 Sheet */}
        <div
          id="a4-sheet"
          ref={fileSheetRef}
          className="a4-print-sheet bg-white border border-zinc-200 shadow-xl absolute transition-all duration-75 overflow-hidden shrink-0"
          style={{
            width: `${pagePxWidth}px`,
            height: `${pagePxHeight}px`,
            left: showRuler ? '26px' : '0',
            top: showRuler ? '26px' : '0',
          }}
          onClick={(e) => {
            // Prevent auto selection clearing when clicking directly on sheet content
            e.stopPropagation();
            onSelectItem(null);
          }}
        >
          
          {/* Centimeter Alignment Grid overlay */}
          {showGrid && (
            <div 
              className="absolute inset-0 pointer-events-none select-none"
              style={{
                backgroundImage: `
                  radial-gradient(circle, rgba(99, 102, 241, 0.15) 1px, transparent 1px),
                  linear-gradient(to right, rgba(99, 102, 241, 0.05) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(99, 102, 241, 0.05) 1px, transparent 1px)
                `,
                backgroundSize: `${pxPerMm}px ${pxPerMm}px, ${pxPerMm * 10}px ${pxPerMm * 10}px, ${pxPerMm * 10}px ${pxPerMm * 10}px`,
              }}
            />
          )}

          {/* Editor Items rendering loop */}
          {items.map((item, index) => {
            const isSelected = item.id === selectedItemId;
            const xPx = item.x * pxPerMm;
            const yPx = item.y * pxPerMm;
            const wPx = item.width * pxPerMm;
            const hPx = item.height * pxPerMm;

            return (
              <div
                id={`editor-item-${item.id}`}
                key={item.id}
                className="absolute select-none group"
                style={{
                  left: `${xPx}px`,
                  top: `${yPx}px`,
                  width: `${wPx}px`,
                  height: `${hPx}px`,
                  transform: `rotate(${item.rotation || 0}deg) scale(${item.mirrorH ? -1 : 1}, ${item.mirrorV ? -1 : 1})`,
                  transformOrigin: 'center center',
                  opacity: item.opacity ?? 1.0,
                  cursor: item.isLocked ? 'not-allowed' : 'move',
                  zIndex: (index + 1),
                  pointerEvents: 'none',
                }}
                onMouseDown={(e) => handleStartDrag(e, item, 'drag')}
                onTouchStart={(e) => handleStartDrag(e, item, 'drag')}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectItem(item.id);
                }}
                onDragOver={(e) => {
                  if (item.type === 'mold' || item.isTextMold) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                  }
                }}
                onDrop={(e) => {
                  if (item.type === 'mold' || item.isTextMold) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Try to extract Base64 data from our sidebar uploads
                    const droppedBase64 = e.dataTransfer.getData("text/plain");
                    if (droppedBase64 && droppedBase64.startsWith("data:image")) {
                      compressImage(droppedBase64).then((compressedBase64) => {
                        onUpdateItem({
                          ...item,
                          imgSrc: compressedBase64
                        });
                        onSelectItem(item.id);
                      });
                      return;
                    }

                    // Try to extract real files dropped from user's machine
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const file = e.dataTransfer.files[0];
                      if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          compressImage(reader.result as string).then((compressedBase64) => {
                            onUpdateItem({
                              ...item,
                              imgSrc: compressedBase64
                            });
                            onSelectItem(item.id);
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }
                  }
                }}
              >
                {/* Visual content: Mold with Mask vs Plain Text vs Curved Text */}
                <div className="w-full h-full pointer-events-none">
                  {item.type === 'mold' ? (
                    renderMoldShape(item)
                  ) : item.type === 'text' ? (
                    <div
                      id={`text-rendering-p-${item.id}`}
                      className="w-full h-full flex items-center justify-center select-none pointer-events-auto"
                      style={{
                        fontFamily: item.fontFamily || 'sans-serif',
                        fontSize: `${(item.fontSize || 12) * zoom}px`,
                        color: item.fillColor || '#000000',
                        fontWeight: item.isBold ? 'bold' : 'normal',
                        fontStyle: item.isItalic ? 'italic' : 'normal',
                        textAlign: item.align || 'center',
                        letterSpacing: item.letterSpacing ? `${item.letterSpacing}px` : undefined,
                        WebkitTextStroke: item.strokeWidth && item.strokeWidth > 0 
                          ? `${item.strokeWidth * zoom}px ${item.strokeColor || '#000000'}` 
                          : 'none',
                        pointerEvents: 'auto',
                      }}
                    >
                      {item.text || 'Clique para escrever'}
                    </div>
                  ) : item.type === 'curved-text' ? (
                    // SVG curved arc content
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible pointer-events-none">
                      <defs>
                        <path 
                          id={`arc-text-path-${item.id}`} 
                          d={generateArcPath(100, 100, item.curveRadius || 80)} 
                          fill="none" 
                        />
                      </defs>
                      <text 
                        fill={item.fillColor || '#000000'}
                        fontFamily={item.fontFamily || 'sans-serif'}
                        fontSize={`${(item.fontSize || 12) * zoom * 0.7}px`}
                        fontWeight={item.isBold ? 'bold' : 'normal'}
                        fontStyle={item.isItalic ? 'italic' : 'normal'}
                        letterSpacing={item.letterSpacing ? `${item.letterSpacing * 0.2}px` : undefined}
                        stroke={item.strokeColor || '#000000'}
                        strokeWidth={item.strokeWidth ? item.strokeWidth * 0.1 : 0}
                        style={{ pointerEvents: 'auto' }}
                      >
                        <textPath 
                          href={`#arc-text-path-${item.id}`} 
                          startOffset="50%" 
                          textAnchor="middle"
                        >
                          {item.text || 'Texto Curvado'}
                        </textPath>
                      </text>
                    </svg>
                  ) : null}
                </div>

                {/* Selection helper bounding handles */}
                {isSelected && !item.isLocked && (() => {
                  const bbox = shapeBBoxes[item.id] || { x: 0, y: 0, width: 100, height: 100 };
                  const subBoxStyle: React.CSSProperties = {
                    left: `${bbox.x}%`,
                    top: `${bbox.y}%`,
                    width: `${bbox.width}%`,
                    height: `${bbox.height}%`,
                  };
                  return (
                    <div 
                      className="absolute border-2 border-indigo-500 pointer-events-none z-30 shadow shadow-indigo-500/20"
                      style={subBoxStyle}
                    >
                      {/* Scale corner indicator bottom-right */}
                      <div
                        id={`scale-handle-br-${item.id}`}
                        className="absolute bottom-[-6px] right-[-6px] w-3 h-3 bg-white border-2 border-indigo-600 rounded-full pointer-events-auto cursor-se-resize shadow"
                        onMouseDown={(e) => handleStartDrag(e, item, 'resize-br')}
                        onTouchStart={(e) => handleStartDrag(e, item, 'resize-br')}
                      />

                      {/* Scale right indicator */}
                      <div
                        id={`scale-handle-r-${item.id}`}
                        className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full pointer-events-auto cursor-e-resize shadow"
                        onMouseDown={(e) => handleStartDrag(e, item, 'resize-r')}
                        onTouchStart={(e) => handleStartDrag(e, item, 'resize-r')}
                        title="Ajustar largura"
                      />

                      {/* Scale bottom indicator */}
                      <div
                        id={`scale-handle-b-${item.id}`}
                        className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full pointer-events-auto cursor-s-resize shadow"
                        onMouseDown={(e) => handleStartDrag(e, item, 'resize-b')}
                        onTouchStart={(e) => handleStartDrag(e, item, 'resize-b')}
                        title="Ajustar altura"
                      />
                      
                      {/* Centered dot axis indicator */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full pointer-events-none" />
                    </div>
                  );
                })()}
              </div>
            );
          })}

        </div>

        {/* Horizontal Ruler Scale */}
        {showRuler && (
          <div 
            className="absolute top-0 bg-[#f8fafc] border-b border-zinc-200 text-zinc-600 select-none pointer-events-none text-[8px] font-mono z-30"
            style={{
              width: `${pagePxWidth}px`,
              height: '26px',
              left: '26px',
            }}
          >
            {/* Draw centimeter metrics and mm sub-ticks using precise coordinates */}
            {Array.from({ length: 22 }).map((_, cm) => {
              const xCm = cm * 10 * pxPerMm;
              if (xCm > pagePxWidth + 0.1) return null;
              
              return (
                <React.Fragment key={cm}>
                  {/* Centimeter tick line */}
                  <div 
                    className="absolute bottom-0 w-px bg-zinc-400" 
                    style={{ 
                      left: `${xCm}px`, 
                      height: '11px' 
                    }} 
                  />
                  
                  {/* Centimeter Label */}
                  <div 
                    className="absolute text-zinc-600 font-bold"
                    style={{
                      left: `${xCm + 3}px`,
                      bottom: '11px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {cm} cm
                  </div>
                  
                  {/* Millimeter sub-ticks (1 to 9) */}
                  {cm < 21 && Array.from({ length: 9 }).map((_, mIdx) => {
                    const m = mIdx + 1;
                    const xMm = xCm + m * pxPerMm;
                    if (xMm > pagePxWidth) return null;
                    const isFive = m === 5;
                    
                    return (
                      <div 
                        key={m}
                        className="absolute bottom-0 w-px"
                        style={{
                          left: `${xMm}px`,
                          height: isFive ? '6px' : '4px',
                          backgroundColor: isFive ? '#a1a1aa' : '#e4e4e7'
                        }}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Vertical Ruler Scale */}
        {showRuler && (
          <div 
            className="absolute left-0 bg-[#f8fafc] border-r border-zinc-200 text-zinc-600 select-none pointer-events-none text-[8px] font-mono z-30"
            style={{
              width: '26px',
              height: `${pagePxHeight}px`,
              top: '26px',
            }}
          >
            {/* Draw centimeter ticks and mm sub-ticks using precise coordinates */}
            {Array.from({ length: 31 }).map((_, cm) => {
              const yCm = cm * 10 * pxPerMm;
              if (yCm > pagePxHeight + 0.1) return null;
              
              return (
                <React.Fragment key={cm}>
                  {/* Centimeter tick line */}
                  <div 
                    className="absolute right-0 h-px bg-zinc-400" 
                    style={{ 
                      top: `${yCm}px`, 
                      width: '11px' 
                    }} 
                  />
                  
                  {/* Centimeter Label */}
                  <div 
                    className="absolute text-zinc-600 font-bold text-right font-mono text-[8px]"
                    style={{
                      top: `${yCm}px`,
                      right: '13px',
                      transform: 'translateY(-50%)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {cm}
                  </div>
                  
                  {/* Millimeter sub-ticks (1 to 9) */}
                  {cm < 30 && Array.from({ length: 9 }).map((_, mIdx) => {
                    const m = mIdx + 1;
                    const yMm = yCm + m * pxPerMm;
                    if (yMm > pagePxHeight) return null;
                    const isFive = m === 5;
                    
                    return (
                      <div 
                        key={m}
                        className="absolute right-0 h-px"
                        style={{
                          top: `${yMm}px`,
                          width: isFive ? '6px' : '4px',
                          backgroundColor: isFive ? '#a1a1aa' : '#e4e4e7'
                        }}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
