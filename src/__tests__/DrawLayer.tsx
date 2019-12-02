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
