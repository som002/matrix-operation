import React, { useEffect, useRef, useState } from 'react';
import { Point } from '../types';
import { snapPoint, transformPoint, defaultHouse } from '../utils';

interface VectorCanvasProps {
  iVec: Point;
  jVec: Point;
  onVectorsChange: (i: Point, j: Point) => void;
  snapToGrid: boolean;
  showTransformedGrid: boolean;
  showShape: boolean;
  showUnitGuides: boolean;
  showArea: boolean;
  fontSizeMultiplier: number;
  onDragStart?: () => void;
}

export const VectorCanvas: React.FC<VectorCanvasProps> = ({
  iVec, jVec, onVectorsChange, snapToGrid, showTransformedGrid, showShape, showUnitGuides, showArea, fontSizeMultiplier, onDragStart
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragType, setDragType] = useState<'i' | 'j' | 'pan' | 'pinch' | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const lastMousePos = useRef({ x: 0, y: 0 });
  
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDist = useRef<number | null>(null);
  const initialZoom = useRef<number>(1);
  const dragPointerId = useRef<number | null>(null);

  useEffect(() => {
    if (!dragType) return;

    const handlePointerMove = (e: PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;

      if (activePointers.current.has(e.pointerId)) {
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (dragType === 'pinch' && activePointers.current.size === 2) {
          const pts = Array.from(activePointers.current.values());
          const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          if (initialPinchDist.current && initialPinchDist.current > 0) {
               const scale = initialPinchDist.current / dist;
               setZoom(Math.max(0.1, Math.min(10, initialZoom.current * scale)));
          }
          return;
      }

      if (dragType === 'pan') {
         const dx = e.clientX - lastMousePos.current.x;
         const dy = e.clientY - lastMousePos.current.y;
         
         const CTM = svg.getScreenCTM();
         if (!CTM) return;
         
         const scaleX = 1 / CTM.a;
         const scaleY = 1 / CTM.d;

         setPan(prev => ({
           x: prev.x - dx * scaleX,
           y: prev.y - dy * scaleY
         }));
         
         lastMousePos.current = { x: e.clientX, y: e.clientY };
         return;
      }
      
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const CTM = svg.getScreenCTM();
      if (!CTM) return;
      const svgP = pt.matrixTransform(CTM.inverse());
      
      const rawPos = { x: svgP.x, y: -svgP.y };
      const finalPos = snapToGrid ? snapPoint(rawPos, 0.5) : rawPos;
      
      if (dragType === 'i' && e.pointerId === dragPointerId.current) {
        onVectorsChange(finalPos, jVec);
      } else if (dragType === 'j' && e.pointerId === dragPointerId.current) {
        onVectorsChange(iVec, finalPos);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
        activePointers.current.delete(e.pointerId);
        
        if (dragType === 'pinch') {
            if (activePointers.current.size === 1) {
                setDragType('pan');
                const pts = Array.from(activePointers.current.values());
                lastMousePos.current = { x: pts[0].x, y: pts[0].y };
            } else if (activePointers.current.size === 0) {
                setDragType(null);
            }
        } else if (dragType === 'pan') {
            if (activePointers.current.size === 0) {
                setDragType(null);
            } else if (activePointers.current.size === 1) {
                const pts = Array.from(activePointers.current.values());
                lastMousePos.current = { x: pts[0].x, y: pts[0].y };
            }
        } else if (dragType === 'i' || dragType === 'j') {
            if (e.pointerId === dragPointerId.current) {
                setDragType(null);
                dragPointerId.current = null;
            }
        }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragType, iVec, jVec, snapToGrid, onVectorsChange]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 1.1;
      if (e.deltaY < 0) {
        setZoom(z => Math.max(0.1, z / zoomFactor));
      } else {
        setZoom(z => Math.min(10, z * zoomFactor));
      }
    };
    
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, []);

  const renderBackgroundGrid = () => {
    return (
      <g>
        <defs>
          <pattern id="dotGrid" width="1" height="1" patternUnits="userSpaceOnUse">
            <circle cx="0" cy="0" r={0.03 * zoom} fill="#334155" />
          </pattern>
        </defs>
        <rect x={-1000} y={-1000} width={2000} height={2000} fill="url(#dotGrid)" />
      </g>
    );
  };

  const renderTransformedGrid = () => {
    if (!showTransformedGrid) return null;
    const lines = [];
    const size = 15; 
    
    // Constant Y lines, mapped by matrix (moves along iVec direction)
    for (let c = -size; c <= size; c++) {
      if (c === 0) continue;
      const p1 = transformPoint({x: -size, y: c}, iVec, jVec);
      const p2 = transformPoint({x: size, y: c}, iVec, jVec);
      lines.push(<line key={`th${c}`} x1={p1.x} y1={-p1.y} x2={p2.x} y2={-p2.y} stroke="#38bdf8" strokeOpacity={0.15} strokeWidth={1} vectorEffect="non-scaling-stroke" />);
    }
    // Constant X lines, mapped by matrix (moves along jVec direction)
    for (let c = -size; c <= size; c++) {
      if (c === 0) continue;
      const p1 = transformPoint({x: c, y: -size}, iVec, jVec);
      const p2 = transformPoint({x: c, y: size}, iVec, jVec);
      lines.push(<line key={`tv${c}`} x1={p1.x} y1={-p1.y} x2={p2.x} y2={-p2.y} stroke="#fb7185" strokeOpacity={0.15} strokeWidth={1} vectorEffect="non-scaling-stroke" />);
    }
    return lines;
  };

  const renderShape = () => {
    if (!showShape) return null;
    const origPoints = defaultHouse.map(p => `${p.x},${-p.y}`).join(' ');
    const transPoints = defaultHouse.map(p => transformPoint(p, iVec, jVec)).map(p => `${p.x},${-p.y}`).join(' ');
    
    return (
      <g>
        <polygon points={origPoints} fill="none" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <polygon points={transPoints} fill="rgba(192, 132, 252, 0.3)" stroke="#c084fc" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </g>
    );
  };

  const renderParallelogram = () => {
    const det = iVec.x * jVec.y - iVec.y * jVec.x;
    const fillColor = det >= 0 ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)";
    const strokeColor = det >= 0 ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)";

    const p0 = { x: 0, y: 0 };
    const p1 = { x: iVec.x, y: -iVec.y };
    const p2 = { x: iVec.x + jVec.x, y: -(iVec.y + jVec.y) };
    const p3 = { x: jVec.x, y: -jVec.y };

    return (
      <polygon
        points={`${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    );
  };

  const fontScale = zoom * fontSizeMultiplier;

  return (
    <div 
      className={`w-full h-full relative overflow-hidden touch-none ${dragType === 'pan' ? 'cursor-grabbing' : 'cursor-crosshair'}`} style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        if (dragType === 'i' || dragType === 'j') return;
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        
        if (activePointers.current.size === 2) {
          setDragType('pinch');
          const pts = Array.from(activePointers.current.values());
          initialPinchDist.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          initialZoom.current = zoom;
        } else if (activePointers.current.size === 1) {
          setDragType('pan');
          lastMousePos.current = { x: e.clientX, y: e.clientY };
        }
      }}
    >
      <svg 
        ref={svgRef}
        viewBox={`${-10 * zoom + pan.x} ${-10 * zoom + pan.y} ${20 * zoom} ${20 * zoom}`}
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        {renderBackgroundGrid()}
        {renderTransformedGrid()}

        {/* Axes */}
        <line x1={-30} y1={0} x2={30} y2={0} stroke="#334155" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <line x1={0} y1={-30} x2={0} y2={30} stroke="#334155" strokeWidth={2} vectorEffect="non-scaling-stroke" />

        {showArea && renderParallelogram()}
        {renderShape()}

        <g>
          {showUnitGuides && (
            <>
              {/* Unit Vector X */}
              <line x1={0} y1={0} x2={1} y2={0} stroke="#0ea5e9" strokeWidth={2} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" strokeOpacity={0.7} />
              <text x={1 + 0.2 * fontScale} y={0.15 * fontScale} fill="#0ea5e9" fontSize={0.6 * fontScale} fontFamily="monospace" fontWeight="bold" opacity={0.9} className="pointer-events-none select-none">î (1,0)</text>
              
              {/* Unit Vector Y */}
              <line x1={0} y1={0} x2={0} y2={-1} stroke="#e11d48" strokeWidth={2} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" strokeOpacity={0.7} />
              <text x={0.2 * fontScale} y={-1 - 0.2 * fontScale} fill="#e11d48" fontSize={0.6 * fontScale} fontFamily="monospace" fontWeight="bold" opacity={0.9} className="pointer-events-none select-none">ĵ (0,1)</text>
            </>
          )}

          {/* I-Vector */}
          <line x1={0} y1={0} x2={iVec.x} y2={-iVec.y} stroke="#38bdf8" strokeWidth={3} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <circle 
            cx={iVec.x} cy={-iVec.y} r={0.3 * Math.min(1, zoom/2 + 0.5)} 
            fill="#38bdf8" 
            className="cursor-grab active:cursor-grabbing shadow-lg transition-all shadow-sky-500/50"
            onPointerDown={(e) => { e.stopPropagation(); onDragStart?.(); setDragType('i'); dragPointerId.current = e.pointerId; }}
          />
          <text x={iVec.x + 0.5 * fontScale} y={-iVec.y - 0.4 * fontScale} fill="#38bdf8" fontSize={0.6 * fontScale} fontWeight="bold" fontFamily="monospace" className="pointer-events-none select-none drop-shadow-md">T(î)</text>

          {/* J-Vector */}
          <line x1={0} y1={0} x2={jVec.x} y2={-jVec.y} stroke="#fb7185" strokeWidth={3} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <circle 
            cx={jVec.x} cy={-jVec.y} r={0.3 * Math.min(1, zoom/2 + 0.5)} 
            fill="#fb7185" 
            className="cursor-grab active:cursor-grabbing shadow-lg transition-all shadow-rose-500/50"
            onPointerDown={(e) => { e.stopPropagation(); onDragStart?.(); setDragType('j'); dragPointerId.current = e.pointerId; }}
          />
          <text x={jVec.x + 0.5 * fontScale} y={-jVec.y - 0.4 * fontScale} fill="#fb7185" fontSize={0.6 * fontScale} fontWeight="bold" fontFamily="monospace" className="pointer-events-none select-none drop-shadow-md">T(ĵ)</text>
          
          {/* Origin Dot */}
          <circle cx={0} cy={0} r={0.2} fill="white" className="pointer-events-none" />
        </g>
      </svg>
      
      <div className="absolute top-6 right-6 font-mono text-[11px] text-slate-500 flex flex-col md:flex-row gap-2 md:gap-4 pointer-events-none items-end md:items-center">
        <span className="bg-slate-900/50 px-2 py-1 rounded">PAN: {(-pan.x).toFixed(1)}, {pan.y.toFixed(1)}</span>
        <span className="bg-slate-900/50 px-2 py-1 rounded">ZOOM: {(1/zoom).toFixed(1)}x</span>
        <span className="bg-slate-900/50 px-2 py-1 rounded">VIEW: 2D_CARTESIAN</span>
      </div>

      <div className="absolute bottom-8 right-8 bg-slate-900/90 border border-slate-700 p-4 rounded-xl backdrop-blur-sm shadow-2xl space-y-4 pointer-events-none">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-bold block mb-2">Basis Vectors & Magnitudes</span>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.5)] shrink-0"></div>
              <span className="font-mono text-sm font-semibold text-slate-200 min-w-[120px]">î = [{iVec.x.toFixed(2)}, {iVec.y.toFixed(2)}]</span>
              <span className="font-mono text-xs text-sky-400/80 bg-sky-950/30 px-2 py-1 rounded border border-sky-900/50">|î| = {Math.hypot(iVec.x, iVec.y).toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(251,113,133,0.5)] shrink-0"></div>
              <span className="font-mono text-sm font-semibold text-slate-200 min-w-[120px]">ĵ = [{jVec.x.toFixed(2)}, {jVec.y.toFixed(2)}]</span>
              <span className="font-mono text-xs text-rose-400/80 bg-rose-950/30 px-2 py-1 rounded border border-rose-900/50">|ĵ| = {Math.hypot(jVec.x, jVec.y).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
