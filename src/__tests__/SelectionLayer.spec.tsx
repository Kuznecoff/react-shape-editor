import React from 'react';
import {
  render,
  fireEvent,
  EasyMode,
  mouseDrag,
  expectRect,
  getDrawLayer,
  getSelectionLayer,
  getActiveElement,
  SHAPE_TID,
  SELECTION_TID,
} from '../testUtils';

const prepareSelection = (selectAll: boolean = false) => {
  const testFns = render(
    <EasyMode includeSelectionLayer initialItemCount={3} />
  );
  const { container, getByTestId } = testFns;

  const selectionLayer = getSelectionLayer(container);

  // This range only selects 2 of the 3 rendered shapes (intentionally)
  mouseDrag(selectionLayer, { dx: 130, dy: selectAll ? 180 : 130 });

  return {
    ...testFns,
    selectionRect: getByTestId(SELECTION_TID),
  };
};

it('can delete a selection of shapes with keyboard shortcut', () => {
  const { queryAllByTestId, selectionRect } = prepareSelection();
  expect(queryAllByTestId(SHAPE_TID)).toHaveLength(3);
  fireEvent.keyDown(selectionRect, { key: 'Delete' });
  expect(queryAllByTestId(SHAPE_TID)).toHaveLength(1);
});

it('hides the selection rect after deleting', () => {
  const { queryByTestId, selectionRect } = prepareSelection(true);
  fireEvent.keyDown(selectionRect, { key: 'Delete' });
  expect(queryByTestId(SELECTION_TID)).toBeNull();
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

it('can move a selection of shapes with the mouse', () => {
  const { queryAllByTestId, selectionRect } = prepareSelection();
  const shapes = queryAllByTestId(SHAPE_TID);
  expectRect(shapes[0], { x: 20, y: 50, height: 25, width: 50 });
  expectRect(shapes[1], { x: 40, y: 100, height: 25, width: 50 });
  expectRect(shapes[2], { x: 60, y: 150, height: 25, width: 50 });
  expectRect(selectionRect, { x: 20, y: 50, height: 75, width: 70 });

  mouseDrag(selectionRect, { dx: 20, dy: 10 });

  expectRect(shapes[0], { x: 40, y: 60, height: 25, width: 50 });
  expectRect(shapes[1], { x: 60, y: 110, height: 25, width: 50 });
  expectRect(shapes[2], { x: 60, y: 150, height: 25, width: 50 });
  expectRect(selectionRect, { x: 40, y: 60, height: 75, width: 70 });
});

it.todo('can resize a selection of shapes with the mouse');

it('can select multiple shapes by click-and-drag', () => {
  const { queryByTestId, container } = render(
    <EasyMode initialItemCount={2} includeSelectionLayer />
  );

  expect(queryByTestId(SELECTION_TID)).toBeNull();

  const selectionLayer = getSelectionLayer(container);
  mouseDrag(selectionLayer, { dx: 130, dy: 130 });

  expect(queryByTestId(SELECTION_TID)).toBeTruthy();
});

it('can select multiple shapes via shift-click', () => {
  const { getAllByTestId, queryByTestId } = render(
    <EasyMode initialItemCount={2} includeSelectionLayer />
  );

  const shapes = getAllByTestId(SHAPE_TID);

  fireEvent.mouseDown(shapes[0], { buttons: 1 });
  fireEvent.mouseUp(shapes[0]);
  expect(queryByTestId(SELECTION_TID)).toBeNull();
  expect(getActiveElement()).toBe(shapes[0].parentNode);

  fireEvent.mouseDown(shapes[1], { buttons: 1, shiftKey: true });
  fireEvent.mouseUp(shapes[1], { shiftKey: true });
  expect(queryByTestId(SELECTION_TID)).toBeTruthy();
});

it('can clear selection when selection backing rect is obscured (by DrawLayer)', () => {
  const { container, queryByTestId, getAllByTestId } = render(
    <EasyMode includeSelectionLayer includeDrawLayer initialItemCount={2} />
  );

  const shapes = getAllByTestId(SHAPE_TID);

  // Create a selection by shift-clicking shapes
  fireEvent.mouseDown(shapes[0], { buttons: 1 });
  fireEvent.mouseUp(shapes[0]);
  fireEvent.mouseDown(shapes[1], { buttons: 1, shiftKey: true });
  fireEvent.mouseUp(shapes[1], { shiftKey: true });
  expect(queryByTestId(SELECTION_TID)).toBeTruthy();

  // Clicking off of the selection, on the top-most layer (draw layer, in this case)
  const drawLayer = getDrawLayer(container);
  fireEvent.mouseDown(drawLayer, { buttons: 1 });

  // Check that the selection rect has disappeared
  expect(queryByTestId(SELECTION_TID)).toBeNull();
});

it('updates selection rect properly in hybrid mode', async () => {
  const { getByTestId, getAllByTestId } = render(
    <EasyMode includeSelectionLayer includeDrawLayer initialItemCount={2} />
  );

  const shapes = getAllByTestId(SHAPE_TID);

  // Create a selection by shift-clicking shapes
  fireEvent.mouseDown(shapes[0], { buttons: 1 });
  fireEvent.mouseUp(shapes[0]);
  fireEvent.mouseDown(shapes[1], { buttons: 1, shiftKey: true });
  fireEvent.mouseUp(shapes[1], { shiftKey: true });
  const selectionRect = getByTestId(SELECTION_TID);

  expectRect(shapes[0], { x: 20, y: 50, height: 25, width: 50 });
  expectRect(shapes[1], { x: 40, y: 100, height: 25, width: 50 });
  expectRect(selectionRect, { x: 20, y: 50, height: 75, width: 70 });

  mouseDrag(selectionRect, { dx: 20, dy: 10 });

  expectRect(shapes[0], { x: 40, y: 60, height: 25, width: 50 });
  expectRect(shapes[1], { x: 60, y: 110, height: 25, width: 50 });
  expectRect(selectionRect, { x: 40, y: 60, height: 75, width: 70 });

  await new Promise(r => setTimeout(r));
  expectRect(selectionRect, { x: 40, y: 60, height: 75, width: 70 });

  mouseDrag(selectionRect, { dx: -10, dy: -10 });
  expectRect(selectionRect, { x: 30, y: 50, height: 75, width: 70 });

  await new Promise(r => setTimeout(r));
  expectRect(selectionRect, { x: 30, y: 50, height: 75, width: 70 });
});

it('can cancel out of selecting shapes with Escape key', () => {
  const { queryByTestId, container } = render(
    <EasyMode includeSelectionLayer initialItemCount={3} />
  );

  const selectionLayer = getSelectionLayer(container);

  mouseDrag(selectionLayer, {
    dx: 130,
    dy: 130,
    midDragCb: () => fireEvent.keyDown(getActiveElement(), { key: 'Escape' }),
  });

  expect(queryByTestId(SELECTION_TID)).toBeNull();
});

it('can select a lot of rectangles simultaneously', () => {
  const { container, getByTestId, queryAllByTestId } = render(
    <EasyMode includeSelectionLayer initialItemCount={100} />
  );

  const selectionLayer = getSelectionLayer(container);
  expect(queryAllByTestId(SHAPE_TID)).toHaveLength(100);

  mouseDrag(selectionLayer, { dx: 10000, dy: 10000 });

  const selectionRect = getByTestId(SELECTION_TID);
  fireEvent.keyDown(selectionRect, { key: 'Delete' });

  expect(queryAllByTestId(SHAPE_TID)).toHaveLength(0);
});
