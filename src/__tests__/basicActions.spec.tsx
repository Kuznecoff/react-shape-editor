import React from 'react';
import { render, fireEvent, EasyMode } from '../testUtils';
import { Rectangle } from '../types';

const mouseDrag = (el, { dx, dy }) => {
  fireEvent.mouseDown(el, { clientX: 0, clientY: 0 });
  fireEvent.mouseMove(el, { clientX: dx, clientY: dy });
  fireEvent.mouseUp(el, { clientX: dx, clientY: dy });
};

const expectRect = (shape: HTMLElement, rect: Rectangle) => {
  expect(shape.parentNode).toHaveAttribute(
    'transform',
    `translate(${rect.x},${rect.y})`
  );
  expect(shape).toHaveAttribute('width', String(rect.width));
  expect(shape).toHaveAttribute('height', String(rect.height));
};

it('can delete a shape with keyboard shortcut', () => {
  const { queryAllByTestId } = render(<EasyMode initialItemCount={2} />);

  expect(queryAllByTestId('shape-rect')).toHaveLength(2);
  fireEvent.keyDown(queryAllByTestId('shape-rect')[0], { key: 'Delete' });
  expect(queryAllByTestId('shape-rect')).toHaveLength(1);

  // Deleting will move the focus to the next shape
  expect(document.activeElement).toBe(
    queryAllByTestId('shape-rect')[0].parentNode
  );
  fireEvent.keyDown(document.activeElement as Element, { key: 'Delete' });
  expect(queryAllByTestId('shape-rect')).toHaveLength(0);

  // After deleting the last shape, focus returns to the default,
  // which I guess is the document body
  expect(document.activeElement).toBe(document.body);
});

it('can create a shape', () => {
  const { getAllByTestId, container } = render(<EasyMode includeDrawLayer />);

  expect(getAllByTestId('shape-rect')).toHaveLength(1);
  const drawLayer = container.querySelector('.rse-draw-layer');
  mouseDrag(drawLayer, { dx: 30, dy: 30 });
  expect(getAllByTestId('shape-rect')).toHaveLength(2);
});

it('can resize a shape', () => {
  const { getByTestId } = render(<EasyMode />);

  const shape = getByTestId('shape-rect');
  expectRect(shape, { x: 20, y: 50, height: 25, width: 50 });

  const eResizeHandle = getByTestId('resize-handle-e');
  mouseDrag(eResizeHandle, { dx: 30, dy: 30 });
  expectRect(shape, { x: 20, y: 50, height: 25, width: 80 });

  const nwResizeHandle = getByTestId('resize-handle-nw');
  mouseDrag(nwResizeHandle, { dx: -30, dy: -30 });
  expectRect(shape, { x: -10, y: 20, height: 55, width: 110 });
});

it('can select multiple shapes by click-and-drag', () => {
  const { queryByTestId, container } = render(
    <EasyMode initialItemCount={2} includeSelectionLayer />
  );

  expect(queryByTestId('selection-rect')).toBeNull();

  const selectionLayer = container.querySelector('.rse-selection-layer');
  mouseDrag(selectionLayer, { dx: 130, dy: 130 });

  expect(queryByTestId('selection-rect')).toBeTruthy();
});

it('can select multiple shapes via shift-click', () => {
  const { getAllByTestId, queryByTestId } = render(
    <EasyMode initialItemCount={2} includeSelectionLayer />
  );

  const shapes = getAllByTestId('shape-rect');

  fireEvent.mouseDown(shapes[0]);
  fireEvent.mouseUp(shapes[0]);
  expect(queryByTestId('selection-rect')).toBeNull();
  expect(document.activeElement).toBe(shapes[0].parentNode);

  fireEvent.mouseDown(shapes[1], { shiftKey: true });
  fireEvent.mouseUp(shapes[1], { shiftKey: true });
  expect(queryByTestId('selection-rect')).toBeTruthy();
});
