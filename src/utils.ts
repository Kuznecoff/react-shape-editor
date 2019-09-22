import {
  ConstrainMoveFunc,
  ConstrainResizeFunc,
  Point,
  Rectangle,
} from './types';

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
