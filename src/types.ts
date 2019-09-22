export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rectangle extends Point {
  readonly width: number;
  readonly height: number;
}

export interface ConstrainMoveFuncArgs {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly originalX: number;
  readonly originalY: number;
  readonly vectorWidth: number;
  readonly vectorHeight: number;
}
export interface ConstrainMoveFunc {
  (args: ConstrainMoveFuncArgs): Point;
}

export interface ConstrainResizeFuncArgs {
  readonly originalMovingCorner: Point;
  readonly startCorner: Point;
  readonly movingCorner: Point;
  readonly lockedDimension: 'x' | 'y' | null;
  readonly vectorWidth: number;
  readonly vectorHeight: number;
}
export interface ConstrainResizeFunc {
  (args: ConstrainResizeFuncArgs): Point;
}

export interface MouseHandlerFunc {
  (event: Event): void;
}
