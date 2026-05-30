export interface Point {
  x: number;
  y: number;
}

export interface MatrixOp {
  id: string;
  name: string;
  i: Point;
  j: Point;
  active: boolean;
  type?: 'multiply' | 'add';
}
