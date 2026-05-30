import React, { useState } from 'react';
import { Point, MatrixOp } from '../types';
import { calcDeterminant, calcEigenvalues } from '../utils';
import { Toggle } from './Toggle';
import { RotateCw, Scaling, Scissors, BoxSelect, Maximize2, Plus, Trash2 } from 'lucide-react';

interface SidebarProps {
  iVec: Point;
  jVec: Point;
  onApplyPreset: (i: Point, j: Point) => void;
  operations: MatrixOp[];
  onOperationsChange: (ops: MatrixOp[]) => void;
  snapToGrid: boolean;
  setSnapToGrid: (v: boolean) => void;
  showTransformedGrid: boolean;
  setShowTransformedGrid: (v: boolean) => void;
  showShape: boolean;
  setShowShape: (v: boolean) => void;
  showUnitGuides: boolean;
  setShowUnitGuides: (v: boolean) => void;
  showArea: boolean;
  setShowArea: (v: boolean) => void;
  animateTransitions: boolean;
  setAnimateTransitions: (v: boolean) => void;
  history: {i: Point, j: Point}[];
  onRestoreHistory: (i: Point, j: Point) => void;
  onClearHistory: () => void;
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
  const {
    iVec, jVec, onApplyPreset,
    operations, onOperationsChange,
    snapToGrid, setSnapToGrid,
    showTransformedGrid, setShowTransformedGrid,
    showShape, setShowShape,
    showUnitGuides, setShowUnitGuides,
    showArea, setShowArea,
    animateTransitions, setAnimateTransitions,
    history, onRestoreHistory, onClearHistory
  } = props;

  const det = calcDeterminant(iVec, jVec);
  const eigen = calcEigenvalues(iVec, jVec);

  const trace = iVec.x + jVec.y;

  const presets = [
    { label: 'IDENTITY', i: {x:1, y:0}, j: {x:0, y:1} },
    { label: 'SHEAR X', i: {x:1, y:0}, j: {x:1, y:1} },
    { label: 'ROTATE 90°', i: {x:0, y:1}, j: {x:-1, y:0} },
    { label: 'SCALE 2X', i: {x:2, y:0}, j: {x:0, y:2} },
    { label: 'PROJECTION (X)', i: {x:1, y:0}, j: {x:0, y:0} },
  ];

  const [customMatrix, setCustomMatrix] = useState({ b11: 1, b12: 0, b21: 0, b22: 1 });

  const handleMultiplyBA = () => {
    addOperation(
      'Multiply Custom Matrix (B)',
      { x: customMatrix.b11, y: customMatrix.b21 },
      { x: customMatrix.b12, y: customMatrix.b22 },
      'multiply'
    );
  };

  const handleAddBA = () => {
    addOperation(
      'Add Custom Matrix (+B)',
      { x: customMatrix.b11, y: customMatrix.b21 },
      { x: customMatrix.b12, y: customMatrix.b22 },
      'add'
    );
  };

  const handleApplyInverse = () => {
    if (Math.abs(det) < 0.000001) {
      alert("Matrix is singular (determinant is 0), cannot invert.");
      return;
    }
    const invDet = 1 / det;
    const newI = {
      x: jVec.y * invDet,
      y: -iVec.y * invDet
    };
    const newJ = {
      x: -jVec.x * invDet,
      y: iVec.x * invDet
    };
    onApplyPreset(newI, newJ);
  };

  const addOperation = (label: string, i: Point, j: Point, type: 'multiply' | 'add' = 'multiply') => {
    const newOp: MatrixOp = {
      id: Math.random().toString(36).substr(2, 9),
      name: label,
      i, j,
      active: true,
      type
    };
    onOperationsChange([...operations, newOp]);
  };

  const toggleOp = (id: string) => {
    onOperationsChange(operations.map(op => op.id === id ? { ...op, active: !op.active } : op));
  };

  const removeOp = (id: string) => {
    onOperationsChange(operations.filter(op => op.id !== id));
  };

  const getNetPipelineMatrix = () => {
    let curr = { i: { x: 1, y: 0 }, j: { x: 0, y: 1 } };
    for (const op of operations) {
      if (op.active) {
        if (op.type === 'add') {
          curr = {
            i: { x: curr.i.x + op.i.x, y: curr.i.y + op.i.y },
            j: { x: curr.j.x + op.j.x, y: curr.j.y + op.j.y }
          };
        } else {
          curr = {
            i: {
              x: op.i.x * curr.i.x + op.j.x * curr.i.y,
              y: op.i.y * curr.i.x + op.j.y * curr.i.y
            },
            j: {
              x: op.i.x * curr.j.x + op.j.x * curr.j.y,
              y: op.i.y * curr.j.x + op.j.y * curr.j.y
            }
          };
        }
      }
    }
    return curr;
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-r border-slate-800 bg-slate-900 p-4 md:p-6 shrink-0 overflow-y-auto max-h-[50vh] md:max-h-full">
      <div className="mb-8">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Transformation Matrix (A)</h3>
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="space-y-1">
              <label className="text-[10px] text-sky-500 font-mono">a₁₁</label>
              <div className="w-full bg-slate-900 border border-slate-700 rounded p-2 font-mono text-sm text-white focus:outline-none focus:border-sky-500">
                {iVec.x.toFixed(2)}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-sky-500 font-mono">a₁₂</label>
              <div className="w-full bg-slate-900 border border-slate-700 rounded p-2 font-mono text-sm text-white focus:outline-none focus:border-sky-500">
                {jVec.x.toFixed(2)}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-sky-500 font-mono">a₂₁</label>
              <div className="w-full bg-slate-900 border border-slate-700 rounded p-2 font-mono text-sm text-white focus:outline-none focus:border-sky-500">
                {iVec.y.toFixed(2)}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-sky-500 font-mono">a₂₂</label>
              <div className="w-full bg-slate-900 border border-slate-700 rounded p-2 font-mono text-sm text-white focus:outline-none focus:border-sky-500">
                {jVec.y.toFixed(2)}
              </div>
            </div>
          </div>
          <button 
            className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-bold text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
            onClick={handleApplyInverse}
            disabled={Math.abs(det) < 0.000001}
            title="Apply Inverse Matrix (Undo mapping)"
          >
            Apply Inverse Matrix (A⁻¹)
          </button>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Custom Matrix (B)</h3>
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="space-y-1">
              <label className="text-[10px] text-emerald-500 font-mono">b₁₁</label>
              <input
                type="number" step="0.5"
                value={customMatrix.b11}
                onChange={(e) => setCustomMatrix({...customMatrix, b11: Number(e.target.value)})}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 font-mono text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-emerald-500 font-mono">b₁₂</label>
              <input
                type="number" step="0.5"
                value={customMatrix.b12}
                onChange={(e) => setCustomMatrix({...customMatrix, b12: Number(e.target.value)})}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 font-mono text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-emerald-500 font-mono">b₂₁</label>
              <input
                type="number" step="0.5"
                value={customMatrix.b21}
                onChange={(e) => setCustomMatrix({...customMatrix, b21: Number(e.target.value)})}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 font-mono text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-emerald-500 font-mono">b₂₂</label>
              <input
                type="number" step="0.5"
                value={customMatrix.b22}
                onChange={(e) => setCustomMatrix({...customMatrix, b22: Number(e.target.value)})}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 font-mono text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              className="flex-1 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded text-xs font-bold transition-colors" 
              onClick={handleMultiplyBA}
              title="Multiply A by B: B × A"
            >
              Multiply (B × A)
            </button>
            <button 
              className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-bold text-slate-300 transition-colors" 
              onClick={handleAddBA}
              title="Add matrices: A + B"
            >
              Add (A + B)
            </button>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Matrix Properties</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-slate-800">
            <span className="text-sm text-slate-400">Determinant</span>
            <span className={`font-mono text-sm ${det < 0 ? 'text-rose-400' : 'text-white'}`}>
              {det.toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-800">
            <span className="text-sm text-slate-400">Trace</span>
            <span className="font-mono text-white text-sm">
              {trace.toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-800">
            <span className="text-sm text-slate-400">Angle θ(î)</span>
            <span className="font-mono text-sky-400 text-sm">
              {((Math.atan2(iVec.y, iVec.x) * 180 / Math.PI + 360) % 360).toFixed(1)}°
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-800">
            <span className="text-sm text-slate-400">Angle θ(ĵ)</span>
            <span className="font-mono text-rose-400 text-sm">
              {((Math.atan2(jVec.y, jVec.x) * 180 / Math.PI + 360) % 360).toFixed(1)}°
            </span>
          </div>
          
          <div className="py-3">
            <span className="text-xs text-slate-400 block mb-2 font-medium">Eigenvalues (λ)</span>
            <div className="flex flex-col gap-1.5">
              {eigen.type === 'real' ? (
                <>
                  <div className="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
                    <span className="text-xs font-mono font-bold text-emerald-400">λ₁</span>
                    <span className="font-mono text-sm text-slate-200">{eigen.lambda1.toFixed(3)}</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
                    <span className="text-xs font-mono font-bold text-amber-400">λ₂</span>
                    <span className="font-mono text-sm text-slate-200">{eigen.lambda2.toFixed(3)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
                    <span className="text-xs font-mono font-bold text-emerald-400">λ₁</span>
                    <span className="font-mono text-sm text-slate-200">{eigen.real.toFixed(3)} + {eigen.imag.toFixed(3)}i</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
                    <span className="text-xs font-mono font-bold text-amber-400">λ₂</span>
                    <span className="font-mono text-sm text-slate-200">{eigen.real.toFixed(3)} - {eigen.imag.toFixed(3)}i</span>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {det < 0 && (
             <div className="text-xs text-rose-500/80 bg-rose-500/10 px-3 py-2 rounded border border-rose-500/20 mt-4">
               Space is flipped. Orientation reversed.
             </div>
           )}
           {det === 0 && (
             <div className="text-xs text-slate-400 bg-slate-800 px-3 py-2 rounded border border-slate-700 mt-4">
               Linearly dependent. Space compressed.
             </div>
           )}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Visual Overlays</h3>
        <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <Toggle label="Snap to Grid (0.5)" checked={snapToGrid} onChange={setSnapToGrid} />
          <Toggle label="Show Transformed Grid" checked={showTransformedGrid} onChange={setShowTransformedGrid} />
          <Toggle label="Show Determinant Area" checked={showArea} onChange={setShowArea} />
          <Toggle label="Show Target Shape" checked={showShape} onChange={setShowShape} />
          <Toggle label="Show Unit Vectors" checked={showUnitGuides} onChange={setShowUnitGuides} />
          <Toggle label="Animate Transitions" checked={animateTransitions} onChange={setAnimateTransitions} />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Operations Pipeline</h3>
            {operations.length > 0 && (
              <button 
                onClick={() => onOperationsChange([])}
                className="text-[10px] text-slate-500 hover:text-rose-400 font-bold uppercase transition-colors"
              >
                Clear Stack
              </button>
            )}
          </div>
          
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 space-y-2 mb-4">
            {operations.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4 italic">No active operations.</p>
            ) : (
              operations.map((op, index) => (
                <div key={op.id} className={`flex items-center justify-between p-2 rounded border ${op.active ? 'bg-slate-900 border-slate-700' : 'bg-slate-900/50 border-slate-800 opacity-50'}`}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleOp(op.id)} className="text-slate-400 hover:text-sky-400">
                      <div className={`w-3 h-3 rounded-sm border ${op.active ? 'bg-sky-500 border-sky-400' : 'border-slate-500'}`} />
                    </button>
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                      {index + 1}. <span className={op.type === 'add' ? 'text-emerald-400' : 'text-sky-400'}>[{op.type === 'add' ? '+' : '×'}]</span> {op.name}
                    </span>
                  </div>
                  <button onClick={() => removeOp(op.id)} className="text-slate-500 hover:text-rose-400">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
            {operations.length > 0 && (() => {
              const net = getNetPipelineMatrix();
              return (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Net Transformation:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-slate-900 border border-slate-700 rounded p-1.5 flex justify-between items-center">
                      <span className="text-sky-500 text-[10px] uppercase px-1">î</span>
                      <span className="text-slate-300">[{net.i.x.toFixed(2)}, {net.i.y.toFixed(2)}]</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 rounded p-1.5 flex justify-between items-center">
                      <span className="text-rose-500 text-[10px] uppercase px-1">ĵ</span>
                      <span className="text-slate-300">[{net.j.x.toFixed(2)}, {net.j.y.toFixed(2)}]</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-2">Add Operation</h4>
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <button 
                key={p.label}
                onClick={() => addOperation(p.label, p.i, p.j)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[10px] font-bold text-slate-300 transition-colors flex items-center gap-1"
                title={`Add ${p.label} to pipeline`}
              >
                <Plus size={10} /> {p.label}
              </button>
            ))}
          </div>
        </div>

        {history.length > 0 && (
          <div className="mb-8">
             <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">History Stack</h3>
              <button 
                onClick={onClearHistory}
                className="text-[10px] text-slate-500 hover:text-rose-400 font-bold uppercase transition-colors"
                title="Clear History"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {history.map((h, idx) => (
                <button
                  key={idx}
                  onClick={() => onRestoreHistory(h.i, h.j)}
                  className="flex items-center justify-between px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-300 transition-colors"
                >
                  <span className="font-mono text-[10px]">
                    î:[{h.i.x.toFixed(1)},{h.i.y.toFixed(1)}] ĵ:[{h.j.x.toFixed(1)},{h.j.y.toFixed(1)}]
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">Revert</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Base Presets</h3>
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <button 
                key={p.label}
                onClick={() => onApplyPreset(p.i, p.j)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[10px] font-bold text-slate-300 transition-colors"
                title={`Set Base Matrix to ${p.label}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 bg-slate-800/40 rounded-lg border border-slate-700 mb-6">
          <h4 className="text-xs font-semibold text-slate-300 mb-2">Pro-tip</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Drag the basis vector handles <span className="text-sky-400">î</span> and <span className="text-rose-400">ĵ</span> on the canvas to live-update the base matrix.
          </p>
        </div>
      </div>
    </aside>
  );
};
