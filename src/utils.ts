import { Point } from './types';

export const transformPoint = (p: Point, basisI: Point, basisJ: Point): Point => {
  return {
    x: p.x * basisI.x + p.y * basisJ.x,
    y: p.x * basisI.y + p.y * basisJ.y,
  };
};

export const calcDeterminant = (i: Point, j: Point): number => {
  return i.x * j.y - i.y * j.x;
};

export const snapPoint = (p: Point, snapSize = 0.5): Point => {
  return {
    x: Math.round(p.x / snapSize) * snapSize,
    y: Math.round(p.y / snapSize) * snapSize,
  };
};

export type Eigenvalues = 
  | { type: 'real'; lambda1: number; lambda2: number }
  | { type: 'complex'; real: number; imag: number };

export const calcEigenvalues = (i: Point, j: Point): Eigenvalues => {
  const trace = i.x + j.y;
  const det = calcDeterminant(i, j);
  const discrim = trace * trace - 4 * det;
  
  if (discrim >= 0) {
    const sqrtD = Math.sqrt(discrim);
    return {
      type: 'real',
      lambda1: (trace + sqrtD) / 2,
      lambda2: (trace - sqrtD) / 2,
    };
  } else {
    return {
      type: 'complex',
      real: trace / 2,
      imag: Math.sqrt(-discrim) / 2,
    };
  }
};

export const defaultHouse: Point[] = [
  { x: 0.5, y: 0 },
  { x: 2.5, y: 0 },
  { x: 2.5, y: 2 },
  { x: 1.5, y: 3 },
  { x: 0.5, y: 2 },
];
