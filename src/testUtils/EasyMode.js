/* eslint-disable react/jsx-props-no-spreading */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  ShapeEditor,
  ImageLayer,
  DrawLayer,
  wrapShape,
  SelectionLayer,
} from '../index';

function arrayReplace(arr, index, item) {
  return [
    ...arr.slice(0, index),
    ...(Array.isArray(item) ? item : [item]),
    ...arr.slice(index + 1),
  ];
}

const RectShape = wrapShape(({ width, height }) => (
  <rect
    width={width}
    height={height}
    fill="rgba(0,0,255,0.5)"
    data-testid="shape-rect"
  />
));

/* eslint-disable react/prop-types */
const ResizeHandleComponent = ({
  active,
  cursor,
  isInSelectionGroup,
  onMouseDown,
  recommendedSize,
  scale,
  name,
  x,
  y,
}) => (
  <rect
    fill={active ? 'rgba(229,240,244,1)' : 'rgba(229,240,244,0.3)'}
    height={recommendedSize}
    stroke={active ? 'rgba(53,33,140,1)' : 'rgba(53,33,140,0.3)'}
    strokeWidth={1 / scale}
    style={{ cursor, opacity: isInSelectionGroup ? 0 : 1 }}
    width={recommendedSize}
    data-testid={`resize-handle-${name}`}
    x={x - recommendedSize / 2}
    y={y - recommendedSize / 2}
    // The onMouseDown prop must be passed on or resize will not work
    onMouseDown={onMouseDown}
  />
);

const SelectionComponent = wrapShape(({ height, scale, width }) => (
  <rect
    fill="transparent"
    stroke="rgba(140,179,255,1)"
    strokeWidth={2 / scale}
    height={height}
    width={width}
    data-testid="selection-rect"
  />
));

/* eslint-enable react/prop-types */

let idIterator = 1;
const EasyMode = ({
  includeDrawLayer,
  includeImageLayer,
  includeSelectionLayer,
  initialItemCount,
  shapeEditorProps,
  shapeProps,
}) => {
  const [items, setItems] = useState(
    [...new Array(initialItemCount)].map((_, index) => ({
      id: `id_${index}`,
      x: 20 * (index + 1),
      y: 50 * (index + 1),
      width: 50,
      height: 25,
    }))
  );

  const [selectedShapeIds, setSelectedShapeIds] = useState([]);

  const [{ vectorHeight, vectorWidth }, setVectorDimensions] = useState({
    vectorHeight: 0,
    vectorWidth: 0,
  });

  const extraLayersAndShapes = (
    <>
      {includeDrawLayer && (
        <DrawLayer
          onAddShape={({ x, y, width, height }) => {
            setItems(currentItems => [
              ...currentItems,
              { id: `id${idIterator}`, x, y, width, height },
            ]);
            idIterator += 1;
          }}
        />
      )}

      {items.map((item, index) => {
        const { id, height, width, x, y } = item;
        return (
          <RectShape
            key={id}
            shapeId={id}
            shapeIndex={index}
            height={height}
            width={width}
            x={x}
            y={y}
            onChange={newRect => {
              setItems(currentItems =>
                arrayReplace(currentItems, index, {
                  ...item,
                  ...newRect,
                })
              );
            }}
            onDelete={() => {
              setItems(currentItems => arrayReplace(currentItems, index, []));
            }}
            ResizeHandleComponent={ResizeHandleComponent}
            {...shapeProps}
          />
        );
      })}
    </>
  );

  return (
    <div style={{ height: 400 }}>
      <ShapeEditor
        vectorWidth={vectorWidth}
        vectorHeight={vectorHeight}
        {...shapeEditorProps}
      >
        {includeImageLayer && (
          <ImageLayer
            src="https://raw.githubusercontent.com/fritz-c/react-shape-editor/d8661b46d07d832e316aacc906a0d603a3bb13a2/website/blank.png"
            onLoad={({ naturalWidth, naturalHeight }) => {
              setVectorDimensions({
                vectorWidth: naturalWidth,
                vectorHeight: naturalHeight,
              });
            }}
          />
        )}

        {includeSelectionLayer ? (
          <SelectionLayer
            selectedShapeIds={selectedShapeIds}
            onSelectionChange={ids => {
              setSelectedShapeIds(ids);
            }}
            onChange={(newRects, selectedShapesProps) => {
              setItems(currentItems =>
                newRects.reduce((acc, newRect, index) => {
                  const { shapeIndex } = selectedShapesProps[index];
                  const item = acc[shapeIndex];
                  return arrayReplace(acc, shapeIndex, {
                    ...item,
                    ...newRect,
                  });
                }, currentItems)
              );
            }}
            onDelete={(event, selectedShapesProps) => {
              setItems(currentItems =>
                selectedShapesProps
                  .map(p => p.shapeIndex)
                  // Delete the indices in reverse so as not to shift the
                  // other array elements and screw up the array indices
                  .sort()
                  .reverse()
                  .reduce(
                    (acc, shapeIndex) => arrayReplace(acc, shapeIndex, []),
                    currentItems
                  )
              );
            }}
            SelectionComponent={SelectionComponent}
          >
            {extraLayersAndShapes}
          </SelectionLayer>
        ) : (
          extraLayersAndShapes
        )}
      </ShapeEditor>
    </div>
  );
};

EasyMode.propTypes = {
  includeDrawLayer: PropTypes.bool,
  includeImageLayer: PropTypes.bool,
  includeSelectionLayer: PropTypes.bool,
  initialItemCount: PropTypes.number,
  shapeEditorProps: PropTypes.shape({}),
  shapeProps: PropTypes.shape({}),
};

EasyMode.defaultProps = {
  includeDrawLayer: false,
  includeImageLayer: false,
  includeSelectionLayer: false,
  initialItemCount: 1,
  shapeEditorProps: {},
  shapeProps: {},
};

export default EasyMode;
