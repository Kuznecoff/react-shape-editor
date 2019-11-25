import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  getRectFromCornerCoordinates,
  defaultConstrainMove,
  defaultConstrainResize,
} from './utils';
import useRootContext from './useRootContext';
import DefaultDrawPreviewComponent from './DefaultDrawPreviewComponent';
import {
  MouseHandlerFunc,
  Point,
  ConstrainMoveFunc,
  ConstrainResizeFunc,
  Rectangle,
} from './types';

interface DragState {
  dragStartCoordinates: Point;
  dragCurrentCoordinates: Point;
  isMouseDown: boolean;
}

const defaultPoint = { x: 0, y: 0 };
const defaultDragState: DragState = {
  dragStartCoordinates: defaultPoint,
  dragCurrentCoordinates: defaultPoint,
  isMouseDown: false,
};

interface Props {
  constrainMove?: ConstrainMoveFunc;
  constrainResize?: ConstrainResizeFunc;
  DrawPreviewComponent?: any;
  onAddShape: (newRect: Rectangle) => void;
}

const propTypes = {
  constrainMove: PropTypes.func,
  constrainResize: PropTypes.func,
  DrawPreviewComponent: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({}),
  ]),
  onAddShape: PropTypes.func.isRequired,
};

const DrawLayer: React.FunctionComponent<Props> = ({
  DrawPreviewComponent = DefaultDrawPreviewComponent,
  constrainResize = defaultConstrainResize,
  constrainMove = defaultConstrainMove,
  onAddShape,
}) => {
  const {
    scale,
    vectorHeight,
    vectorWidth,
    callbacks: { setMouseHandlerRef, getPlaneCoordinatesFromEvent },
  } = useRootContext();

  const [
    { isMouseDown, dragStartCoordinates, dragCurrentCoordinates },
    setDragState,
  ] = useState(defaultDragState);

  const getCoordinatesFromEvent = (
    event: React.MouseEvent,
    isStartEvent = false
  ) => {
    const { x: rawX, y: rawY } = getPlaneCoordinatesFromEvent(event);

    if (isStartEvent) {
      const { x, y } = constrainMove({
        originalX: rawX,
        originalY: rawY,
        x: rawX,
        y: rawY,
        width: 0,
        height: 0,
        vectorWidth,
        vectorHeight,
      });

      return { x, y };
    }

    const { x, y } = constrainResize({
      originalMovingCorner: dragCurrentCoordinates,
      startCorner: dragStartCoordinates,
      movingCorner: { x: rawX, y: rawY },
      lockedDimension: null,
      vectorWidth,
      vectorHeight,
    });

    return { x, y };
  };

  const onMouseUp = () => {
    if (!isMouseDown) {
      return;
    }

    const resetDragState = () => setDragState(defaultDragState);
    if (
      dragStartCoordinates.x === dragCurrentCoordinates.x ||
      dragStartCoordinates.y === dragCurrentCoordinates.y
    ) {
      resetDragState();
      return;
    }

    const newRect = getRectFromCornerCoordinates(
      dragStartCoordinates,
      dragCurrentCoordinates
    );

    resetDragState();
    onAddShape(newRect);
  };

  const onMouseMove = (event: React.MouseEvent) => {
    if (!isMouseDown) {
      return;
    }

    setDragState(prevDragState => ({
      ...prevDragState,
      dragCurrentCoordinates: getCoordinatesFromEvent(event),
    }));
  };

  const mouseHandlerRef: React.MutableRefObject<MouseHandlerFunc> = useRef(
    () => {}
  );
  mouseHandlerRef.current = (event: React.MouseEvent) => {
    if (event.type === 'mousemove') {
      onMouseMove(event);
    } else if (event.type === 'mouseup') {
      onMouseUp();
    }
  };

  const draggedRect = isMouseDown
    ? getRectFromCornerCoordinates(dragStartCoordinates, dragCurrentCoordinates)
    : null;

  return (
    <>
      <rect
        className="rse-draw-layer"
        width={vectorWidth}
        height={vectorHeight}
        fill="transparent"
        onMouseDown={event => {
          const startCoordinates = getCoordinatesFromEvent(event, true);
          setMouseHandlerRef(mouseHandlerRef);
          setDragState({
            dragStartCoordinates: startCoordinates,
            dragCurrentCoordinates: startCoordinates,
            isMouseDown: true,
          });
        }}
      />
      {draggedRect && (
        <DrawPreviewComponent
          height={draggedRect.height}
          disabled
          isInternalComponent
          scale={scale}
          shapeId="rse-internal-draw-component"
          width={draggedRect.width}
          x={draggedRect.x}
          y={draggedRect.y}
        />
      )}
    </>
  );
};

DrawLayer.propTypes = propTypes;

export default DrawLayer;
