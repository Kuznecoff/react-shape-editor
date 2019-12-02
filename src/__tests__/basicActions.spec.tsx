import React from 'react';
import {
  render,
  fireEvent,
  EasyMode,
  mouseDrag,
  expectRect,
  getActiveElement,
  SHAPE_TID,
} from '../testUtils';

it('can delete a shape with keyboard shortcut', () => {
  const { queryAllByTestId } = render(<EasyMode initialItemCount={2} />);

  expect(queryAllByTestId(SHAPE_TID)).toHaveLength(2);
  fireEvent.keyDown(queryAllByTestId(SHAPE_TID)[0], { key: 'Delete' });
  expect(queryAllByTestId(SHAPE_TID)).toHaveLength(1);

  // Deleting will move the focus to the next shape
  expect(getActiveElement()).toBe(queryAllByTestId(SHAPE_TID)[0].parentNode);
  fireEvent.keyDown(getActiveElement(), { key: 'Delete' });
  expect(queryAllByTestId(SHAPE_TID)).toHaveLength(0);

  // After deleting the last shape, focus returns to the default,
  // which I guess is the document body
  expect(getActiveElement()).toBe(document.body);
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

it('can move a shape with the mouse', () => {
  const { getByTestId } = render(<EasyMode />);

  const shape = getByTestId(SHAPE_TID);
  expectRect(shape, { x: 20, y: 50, height: 25, width: 50 });
  mouseDrag(shape, { dx: 20, dy: 20 });
  expectRect(shape, { x: 40, y: 70, height: 25, width: 50 });
});

it.todo('conforms to constraints');

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

it('can cancel out of resizing and moving shapes with Escape key', () => {
  const { getByTestId } = render(<EasyMode />);

  const shape = getByTestId(SHAPE_TID);
  expectRect(shape, { x: 20, y: 50, height: 25, width: 50 });

  const eResizeHandle = getByTestId('resize-handle-e');
  mouseDrag(eResizeHandle, {
    dx: 20,
    dy: 20,
    midDragCb: () => fireEvent.keyDown(getActiveElement(), { key: 'Escape' }),
  });

  expectRect(shape, { x: 20, y: 50, height: 25, width: 50 });

  mouseDrag(shape, {
    dx: 20,
    dy: 20,
    midDragCb: () => fireEvent.keyDown(getActiveElement(), { key: 'Escape' }),
  });

  expectRect(shape, { x: 20, y: 50, height: 25, width: 50 });
});
