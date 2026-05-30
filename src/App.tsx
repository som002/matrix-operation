/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Point, MatrixOp } from './types';
import { VectorCanvas } from './components/VectorCanvas';
import { Sidebar } from './components/Sidebar';

const multiplyMat = (A: {i: Point, j: Point}, B: {i: Point, j: Point}) => ({
  i: {
    x: A.i.x * B.i.x + A.j.x * B.i.y,
    y: A.i.y * B.i.x + A.j.y * B.i.y
  },
  j: {
    x: A.i.x * B.j.x + A.j.x * B.j.y,
    y: A.i.y * B.j.x + A.j.y * B.j.y
  }
});

const applyPipeline = (base: {i: Point, j: Point}, ops: MatrixOp[]) => {
  let curr = base;
  for (const op of ops) {
    if (op.active) {
      if (op.type === 'add') {
        curr = {
          i: { x: curr.i.x + op.i.x, y: curr.i.y + op.i.y },
          j: { x: curr.j.x + op.j.x, y: curr.j.y + op.j.y }
        };
      } else {
        curr = multiplyMat(op, curr);
      }
    }
  }
  return curr;
};

const invertPipeline = (target: {i: Point, j: Point}, ops: MatrixOp[]) => {
  let curr = target;
  for (let k = ops.length - 1; k >= 0; k--) {
    const op = ops[k];
    if (op.active) {
      if (op.type === 'add') {
        curr = {
          i: { x: curr.i.x - op.i.x, y: curr.i.y - op.i.y },
          j: { x: curr.j.x - op.j.x, y: curr.j.y - op.j.y }
        };
      } else {
        const det = op.i.x * op.j.y - op.i.y * op.j.x;
        if (Math.abs(det) < 0.000001) return null;
        const inv = {
          i: { x: op.j.y / det, y: -op.i.y / det },
          j: { x: -op.j.x / det, y: op.i.x / det }
        };
        curr = multiplyMat(inv, curr);
      }
    }
  }
  return curr;
};

export default function App() {
  const [iVec, setIVec] = useState<Point>({ x: 1, y: 0 });
  const [jVec, setJVec] = useState<Point>({ x: 0, y: 1 });
  
  const [baseMatrix, setBaseMatrix] = useState<{i: Point, j: Point}>({ i: {x:1, y:0}, j: {x:0, y:1} });
  const [operations, setOperations] = useState<MatrixOp[]>([]);

  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showTransformedGrid, setShowTransformedGrid] = useState(true);
  const [showShape, setShowShape] = useState(true);
  const [showUnitGuides, setShowUnitGuides] = useState(true);
  const [showArea, setShowArea] = useState(true);
  const [animateTransitions, setAnimateTransitions] = useState(true);
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState(1);
  
  // We'll store history of TOTAL matrices for simplicity
  const [history, setHistory] = useState<{i: Point, j: Point}[]>([]);

  const iVecRef = useRef(iVec);
  const jVecRef = useRef(jVec);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    iVecRef.current = iVec;
    jVecRef.current = jVec;
  }, [iVec, jVec]);

  const pushToHistory = () => {
    setHistory(prev => {
      const curI = iVecRef.current;
      const curJ = jVecRef.current;
      if (prev.length > 0 && prev[0].i.x === curI.x && prev[0].i.y === curI.y && prev[0].j.x === curJ.x && prev[0].j.y === curJ.y) {
        return prev;
      }
      return [{ i: curI, j: curJ }, ...prev].slice(0, 5);
    });
  };

  const onRestoreHistory = (hI: Point, hJ: Point) => {
    pushToHistory();
    setOperations([]);
    setBaseMatrix({ i: hI, j: hJ });
    applyTransformation(hI, hJ, false);
  };

  const applyTransformation = (newI: Point, newJ: Point, isDrag = false) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    if (isDrag || !animateTransitions) {
      setIVec(newI);
      setJVec(newJ);
      return;
    }

    const startI = { ...iVecRef.current };
    const startJ = { ...jVecRef.current };
    const startTime = performance.now();
    const duration = 600;

    const tick = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      setIVec({
        x: startI.x + (newI.x - startI.x) * ease,
        y: startI.y + (newI.y - startI.y) * ease,
      });
      setJVec({
        x: startJ.x + (newJ.x - startJ.x) * ease,
        y: startJ.y + (newJ.y - startJ.y) * ease,
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(tick);
      }
    };

    animationRef.current = requestAnimationFrame(tick);
  };

  const onVectorsChange = (newI: Point, newJ: Point) => {
    const newBase = invertPipeline({ i: newI, j: newJ }, operations);
    if (!newBase) return; // Singular operations stack, drag ignored
    
    setBaseMatrix(newBase);
    applyTransformation(newI, newJ, true);
  };

  const applyPreset = (newI: Point, newJ: Point) => {
    if (!animationRef.current) pushToHistory();
    setOperations([]);
    setBaseMatrix({ i: newI, j: newJ });
    applyTransformation(newI, newJ, false);
  };

  const handleOperationsChange = (newOps: MatrixOp[]) => {
    pushToHistory();
    setOperations(newOps);
    const target = applyPipeline(baseMatrix, newOps);
    applyTransformation(target.i, target.j, false);
  };

  return (
    <div className="w-full h-[100dvh] bg-slate-950 text-slate-200 font-sans flex flex-col overflow-hidden">
      <nav className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 shrink-0 relative z-20">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500 rounded flex items-center justify-center">
              <span className="font-bold text-slate-950">L</span>
            </div>
            <span className="font-semibold text-lg tracking-tight uppercase text-slate-100">
              LinearX <span className="text-sky-400 font-normal">Visualizer</span>
            </span>
         </div>
      </nav>
      
      <main className="flex-1 flex flex-col-reverse md:flex-row overflow-hidden relative">
         <Sidebar 
            iVec={iVec} jVec={jVec} onApplyPreset={applyPreset}
            operations={operations} onOperationsChange={handleOperationsChange}
            snapToGrid={snapToGrid} setSnapToGrid={setSnapToGrid}
            showTransformedGrid={showTransformedGrid} setShowTransformedGrid={setShowTransformedGrid}
            showShape={showShape} setShowShape={setShowShape}
            showUnitGuides={showUnitGuides} setShowUnitGuides={setShowUnitGuides}
            showArea={showArea} setShowArea={setShowArea}
            animateTransitions={animateTransitions} setAnimateTransitions={setAnimateTransitions}
            fontSizeMultiplier={fontSizeMultiplier} setFontSizeMultiplier={setFontSizeMultiplier}
            history={history} onRestoreHistory={onRestoreHistory} onClearHistory={() => setHistory([])}
         />
         <div className="flex-1 relative bg-slate-950 min-h-[50vh] md:min-h-0">
            <VectorCanvas 
              iVec={iVec} jVec={jVec} onVectorsChange={onVectorsChange}
              snapToGrid={snapToGrid} showTransformedGrid={showTransformedGrid} showShape={showShape}
              showUnitGuides={showUnitGuides} showArea={showArea}
              fontSizeMultiplier={fontSizeMultiplier}
              onDragStart={pushToHistory}
            />
         </div>
      </main>
    </div>
  );
}
