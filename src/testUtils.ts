/* eslint-disable import/no-extraneous-dependencies */

import { fireEvent } from '@testing-library/react';
import { Rectangle } from './types';

export { render, fireEvent } from '@testing-library/react';
export { default as EasyMode } from './testUtils/EasyMode';

export const SHAPE_TID = 'shape-rect';
export const SELECTION_TID = 'selection-rect';

export const mouseDrag = (
  el: Element,
  {
    x = 0,
    y = 0,
    dx,
    dy,
    midDragCb = () => {},
  }: { dx: number; dy: number; x?: number; y?: number; midDragCb?: () => void }
) => {
  fireEvent.mouseDown(el, { buttons: 1, clientX: x, clientY: y });
  fireEvent.mouseMove(el, { clientX: x + dx, clientY: y + dy });
  midDragCb();
  fireEvent.mouseUp(el, { clientX: x + dx, clientY: y + dy });
};

export const expectRect = (shape: Element, rect: Rectangle) => {
  const [, xString, yString] =
    ((shape.parentNode as Element).getAttribute('transform') as string).match(
      /^translate\(([^,]+),([^)]+)\)$/
    ) || [];
  expect(parseFloat(xString)).toBeCloseTo(rect.x);
  expect(parseFloat(yString)).toBeCloseTo(rect.y);
  expect(parseFloat(shape.getAttribute('width') as string)).toBeCloseTo(
    rect.width
  );
  expect(parseFloat(shape.getAttribute('height') as string)).toBeCloseTo(
    rect.height
  );
};

export const getDrawLayer = (container: HTMLElement): Element => {
  const el = container.querySelector('.rse-draw-layer');
  if (el === null) {
    throw new Error('No draw layer found');
  }

  return el;
};

export const getSelectionLayer = (container: HTMLElement): Element => {
  const el = container.querySelector('.rse-selection-layer');
  if (el === null) {
    throw new Error('No selection layer found');
  }

  return el;
};

export const getActiveElement = (): Element => {
  const el = document.activeElement;
  if (el === null) {
    throw new Error('No active element found');
  }

  return el;
};
