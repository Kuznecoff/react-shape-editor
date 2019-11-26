/* eslint-disable react/jsx-props-no-spreading, react/prop-types */

import React from 'react';
import ReactDOM from 'react-dom';
import { withProfiler } from 'jest-react-profiler';
import ShapeEditor from '../ShapeEditor';
import SelectionLayer from '../SelectionLayer';
import wrapShape from '../wrapShape';

const exampleShapeProps = {
  x: 10,
  y: 20,
  height: 100,
  width: 300,
  shapeId: 'a',
};

// Note: this is extremely important to the performance of the component
// when there are many shapes rendered. Do not skip it if it starts to fail.
// Fix whatever excess render calls are being made
test('shapes are not re-rendered when their siblings change', () => {
  const InnerComponent = ({ width, height }) => (
    <rect width={width} height={height} />
  );

  const ShapeEditorProfiled = withProfiler(ShapeEditor);
  const SelectionLayerProfiled = withProfiler(SelectionLayer);
  const InnerComponentProfiled1 = withProfiler(InnerComponent);
  const InnerComponentProfiled2 = withProfiler(InnerComponent);
  const Shape1 = wrapShape(InnerComponentProfiled1);
  const Shape2 = wrapShape(InnerComponentProfiled2);

  const SimpleExample = extraProps => (
    <ShapeEditorProfiled>
      <Shape1 {...exampleShapeProps} />
      <Shape2 {...exampleShapeProps} {...extraProps} />
    </ShapeEditorProfiled>
  );
  const targetEl = document.createElement('div');
  ReactDOM.render(<SimpleExample />, targetEl);

  // Check that each component's render function was called just once
  expect(ShapeEditorProfiled).toHaveCommittedTimes(1);
  expect(InnerComponentProfiled1).toHaveCommittedTimes(1);
  expect(InnerComponentProfiled2).toHaveCommittedTimes(1);

  // Triggering a re-render of InnerComponentProfiled2
  ReactDOM.render(<SimpleExample width={200} />, targetEl);

  // These check the number of extra commits since the last check
  // We want to make sure that InnerComponentProfiled1 didn't get re-rendered
  // even though nothing in its props was changed.
  expect(ShapeEditorProfiled).toHaveCommittedTimes(1);
  expect(InnerComponentProfiled1).toHaveCommittedTimes(0); // Important
  expect(InnerComponentProfiled2).toHaveCommittedTimes(1);

  const SelectionLayerExample = extraProps => (
    <ShapeEditorProfiled>
      <SelectionLayerProfiled
        onSelectionChange={() => {}}
        selectedShapeIds={[]}
      >
        <Shape1 {...exampleShapeProps} />
        <Shape2 {...exampleShapeProps} {...extraProps} />
      </SelectionLayerProfiled>
    </ShapeEditorProfiled>
  );

  // Do it again, but this time wrapped in a selection layer
  ReactDOM.render(<SelectionLayerExample />, targetEl);

  expect(ShapeEditorProfiled).toHaveCommittedTimes(1);
  expect(SelectionLayerProfiled).toHaveCommittedTimes(1);
  expect(InnerComponentProfiled1).toHaveCommittedTimes(1);
  expect(InnerComponentProfiled2).toHaveCommittedTimes(1);

  // Triggering a re-render of InnerComponentProfiled2
  ReactDOM.render(<SelectionLayerExample width={200} />, targetEl);

  expect(ShapeEditorProfiled).toHaveCommittedTimes(1);
  expect(SelectionLayerProfiled).toHaveCommittedTimes(1);
  expect(InnerComponentProfiled1).toHaveCommittedTimes(0); // Important
  expect(InnerComponentProfiled2).toHaveCommittedTimes(1);
});
