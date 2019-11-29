import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  getRectFromCornerCoordinates,
  defaultConstrainMove,
  defaultConstrainResize,
} from './utils';
import useRootContext from './useRootContext';
import DefaultDrawPreviewComponent from './DefaultDrawPreviewComponent';
import {
  Point,
  ConstrainMoveFunc,
  ConstrainResizeFunc,
  Rectangle,
} from './types';
import { EventType } from './EventEmitter';
import { useCancelModeOnEscapeKey, useUpdatingRef } from './hooks';

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
    dimensions: {
      scale,
      vectorHeight,
      vectorPaddingBottom,
      vectorPaddingLeft,
      vectorPaddingRight,
      vectorPaddingTop,
      vectorWidth,
    },
    eventEmitter,
    coordinateGetterRef,
  } = useRootContext();

  const [
    { isMouseDown, dragStartCoordinates, dragCurrentCoordinates },
    setDragState,
  ] = useState(defaultDragState);

  const getCoordinatesFromEvent = (
    event: React.MouseEvent | MouseEvent,
    isStartEvent = false
  ) => {
    const { x: rawX, y: rawY } = coordinateGetterRef.current(event);

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

  const resetDragState = () => setDragState(defaultDragState);
  const onMouseUp = () => {
    if (!isMouseDown) {
      return;
    }

    const newRect = getRectFromCornerCoordinates(
      dragStartCoordinates,
      dragCurrentCoordinates
    );

    resetDragState();

    if (
      dragStartCoordinates.x !== dragCurrentCoordinates.x &&
      dragStartCoordinates.y !== dragCurrentCoordinates.y
    ) {
      onAddShape(newRect);
    }
  };

  const onMouseMove = (event: MouseEvent) => {
    if (!isMouseDown) {
      return;
    }

    setDragState(prevDragState => ({
      ...prevDragState,
      dragCurrentCoordinates: getCoordinatesFromEvent(event),
    }));
  };

  const mouseHandlerRef = useUpdatingRef((event: MouseEvent) => {
    if (event.type === 'mousemove') {
      onMouseMove(event);
    } else if (event.type === 'mouseup') {
      onMouseUp();
    }
  });

  useCancelModeOnEscapeKey(isMouseDown, resetDragState);

  const draggedRect = isMouseDown
    ? getRectFromCornerCoordinates(dragStartCoordinates, dragCurrentCoordinates)
    : null;

  return (
    <>
      <rect
        className="rse-draw-layer"
        x={-vectorPaddingLeft}
        y={-vectorPaddingTop}
        width={vectorWidth + vectorPaddingLeft + vectorPaddingRight}
        height={vectorHeight + vectorPaddingTop + vectorPaddingBottom}
        fill="transparent"
        onMouseDown={event => {
          const startCoordinates = getCoordinatesFromEvent(event, true);
          eventEmitter.overwriteAllListenersOfType(
            EventType.MouseEvent,
            mouseHandlerRef
          );
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
