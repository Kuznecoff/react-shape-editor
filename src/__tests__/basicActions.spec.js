import React from 'react';
import { render, fireEvent, EasyMode } from '../testUtils';

const mouseDrag = (el, { dx, dy }) => {
  fireEvent.mouseDown(el, { clientX: 0, clientY: 0 });
  fireEvent.mouseMove(el, { clientX: dx, clientY: dy });
  fireEvent.mouseUp(el, { clientX: dx, clientY: dy });
};

const expectRect = (shape, rect) => {
  expect(shape.parentNode).toHaveAttribute(
    'transform',
    `translate(${rect.x},${rect.y})`
  );
  expect(shape).toHaveAttribute('width', String(rect.width));
  expect(shape).toHaveAttribute('height', String(rect.height));
};

it('can delete a shape with keyboard shortcut', () => {
  const { queryAllByTestId } = render(<EasyMode />);

  expect(queryAllByTestId('shape-rect')).toHaveLength(1);
  fireEvent.keyDown(queryAllByTestId('shape-rect')[0], { key: 'Delete' });
  expect(queryAllByTestId('shape-rect')).toHaveLength(0);
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
