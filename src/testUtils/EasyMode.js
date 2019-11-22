import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ShapeEditor, ImageLayer, DrawLayer, wrapShape } from '../index';

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
/* eslint-enable react/prop-types */

let idIterator = 1;
const EasyMode = ({ initialItems, includeImageLayer, includeDrawLayer }) => {
  const [items, setItems] = useState(
    initialItems || [{ id: '1', x: 20, y: 50, width: 50, height: 25 }]
  );

  const [{ vectorHeight, vectorWidth }, setVectorDimensions] = useState({
    vectorHeight: 0,
    vectorWidth: 0,
  });

  return (
    <div style={{ height: 400 }}>
      <ShapeEditor vectorWidth={vectorWidth} vectorHeight={vectorHeight}>
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
            />
          );
        })}
      </ShapeEditor>
    </div>
  );
};

EasyMode.propTypes = {
  includeDrawLayer: PropTypes.bool,
  includeImageLayer: PropTypes.bool,
  initialItems: PropTypes.arrayOf(PropTypes.shape({})),
};

EasyMode.defaultProps = {
  includeDrawLayer: false,
  includeImageLayer: false,
  initialItems: null,
};

export default EasyMode;
