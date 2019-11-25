import React, { useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  CallbacksProvider,
  VectorHeightProvider,
  VectorWidthProvider,
  ScaleProvider,
} from './useRootContext.tsx';

const useMouseHandler = () => {
  const mouseHandlerRefRef = useRef();

  const setMouseHandlerRef = useCallback(
    mouseHandlerRef => {
      mouseHandlerRefRef.current = mouseHandlerRef;
    },
    [mouseHandlerRefRef]
  );

  useEffect(() => {
    const onMouseEvent = event => {
      if (
        mouseHandlerRefRef.current &&
        typeof mouseHandlerRefRef.current.current === 'function'
      ) {
        mouseHandlerRefRef.current.current(event);
      }
    };

    window.addEventListener('mouseup', onMouseEvent);
    window.addEventListener('mousemove', onMouseEvent);

    return () => {
      window.removeEventListener('mouseup', onMouseEvent);
      window.removeEventListener('mousemove', onMouseEvent);
    };
  }, [mouseHandlerRefRef]);

  return setMouseHandlerRef;
};

const useChildAddDeleteHandler = (focusOnAdd, focusOnDelete) => {
  const justAddedShapeActionRefsRef = useRef([]);
  const wrappedShapeActionRefsRef = useRef([]);
  const lastDeletedRectRef = useRef();

  useEffect(() => {
    if (justAddedShapeActionRefsRef.current.length > 0 && focusOnAdd) {
      // Focus on shapes added since the last update
      justAddedShapeActionRefsRef.current.slice(-1)[0].current.forceFocus();
    } else if (lastDeletedRectRef.current && focusOnDelete) {
      // If something was deleted since the last update, focus on the
      // next closest shape by center coordinates
      const getShapeCenter = shape => ({
        x: shape.x + shape.width / 2,
        y: shape.y + shape.height / 2,
      });
      const deletedShapeCenter = getShapeCenter(lastDeletedRectRef.current);

      let closestDistance = Math.MAX_SAFE_INTEGER || 2 ** 53 - 1;
      let closestShapeActions = null;
      wrappedShapeActionRefsRef.current.forEach(shapeActionRef => {
        const shapeCenter = getShapeCenter(shapeActionRef.current.props);
        const distance =
          (deletedShapeCenter.x - shapeCenter.x) ** 2 +
          (deletedShapeCenter.y - shapeCenter.y) ** 2;
        if (distance < closestDistance) {
          closestDistance = distance;
          closestShapeActions = shapeActionRef.current;
        }
      });

      if (closestShapeActions) {
        closestShapeActions.forceFocus();
      }
    }

    justAddedShapeActionRefsRef.current = [];
    lastDeletedRectRef.current = null;
  });

  const onShapeMountedOrUnmounted = (shapeActionsRef, didMount) => {
    if (didMount) {
      justAddedShapeActionRefsRef.current = [
        ...justAddedShapeActionRefsRef.current,
        shapeActionsRef,
      ];
      wrappedShapeActionRefsRef.current = [
        ...wrappedShapeActionRefsRef.current,
        shapeActionsRef,
      ];
    } else {
      const { x, y, width, height } = shapeActionsRef.current.props;
      lastDeletedRectRef.current = { x, y, width, height };
      wrappedShapeActionRefsRef.current = wrappedShapeActionRefsRef.current.filter(
        s => s !== shapeActionsRef
      );
    }
  };

  return onShapeMountedOrUnmounted;
};

const ShapeEditor = ({
  children,
  focusOnAdd,
  focusOnDelete,
  scale,
  vectorHeight,
  vectorWidth,
  style,
  ...otherProps
}) => {
  const svgElRef = useRef();
  const getPlaneCoordinatesFromEvent = useCallback(
    (event, { x: offsetX = 0, y: offsetY = 0 } = {}) => {
      const { top, left } = svgElRef.current.getBoundingClientRect();

      return {
        x: (event.clientX - left) / scale - offsetX,
        y: (event.clientY - top) / scale - offsetY,
      };
    },
    [scale]
  );

  const onShapeMountedOrUnmounted = useChildAddDeleteHandler(
    focusOnAdd,
    focusOnDelete
  );
  const setMouseHandlerRef = useMouseHandler();

  const callbacksRef = useRef({
    onShapeMountedOrUnmounted,
    getPlaneCoordinatesFromEvent,
    setMouseHandlerRef,
    onChildRectChanged: () => {},
    onChildFocus: () => {},
    onChildToggleSelection: () => {},
  });
  callbacksRef.current.onShapeMountedOrUnmounted = onShapeMountedOrUnmounted;
  callbacksRef.current.getPlaneCoordinatesFromEvent = getPlaneCoordinatesFromEvent;
  callbacksRef.current.setMouseHandlerRef = setMouseHandlerRef;

  return (
    <svg
      className="rse-plane-container"
      width={vectorWidth * scale}
      height={vectorHeight * scale}
      viewBox={`0 0 ${vectorWidth} ${vectorHeight}`}
      ref={svgElRef}
      style={{
        userSelect: 'none',
        ...style,
      }}
      // IE11 - prevent all elements from being focusable by default
      focusable={false}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...otherProps}
    >
      <CallbacksProvider value={callbacksRef.current}>
        <VectorHeightProvider value={vectorHeight}>
          <VectorWidthProvider value={vectorWidth}>
            <ScaleProvider value={scale}>{children}</ScaleProvider>
          </VectorWidthProvider>
        </VectorHeightProvider>
      </CallbacksProvider>
    </svg>
  );
};

ShapeEditor.propTypes = {
  children: PropTypes.node,
  focusOnAdd: PropTypes.bool,
  focusOnDelete: PropTypes.bool,
  scale: PropTypes.number,
  style: PropTypes.shape({}),
  vectorHeight: PropTypes.number,
  vectorWidth: PropTypes.number,
};

ShapeEditor.defaultProps = {
  children: null,
  focusOnAdd: true,
  focusOnDelete: true,
  scale: 1,
  style: {},
  vectorHeight: 0,
  vectorWidth: 0,
};

export default ShapeEditor;
