interface Point {
  readonly x: number;
  readonly y: number;
}

interface Rectangle extends Point {
  readonly width: number;
  readonly height: number;
}

interface ConstrainMoveFuncArgs {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly originalX: number;
  readonly originalY: number;
  readonly vectorWidth: number;
  readonly vectorHeight: number;
}
interface ConstrainMoveFunc {
  (args: ConstrainMoveFuncArgs): Point;
}

interface ConstrainResizeFuncArgs {
  readonly originalMovingCorner: Point;
  readonly startCorner: Point;
  readonly movingCorner: Point;
  readonly lockedDimension: 'x' | 'y' | null;
  readonly vectorWidth: number;
  readonly vectorHeight: number;
}
interface ConstrainResizeFunc {
  (args: ConstrainResizeFuncArgs): Point;
}

export function getRectFromCornerCoordinates(
  corner1: Point,
  corner2: Point
): Rectangle {
  return {
    x: Math.min(corner1.x, corner2.x),
    y: Math.min(corner1.y, corner2.y),
    width: Math.abs(corner1.x - corner2.x),
    height: Math.abs(corner1.y - corner2.y),
  };
}

export const defaultConstrainMove: ConstrainMoveFunc = ({ x, y }) => ({
  x,
  y,
});
export const defaultConstrainResize: ConstrainResizeFunc = ({ movingCorner }) =>
  movingCorner;
