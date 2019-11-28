import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import DefaultResizeHandleComponent from './DefaultResizeHandleComponent';
import useRootContext from './useRootContext.tsx';
import {
  getRectFromCornerCoordinates,
  defaultConstrainMove,
  defaultConstrainResize,
} from './utils.ts';
import { useUpdatingRef } from './hooks.ts';
import { EventType } from './EventEmitter.ts';

const getHandles = (
  ResizeHandleComponent,
  sides,
  scale,
  active,
  nativeActive,
  isInSelectionGroup,
  coordinateGetterRef,
  eventEmitter,
  mouseHandlerRef,
  setDragState
) => {
  const currentWidth = sides.right - sides.left;
  const currentHeight = sides.bottom - sides.top;

  // The corner of the resize box that moves
  const movementPoints = {
    nw: { x: sides.left, y: sides.top },
    sw: { x: sides.left, y: sides.bottom },
    ne: { x: sides.right, y: sides.top },
    se: { x: sides.right, y: sides.bottom },
  };
  // The corner of the resize box that stays static
  const anchorPoints = {
    nw: movementPoints.se,
    sw: movementPoints.ne,
    ne: movementPoints.sw,
    se: movementPoints.nw,
  };

  const RECOMMENDED_CORNER_SIZE = 10;
  const cornerSize = RECOMMENDED_CORNER_SIZE / scale;
  const hasSpaciousVertical =
    (sides.bottom - sides.top) * scale > RECOMMENDED_CORNER_SIZE * 2;
  const hasSpaciousHorizontal =
    (sides.right - sides.left) * scale > RECOMMENDED_CORNER_SIZE * 2;

  const handles = [
    hasSpaciousVertical && ['w', 'nw', 'ew-resize', 0, currentHeight / 2, 'y'],
    hasSpaciousHorizontal && ['n', 'ne', 'ns-resize', currentWidth / 2, 0, 'x'],
    hasSpaciousHorizontal && [
      's',
      'sw',
      'ns-resize',
      currentWidth / 2,
      currentHeight,
      'x',
    ],
    hasSpaciousVertical && [
      'e',
      'se',
      'ew-resize',
      currentWidth,
      currentHeight / 2,
      'y',
    ],
    ['nw', 'nw', 'nwse-resize', 0, 0, null],
    ['ne', 'ne', 'nesw-resize', currentWidth, 0, null],
    ['sw', 'sw', 'nesw-resize', 0, currentHeight, null],
    ['se', 'se', 'nwse-resize', currentWidth, currentHeight, null],
  ]
    .filter(a => a)
    .map(([handleName, movementReferenceCorner, cursor, x, y, dragLock]) => (
      <ResizeHandleComponent
        key={handleName}
        active={active}
        nativeActive={nativeActive}
        cursor={cursor}
        isInSelectionGroup={isInSelectionGroup}
        name={handleName}
        onMouseDown={event => {
          event.stopPropagation();

          const { x: planeX, y: planeY } = coordinateGetterRef.current(event);

          const movingPoint = movementPoints[movementReferenceCorner];
          const anchorPoint = anchorPoints[movementReferenceCorner];
          const nextDragInnerOffset = {
            x: planeX - movingPoint.x,
            y: planeY - movingPoint.y,
          };

          eventEmitter.overwriteAllListenersOfType(
            EventType.MouseEvent,
            mouseHandlerRef
          );

          setDragState({
            isMouseDown: true,
            dragStartCoordinates: anchorPoint,
            dragCurrentCoordinates: movingPoint,
            dragInnerOffset: nextDragInnerOffset,
            dragLock,
            isDragToMove: false,
          });
        }}
        recommendedSize={cornerSize}
        scale={scale}
        x={x}
        y={y}
      />
    ));

  return handles;
};

const useNotifyRoot = (
  eventEmitter,
  height,
  width,
  x,
  y,
  shapeId,
  isInternalComponent,
  shapeActions
) => {
  // Notify of shape rectangle changes
  useEffect(() => {
    eventEmitter.emit(EventType.ChildRectChanged, shapeId, isInternalComponent);
  }, [height, width, x, y, shapeId, isInternalComponent, eventEmitter]);

  // Notify of mount/unmount
  const shapeActionsRef = useUpdatingRef(shapeActions);
  useEffect(() => {
    if (!isInternalComponent) {
      eventEmitter.emit(EventType.MountedOrUnmounted, shapeActionsRef, true);
    }

    return () => {
      if (!isInternalComponent) {
        eventEmitter.emit(EventType.MountedOrUnmounted, shapeActionsRef, false);
      }
    };
  }, [shapeActionsRef, isInternalComponent, eventEmitter]);
};

const defaultDragState = {
  isMouseDown: false,
  dragStartCoordinates: null,
  dragCurrentCoordinates: null,
  dragInnerOffset: null,
  dragLock: null,
  isDragToMove: true,
};

const useShapeActions = (props, nativeActive, wrapperElRef, setDragState) => {
  const simulatedTransformRef = useRef(null);
  const shapeActions = {
    props,
    forceFocus() {
      // If it's already focused, return early
      if (nativeActive) {
        return;
      }

      if (wrapperElRef.current) {
        if (wrapperElRef.current.focus) {
          wrapperElRef.current.focus();
        } else {
          // IE11 doesn't have the focus method, so we use this hack from
          // https://allyjs.io/tutorials/focusing-in-svg.html#focusing-svg-elements
          try {
            HTMLElement.prototype.focus.apply(wrapperElRef.current);
          } catch (error) {
            // silence the error
          }
        }
      }
    },
    simulateTransform(nextRect) {
      cancelAnimationFrame(simulatedTransformRef.current);

      if (!nextRect) {
        setDragState(defaultDragState);
        return;
      }

      simulatedTransformRef.current = requestAnimationFrame(() => {
        setDragState(lastDragState => ({
          ...lastDragState,
          isMouseDown: true,
          dragStartCoordinates: { x: nextRect.x, y: nextRect.y },
          dragCurrentCoordinates: {
            x: nextRect.x + nextRect.width,
            y: nextRect.y + nextRect.height,
          },
        }));
      });
    },
  };

  return shapeActions;
};

const useMouseHandlerRef = (
  props,
  dragCurrentCoordinates,
  dragInnerOffset,
  dragLock,
  dragStartCoordinates,
  coordinateGetterRef,
  isDragToMove,
  isMouseDown,
  setDragState
) => {
  const {
    constrainMove,
    constrainResize,
    onChange,
    onIntermediateChange,
    height,
    width,
    x,
    y,
  } = props;

  const getParentCoordinatesForMove = event => {
    const { x: rawX, y: rawY } = coordinateGetterRef.current(
      event,
      dragInnerOffset
    );

    return constrainMove({
      originalX: dragCurrentCoordinates ? dragCurrentCoordinates.x : rawX,
      originalY: dragCurrentCoordinates ? dragCurrentCoordinates.y : rawY,
      x: rawX,
      y: rawY,
      width,
      height,
    });
  };

  const getParentCoordinatesForResize = event => {
    const { x: rawX, y: rawY } = coordinateGetterRef.current(
      event,
      dragInnerOffset
    );

    const { x: nextX, y: nextY } = constrainResize({
      originalMovingCorner: dragCurrentCoordinates,
      startCorner: dragStartCoordinates,
      movingCorner: { x: rawX, y: rawY },
      lockedDimension: dragLock,
    });

    return {
      x: dragLock !== 'x' ? nextX : dragCurrentCoordinates.x,
      y: dragLock !== 'y' ? nextY : dragCurrentCoordinates.y,
    };
  };

  const onMouseMove = event => {
    if (!isMouseDown) {
      return;
    }

    if (isDragToMove) {
      const coords = getParentCoordinatesForMove(event);
      if (coords) {
        const right = coords.x + width;
        const bottom = coords.y + height;

        setDragState(prevState => ({
          ...prevState,
          dragCurrentCoordinates: coords,
          dragStartCoordinates: { x: right, y: bottom },
        }));

        onIntermediateChange({
          x: coords.x,
          y: coords.y,
          width,
          height,
        });
      }
    } else {
      const coords = getParentCoordinatesForResize(event);
      if (coords) {
        setDragState(prevState => ({
          ...prevState,
          dragCurrentCoordinates: coords,
        }));

        onIntermediateChange(
          getRectFromCornerCoordinates(coords, dragStartCoordinates)
        );
      }
    }
  };

  const onMouseUp = () => {
    if (!isMouseDown) {
      return;
    }

    if (isDragToMove) {
      const { x: nextX, y: nextY } = dragCurrentCoordinates;

      setDragState(defaultDragState);
      if (nextX !== x || nextY !== y) {
        onChange({ x: nextX, y: nextY, width, height }, props);
      }
    } else {
      setDragState(defaultDragState);
      const nextRect = getRectFromCornerCoordinates(
        dragStartCoordinates,
        dragCurrentCoordinates
      );
      if (
        nextRect.height !== height ||
        nextRect.width !== width ||
        nextRect.x !== x ||
        nextRect.y !== y
      ) {
        onChange(nextRect, props);
      }
    }
  };

  const mouseHandlerRef = useUpdatingRef(event => {
    if (event.type === 'mousemove') {
      onMouseMove(event);
    } else if (event.type === 'mouseup') {
      onMouseUp();
    }
  });

  return mouseHandlerRef;
};

const useOnKeyDown = props => {
  const {
    constrainMove,
    constrainResize,
    height,
    keyboardTransformMultiplier,
    onChange,
    onDelete,
    onKeyDown,
    width,
    x,
    y,
  } = props;

  const keyboardMove = (dX, dY) => {
    const { x: nextX, y: nextY } = constrainMove({
      originalX: x,
      originalY: y,
      x: x + dX * keyboardTransformMultiplier,
      y: y + dY * keyboardTransformMultiplier,
      width,
      height,
    });

    onChange(
      {
        x: nextX,
        y: nextY,
        width: props.width,
        height: props.height,
      },
      props
    );
  };

  const keyboardResize = (dX, dY) => {
    const { x: nextX, y: nextY } = constrainResize({
      originalMovingCorner: {
        x: x + width,
        y: y + height,
      },
      startCorner: { x, y },
      movingCorner: {
        x: x + width + dX * keyboardTransformMultiplier,
        y: y + height + dY * keyboardTransformMultiplier,
      },
    });

    onChange(
      getRectFromCornerCoordinates({ x, y }, { x: nextX, y: nextY }),
      props
    );
  };

  return event => {
    // User-defined callback
    onKeyDown(event, props);

    // If the user-defined callback called event.preventDefault(),
    // we consider the event handled
    if (event.defaultPrevented) {
      return;
    }

    let handled = true;
    const handleKeyboardTransform = (moveArgs, resizeArgs) =>
      event.shiftKey
        ? keyboardResize(...resizeArgs)
        : keyboardMove(...moveArgs);
    switch (event.key) {
      case 'Backspace':
      case 'Delete':
        onDelete(event, props);
        break;
      case 'ArrowUp':
        handleKeyboardTransform([0, -1], [0, -1]);
        break;
      case 'ArrowRight':
        handleKeyboardTransform([1, 0], [1, 0]);
        break;
      case 'ArrowDown':
        handleKeyboardTransform([0, 1], [0, 1]);
        break;
      case 'ArrowLeft':
        handleKeyboardTransform([-1, 0], [-1, 0]);
        break;
      default:
        handled = false;
    }

    if (handled) {
      event.preventDefault();
    }
  };
};

function wrapShape(WrappedComponent) {
  const WrappedShape = React.forwardRef((props, forwardedRef) => {
    const {
      // props extracted here are not passed to child
      constrainMove,
      constrainResize,
      isInternalComponent,
      keyboardTransformMultiplier,
      onBlur,
      onChange,
      onDelete,
      onFocus,
      onIntermediateChange,
      onKeyDown,
      ResizeHandleComponent,
      wrapperProps,
      ...otherProps
    } = props;
    const {
      // props extracted here are still passed to the child
      active: artificialActive,
      disabled,
      isInSelectionGroup,
      shapeId,
      height,
      width,
      x,
      y,
    } = props;

    const {
      dimensions: { scale },
      coordinateGetterRef,
      eventEmitter,
    } = useRootContext();

    const wrapperElRef = useRef(null);

    const [nativeActive, setNativeActive] = useState(false);

    const active = artificialActive !== null ? artificialActive : nativeActive;

    const [
      {
        isMouseDown,
        dragStartCoordinates,
        dragCurrentCoordinates,
        dragInnerOffset,
        dragLock,
        isDragToMove,
      },
      setDragState,
    ] = useState(defaultDragState);

    const shapeActions = useShapeActions(
      props,
      nativeActive,
      wrapperElRef,
      setDragState
    );

    if (typeof forwardedRef === 'function') {
      forwardedRef(shapeActions);
    } else if (forwardedRef && typeof forwardedRef === 'object') {
      // eslint-disable-next-line no-param-reassign
      forwardedRef.current = shapeActions;
    }

    useNotifyRoot(
      eventEmitter,
      height,
      width,
      x,
      y,
      shapeId,
      isInternalComponent,
      shapeActions
    );

    const sides = !isMouseDown
      ? {
          left: x,
          right: x + width,
          top: y,
          bottom: y + height,
        }
      : {
          left: Math.min(dragStartCoordinates.x, dragCurrentCoordinates.x),
          right: Math.max(dragStartCoordinates.x, dragCurrentCoordinates.x),
          top: Math.min(dragStartCoordinates.y, dragCurrentCoordinates.y),
          bottom: Math.max(dragStartCoordinates.y, dragCurrentCoordinates.y),
        };

    const currentWidth = sides.right - sides.left;
    const currentHeight = sides.bottom - sides.top;

    const mouseHandlerRef = useMouseHandlerRef(
      props,
      dragCurrentCoordinates,
      dragInnerOffset,
      dragLock,
      dragStartCoordinates,
      coordinateGetterRef,
      isDragToMove,
      isMouseDown,
      setDragState
    );

    // Generate drag handles
    const handles = getHandles(
      ResizeHandleComponent,
      sides,
      scale,
      active,
      nativeActive,
      isInSelectionGroup,
      coordinateGetterRef,
      eventEmitter,
      mouseHandlerRef,
      setDragState
    );

    const shapeOnKeyDown = useOnKeyDown(props);
    const gotFocusAfterClickRef = useRef(true);

    return (
      <g
        data-shape-id={shapeId}
        className="rse-shape-wrapper"
        transform={`translate(${sides.left},${sides.top})`}
        style={{
          cursor: 'move',
          outline: 'none',
          ...(disabled ? { pointerEvents: 'none' } : {}),
        }}
        ref={wrapperElRef}
        focusable={!disabled ? true : undefined} // IE11 support
        tabIndex={!disabled ? 0 : undefined}
        onFocus={event => {
          gotFocusAfterClickRef.current = true;
          eventEmitter.emit(EventType.ChildFocus, shapeId, isInternalComponent);
          setNativeActive(true);

          // Call user-defined focus handler
          onFocus(event, props);
        }}
        onBlur={event => {
          setNativeActive(false);
          onBlur(event, props);
        }}
        onMouseUp={() => {
          // Focusing support for Safari
          // Safari (12) does not currently allow focusing via mouse events,
          // even on elements with tabIndex="0" (tabbing with the keyboard
          // does work, however). This logic waits to see if focus was called
          // following a click, and forces the focused state if necessary.
          if (!gotFocusAfterClickRef.current) {
            shapeActions.forceFocus();
          }
        }}
        onMouseDown={event => {
          event.stopPropagation();

          if (event.shiftKey) {
            eventEmitter.emit(
              EventType.ChildToggleSelection,
              shapeId,
              isInternalComponent,
              event
            );

            // Prevent default to keep this from triggering blur/focus events
            // on the elements involved, which would otherwise cause a wave
            // of event listener callbacks that are not needed.
            event.preventDefault();
            return;
          }

          gotFocusAfterClickRef.current = false;

          const { x: planeX, y: planeY } = coordinateGetterRef.current(event);

          eventEmitter.overwriteAllListenersOfType(
            EventType.MouseEvent,
            mouseHandlerRef
          );
          setDragState(prevState => ({
            ...prevState,
            isMouseDown: true,
            dragCurrentCoordinates: { x, y },
            dragStartCoordinates: {
              x: x + currentWidth,
              y: y + currentHeight,
            },
            dragInnerOffset: {
              x: planeX - x,
              y: planeY - y,
            },
            isDragToMove: true,
          }));
        }}
        onKeyDown={shapeOnKeyDown}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...wrapperProps}
      >
        <WrappedComponent
          isBeingChanged={isMouseDown}
          active={active}
          nativeActive={nativeActive}
          scale={scale}
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...otherProps}
          width={currentWidth}
          height={currentHeight}
        />
        {!disabled && handles}
      </g>
    );
  });

  WrappedShape.propTypes = {
    active: PropTypes.bool,
    constrainMove: PropTypes.func,
    constrainResize: PropTypes.func,
    disabled: PropTypes.bool,
    height: PropTypes.number.isRequired,
    isInSelectionGroup: PropTypes.bool,
    isInternalComponent: PropTypes.bool,
    keyboardTransformMultiplier: PropTypes.number,
    onBlur: PropTypes.func,
    onChange: PropTypes.func,
    onDelete: PropTypes.func,
    onFocus: PropTypes.func,
    onKeyDown: PropTypes.func,
    onIntermediateChange: PropTypes.func,
    ResizeHandleComponent: PropTypes.func,
    shapeId: PropTypes.string.isRequired,
    width: PropTypes.number.isRequired,
    wrapperProps: PropTypes.shape({}),
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  };

  WrappedShape.defaultProps = {
    active: null,
    constrainMove: defaultConstrainMove,
    constrainResize: defaultConstrainResize,
    disabled: false,
    isInSelectionGroup: false,
    isInternalComponent: false,
    keyboardTransformMultiplier: 1,
    onBlur: () => {},
    onChange: () => {},
    onDelete: () => {},
    onFocus: () => {},
    onIntermediateChange: () => {},
    onKeyDown: () => {},
    ResizeHandleComponent: DefaultResizeHandleComponent,
    wrapperProps: {},
  };

  WrappedShape.displayName = `wrapShape(${WrappedComponent.displayName ||
    WrappedComponent.name ||
    'Component'})`;

  return React.memo(WrappedShape);
}

export default wrapShape;
