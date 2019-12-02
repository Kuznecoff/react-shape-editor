export type ShapeId = string;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ConstrainMoveFunc {
  (
    args: Readonly<{
      x: number;
      y: number;
      width: number;
      height: number;
      originalX: number;
      originalY: number;
      vectorWidth: number;
      vectorHeight: number;
    }>
  ): Point;
}

export interface ConstrainResizeFunc {
  (
    args: Readonly<{
      originalMovingCorner: Point;
      startCorner: Point;
      movingCorner: Point;
      lockedDimension: 'x' | 'y' | null;
      vectorWidth: number;
      vectorHeight: number;
    }>
  ): Point;
}

export interface ShapeActions {
  props: object;
  forceFocus: () => void;
  simulateTransform: (nextRect: Rectangle) => void;
}
