import React from 'react';
import {
  render,
  fireEvent,
  EasyMode,
  mouseDrag,
  expectRect,
  getDrawLayer,
  getActiveElement,
  SHAPE_TID,
} from '../testUtils';

it('can create a shape', () => {
  const { getAllByTestId, container } = render(<EasyMode includeDrawLayer />);

  expect(getAllByTestId(SHAPE_TID)).toHaveLength(1);

  const drawLayer = getDrawLayer(container);
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

  const drawLayer = getDrawLayer(container);
  mouseDrag(drawLayer, { x: padding, y: padding, dx: 30, dy: 30 });
  expect(getAllByTestId(SHAPE_TID)).toHaveLength(2);
  expectRect(getAllByTestId(SHAPE_TID)[1], {
    x: 0, // Originates at 0 despite starting at 50, thanks to padding
    y: 0, // Originates at 0 despite starting at 50, thanks to padding
    width: 60, // Twice the mouse drag distance due to scale
    height: 60, // Twice the mouse drag distance due to scale
  });
});

it('can cancel out of creating a shape with Escape key', () => {
  const { getAllByTestId, container } = render(<EasyMode includeDrawLayer />);

  expect(getAllByTestId(SHAPE_TID)).toHaveLength(1);

  const drawLayer = getDrawLayer(container);
  mouseDrag(drawLayer, {
    dx: 30,
    dy: 30,
    midDragCb: () => fireEvent.keyDown(getActiveElement(), { key: 'Escape' }),
  });
  // Normally the shape creation would finish normally at this point
  // and produce a shape, but the Escape key canceled it halfway through

  expect(getAllByTestId(SHAPE_TID)).toHaveLength(1);
});

it('calls onDrawStart, onDraw, onDrawEnd, onAddShape when creating a shape', () => {
  const onDrawStart = jest.fn();
  const onDraw = jest.fn();
  const onDrawEnd = jest.fn();
  const onAddShape = jest.fn();
  const { container } = render(
    <EasyMode
      includeDrawLayer
      drawLayerProps={{ onDrawStart, onDraw, onDrawEnd, onAddShape }}
    />
  );

  const expectCallCounts = (
    start: number,
    mid: number,
    end: number,
    add: number
  ) => {
    expect(onDrawStart).toHaveBeenCalledTimes(start);
    expect(onDraw).toHaveBeenCalledTimes(mid);
    expect(onDrawEnd).toHaveBeenCalledTimes(end);
    expect(onAddShape).toHaveBeenCalledTimes(add);
  };

  const drawLayer = getDrawLayer(container);

  expectCallCounts(0, 0, 0, 0);

  fireEvent.mouseDown(drawLayer, { clientX: 1, clientY: 2 });
  expectCallCounts(1, 0, 0, 0);
  expect(onDrawStart).toHaveBeenLastCalledWith({
    startCorner: { x: 1, y: 2 },
  });

  fireEvent.mouseMove(drawLayer, { clientX: 29, clientY: 29 });
  expectCallCounts(1, 1, 0, 0);
  expect(onDraw).toHaveBeenLastCalledWith({
    movingCorner: { x: 29, y: 29 },
    startCorner: { x: 1, y: 2 },
  });

  fireEvent.mouseMove(drawLayer, { clientX: 30, clientY: 30 });
  expectCallCounts(1, 2, 0, 0);

  // In the onDrawEnd call, check that onAddShape has not been called yet
  onDrawEnd.mockImplementationOnce(() => {
    expectCallCounts(1, 2, 1, 0);
  });

  fireEvent.mouseUp(drawLayer, { clientX: 30, clientY: 30 });
  expectCallCounts(1, 2, 1, 1);
  expect(onDrawEnd).toHaveBeenLastCalledWith({
    movingCorner: { x: 30, y: 30 },
    startCorner: { x: 1, y: 2 },
    canceled: false,
  });
  expect(onAddShape).toHaveBeenLastCalledWith({
    height: 28,
    width: 29,
    x: 1,
    y: 2,
  });

  // Simulate a canceled draw
  mouseDrag(drawLayer, {
    dx: 30,
    dy: 30,
    midDragCb: () => fireEvent.keyDown(getActiveElement(), { key: 'Escape' }),
  });

  expect(onDrawEnd).toHaveBeenLastCalledWith({
    movingCorner: { x: 30, y: 30 },
    startCorner: { x: 0, y: 0 },
    canceled: true,
  });
});
