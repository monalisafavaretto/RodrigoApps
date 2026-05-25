export interface EditorItem {
  id: string;
  type: 'mold' | 'text' | 'curved-text' | 'image';
  name: string;
  x: number; // in mm
  y: number; // in mm
  width: number; // in mm
  height: number; // in mm
  rotation: number; // in degrees
  isLocked: boolean;
  opacity: number; // 0 to 1
  mirrorH: boolean;
  mirrorV: boolean;

  // For text and curved-text
  text?: string;
  fontSize?: number; // in points or mm scaling
  fontFamily?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number; // in mm
  isBold?: boolean;
  isItalic?: boolean;
  align?: 'left' | 'center' | 'right';
  curveRadius?: number; // for curved text, e.g. -100 to 100
  letterSpacing?: number; // spacing modifier

  // For molds & masked objects
  isTextMold?: boolean; // Text acting as a clip mask (e.g. name / word)
  shapeType?: 'circle' | 'heart' | 'rectangle' | 'bone' | 'star' | 'pen' | 'letter' | 'number' | 'custom-trace';
  letterChar?: string; // A-Z or 0-9
  imgSrc?: string | null; // Base64 or local URL of the image dragged inside
  imgScale?: number; // 1 = default fit, typical 0.5 to 5
  imgOffsetX?: number; // offset in mm
  imgOffsetY?: number; // offset in mm
  imgRotation?: number; // image rotation inside the mold
  imgMirrorH?: boolean;
  imgMirrorV?: boolean;
  
  // Custom SVG path or PNG URL if custom mold imported
  customSvgPath?: string; 
  customPngMask?: string;

  // Cosmetics for the mold contour and filling
  contourColor?: string;
  contourWidth?: number; // in mm
  backgroundColor?: string; // Fill color if no image, or background padding
  
  // Ring hole settings (Furo de argola)
  hasHole?: boolean;
  holePosition?: 'top-center' | 'top-left' | 'top-right' | 'left-center' | 'right-center' | 'bottom-center';
  holeSize?: number; // diameter in mm (commonly 3mm to 6mm)
  holeOffset?: number; // offset in mm from edge
}

export interface Project {
  id: string;
  name: string;
  email: string; // bound to the login
  items: EditorItem[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  email: string;
}
