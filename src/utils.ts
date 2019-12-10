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

export const forceFocus = (element: SVGElement | null): void => {
  if (!element) return;

  if (typeof element.focus === 'function') {
    element.focus();
  } else {
    // IE11 doesn't have the focus method, so we use this hack from
    // https://allyjs.io/tutorials/focusing-in-svg.html#focusing-svg-elements
    try {
      HTMLElement.prototype.focus.apply(element);
    } catch (error) {
      // silence the error
    }
  }
};

/**
 * Returns elements underneath the specified x and y coordinates.
 * @param clientX
 * @param clientY
 */
export const getElementsFromPoint = (
  clientX: number,
  clientY: number
): Element[] => {
  // eslint-disable-next-line dot-notation
  return typeof document['msElementsFromPoint'] === 'function'
    ? Array.prototype.slice.call(
        // msElementsFromPoint returns null when there are no elements
        // found
        // eslint-disable-next-line dot-notation
        document['msElementsFromPoint'](clientX, clientY) || []
      )
    : document.elementsFromPoint(clientX, clientY);
};
