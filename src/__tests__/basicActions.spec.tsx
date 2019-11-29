import React from 'react';
import { render, fireEvent, EasyMode } from '../testUtils';
import { Rectangle } from '../types';

const SHAPE_TID = 'shape-rect';
const SELECTION_TID = 'selection-rect';

const mouseDrag = (
  el: Element,
  {
    x = 0,
    y = 0,
    dx,
    dy,
    midDragCb = () => {},
  }: { dx: number; dy: number; x?: number; y?: number; midDragCb?: () => void }
) => {
  fireEvent.mouseDown(el, { clientX: x, clientY: y });
  fireEvent.mouseMove(el, { clientX: x + dx, clientY: y + dy });
  midDragCb();
  fireEvent.mouseUp(el, { clientX: x + dx, clientY: y + dy });
};

const expectRect = (shape: HTMLElement, rect: Rectangle) => {
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

const prepareSelection = () => {
  const testFns = render(
    <EasyMode includeSelectionLayer initialItemCount={3} />
  );
  const { container, getByTestId } = testFns;

  const selectionLayer = container.querySelector('.rse-selection-layer');

  // This range only selects 2 of the 3 rendered shapes (intentionally)
  mouseDrag(selectionLayer, { dx: 130, dy: 130 });

  return {
    ...testFns,
    selectionRect: getByTestId(SELECTION_TID),
  };
};

it('can delete a shape with keyboard shortcut', () => {
  const { queryAllByTestId } = render(<EasyMode initialItemCount={2} />);

  expect(queryAllByTestId(SHAPE_TID)).toHaveLength(2);
  fireEvent.keyDown(queryAllByTestId(SHAPE_TID)[0], { key: 'Delete' });
  expect(queryAllByTestId(SHAPE_TID)).toHaveLength(1);

  // Deleting will move the focus to the next shape
  expect(document.activeElement).toBe(
    queryAllByTestId(SHAPE_TID)[0].parentNode
  );
  fireEvent.keyDown(document.activeElement as Element, { key: 'Delete' });
  expect(queryAllByTestId(SHAPE_TID)).toHaveLength(0);

  // After deleting the last shape, focus returns to the default,
  // which I guess is the document body
  expect(document.activeElement).toBe(document.body);
});

it('can delete a selection of shapes with keyboard shortcut', () => {
  const { queryAllByTestId, selectionRect } = prepareSelection();
  expect(queryAllByTestId(SHAPE_TID)).toHaveLength(3);
  fireEvent.keyDown(selectionRect, { key: 'Delete' });
  expect(queryAllByTestId(SHAPE_TID)).toHaveLength(1);
});

it('can move a shape with keyboard shortcut', () => {
  const { getByTestId } = render(<EasyMode />);

  const shape = getByTestId(SHAPE_TID);
  expectRect(shape, { x: 20, y: 50, height: 25, width: 50 });
  fireEvent.keyDown(shape, { key: 'ArrowRight' });
  expectRect(shape, { x: 21, y: 50, height: 25, width: 50 });
  fireEvent.keyDown(shape, { key: 'ArrowDown' });
  fireEvent.keyDown(shape, { key: 'ArrowDown' });
  expectRect(shape, { x: 21, y: 52, height: 25, width: 50 });
});

it('can move a selection of shapes with keyboard shortcut', () => {
  const { queryAllByTestId, selectionRect } = prepareSelection();
  const shapes = queryAllByTestId(SHAPE_TID);
  expectRect(shapes[0], { x: 20, y: 50, height: 25, width: 50 });
  expectRect(shapes[1], { x: 40, y: 100, height: 25, width: 50 });
  expectRect(shapes[2], { x: 60, y: 150, height: 25, width: 50 });

  fireEvent.keyDown(selectionRect, { key: 'ArrowRight' });

  expectRect(shapes[0], { x: 21, y: 50, height: 25, width: 50 });
  expectRect(shapes[1], { x: 41, y: 100, height: 25, width: 50 });
  expectRect(shapes[2], { x: 60, y: 150, height: 25, width: 50 });
});

it('can resize a shape with keyboard shortcut', () => {
  const { getByTestId } = render(<EasyMode />);

  const shape = getByTestId(SHAPE_TID);
  expectRect(shape, { x: 20, y: 50, height: 25, width: 50 });
  fireEvent.keyDown(shape, { key: 'ArrowRight', shiftKey: true });
  expectRect(shape, { x: 20, y: 50, height: 25, width: 51 });
  fireEvent.keyDown(shape, { key: 'ArrowLeft', shiftKey: true });
  expectRect(shape, { x: 20, y: 50, height: 25, width: 50 });
  fireEvent.keyDown(shape, { key: 'ArrowDown', shiftKey: true });
  expectRect(shape, { x: 20, y: 50, height: 26, width: 50 });
});

it('can resize a selection of shapes with keyboard shortcut', () => {
  const { queryAllByTestId, selectionRect } = prepareSelection();
  const shapes = queryAllByTestId(SHAPE_TID);
  expectRect(shapes[0], { x: 20, y: 50, height: 25, width: 50 });
  expectRect(shapes[1], { x: 40, y: 100, height: 25, width: 50 });
  expectRect(shapes[2], { x: 60, y: 150, height: 25, width: 50 });

  fireEvent.keyDown(selectionRect, { key: 'ArrowUp', shiftKey: true });

  expectRect(shapes[0], { x: 20, y: 50, height: 24.6666, width: 50 });
  expectRect(shapes[1], { x: 40, y: 99.3333, height: 24.6666, width: 50 });
  expectRect(shapes[2], { x: 60, y: 150, height: 25, width: 50 });
});

it('can move a shape with the mouse', () => {
  const { getByTestId } = render(<EasyMode />);

  const shape = getByTestId(SHAPE_TID);
  expectRect(shape, { x: 20, y: 50, height: 25, width: 50 });
  mouseDrag(shape, { dx: 20, dy: 20 });
  expectRect(shape, { x: 40, y: 70, height: 25, width: 50 });
});

it.todo('can move a selection of shapes with the mouse');
it.todo('can resize a selection of shapes with the mouse');
it.todo('conforms to constraints');

it('can create a shape', () => {
  const { getAllByTestId, container } = render(<EasyMode includeDrawLayer />);

  expect(getAllByTestId(SHAPE_TID)).toHaveLength(1);

  const drawLayer = container.querySelector('.rse-draw-layer');
  mouseDrag(drawLayer, { dx: 30, dy: 30 });
  expect(getAllByTestId(SHAPE_TID)).toHaveLength(2);
  expectRect(getAllByTestId(SHAPE_TID)[1], {
    x: 0,
    y: 0,
    width: 30,
    height: 30,
  });
});

it('can create a shape in a padded, scaled svg', () => {
  const padding = 50;
  const { getAllByTestId, container } = render(
    <EasyMode includeDrawLayer shapeEditorProps={{ padding, scale: 0.5 }} />
  );

  expect(getAllByTestId(SHAPE_TID)).toHaveLength(1);

  const drawLayer = container.querySelector('.rse-draw-layer');
  mouseDrag(drawLayer, { x: padding, y: padding, dx: 30, dy: 30 });
  expect(getAllByTestId(SHAPE_TID)).toHaveLength(2);
  expectRect(getAllByTestId(SHAPE_TID)[1], {
    x: 0, // Originates at 0 despite starting at 50, thanks to padding
    y: 0, // Originates at 0 despite starting at 50, thanks to padding
    width: 60, // Twice the mouse drag distance due to scale
    height: 60, // Twice the mouse drag distance due to scale
  });
});

it('can resize a shape with the mouse', () => {
  const { getByTestId } = render(<EasyMode />);

  const shape = getByTestId(SHAPE_TID);
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

  expect(queryByTestId(SELECTION_TID)).toBeNull();

  const selectionLayer = container.querySelector('.rse-selection-layer');
  mouseDrag(selectionLayer, { dx: 130, dy: 130 });

  expect(queryByTestId(SELECTION_TID)).toBeTruthy();
});

it('can select multiple shapes via shift-click', () => {
  const { getAllByTestId, queryByTestId } = render(
    <EasyMode initialItemCount={2} includeSelectionLayer />
  );

  const shapes = getAllByTestId(SHAPE_TID);

  fireEvent.mouseDown(shapes[0]);
  fireEvent.mouseUp(shapes[0]);
  expect(queryByTestId(SELECTION_TID)).toBeNull();
  expect(document.activeElement).toBe(shapes[0].parentNode);

  fireEvent.mouseDown(shapes[1], { shiftKey: true });
  fireEvent.mouseUp(shapes[1], { shiftKey: true });
  expect(queryByTestId(SELECTION_TID)).toBeTruthy();
});

it('can clear selection when selection backing rect is obscured (by DrawLayer)', () => {
  const { container, queryByTestId, getAllByTestId } = render(
    <EasyMode includeSelectionLayer includeDrawLayer initialItemCount={2} />
  );

  const shapes = getAllByTestId(SHAPE_TID);

  // Create a selection by shift-clicking shapes
  fireEvent.mouseDown(shapes[0]);
  fireEvent.mouseUp(shapes[0]);
  fireEvent.mouseDown(shapes[1], { shiftKey: true });
  fireEvent.mouseUp(shapes[1], { shiftKey: true });
  expect(queryByTestId(SELECTION_TID)).toBeTruthy();

  // Clicking off of the selection, on the top-most layer (draw layer, in this case)
  const drawLayer = container.querySelector('.rse-draw-layer');
  fireEvent.mouseDown(drawLayer);

  // Check that the selection rect has disappeared
  expect(queryByTestId(SELECTION_TID)).toBeNull();
});

it('can cancel out of creating a shape with Escape key', () => {
  const { getAllByTestId, container } = render(<EasyMode includeDrawLayer />);

  expect(getAllByTestId(SHAPE_TID)).toHaveLength(1);

  const drawLayer = container.querySelector('.rse-draw-layer');
  mouseDrag(drawLayer, {
    dx: 30,
    dy: 30,
    midDragCb: () =>
      fireEvent.keyDown(document.activeElement, { key: 'Escape' }),
  });
  // Normally the shape creation would finish normally at this point
  // and produce a shape, but the Escape key canceled it halfway through

  expect(getAllByTestId(SHAPE_TID)).toHaveLength(1);
});

it('can cancel out of selecting shapes with Escape key', () => {
  const { queryByTestId, container } = render(
    <EasyMode includeSelectionLayer initialItemCount={3} />
  );

  const selectionLayer = container.querySelector('.rse-selection-layer');

  mouseDrag(selectionLayer, {
    dx: 130,
    dy: 130,
    midDragCb: () =>
      fireEvent.keyDown(document.activeElement, { key: 'Escape' }),
  });

  expect(queryByTestId(SELECTION_TID)).toBeNull();
});

it('can cancel out of resizing and moving shapes with Escape key', () => {
  const { getByTestId } = render(<EasyMode />);

  const shape = getByTestId(SHAPE_TID);
  expectRect(shape, { x: 20, y: 50, height: 25, width: 50 });

  const eResizeHandle = getByTestId('resize-handle-e');
  mouseDrag(eResizeHandle, {
    dx: 20,
    dy: 20,
    midDragCb: () =>
      fireEvent.keyDown(document.activeElement, { key: 'Escape' }),
  });

  expectRect(shape, { x: 20, y: 50, height: 25, width: 50 });

  mouseDrag(shape, {
    dx: 20,
    dy: 20,
    midDragCb: () =>
      fireEvent.keyDown(document.activeElement, { key: 'Escape' }),
  });

  expectRect(shape, { x: 20, y: 50, height: 25, width: 50 });
});
