import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  useCallback,
  useLayoutEffect,
} from 'react';
import PropTypes from 'prop-types';
import DefaultResizeHandleComponent from './DefaultResizeHandleComponent';
import useRootContext from './useRootContext';
import {
  getRectFromCornerCoordinates,
  defaultConstrainMove,
  defaultConstrainResize,
  forceFocus,
} from './utils';
import { useCancelModeOnEscapeKey, useUpdatingRef } from './hooks';
import { EventType, EventEmitter } from './EventEmitter';
import {
  ConstrainMoveFunc,
  ConstrainResizeFunc,
  HandleName,
  Point,
  Rectangle,
  ResizeCursor,
  ShapeActions,
  ShapeId,
  WrappedShapeProps,
  WrappedShapePropsInActions,
  WrappedShapeReceivedProps,
  GetSelectionChildUpdatedRect,
} from './types';

type Sides = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type DragLock = 'x' | 'y' | null;

type DragState = {
  isMouseDown: boolean;
  dragStartCoordinates: Point;
  dragCurrentCoordinates: Point;
  dragInnerOffset: Point;
  dragLock: DragLock;
  isDragToMove: boolean;
};
type SetDragState = React.Dispatch<React.SetStateAction<DragState>>;
const defaultDragState: DragState = {
  isMouseDown: false,
  dragStartCoordinates: { x: 0, y: 0 },
  dragCurrentCoordinates: { x: 0, y: 0 },
  dragInnerOffset: { x: 0, y: 0 },
  dragLock: null,
  isDragToMove: true,
};

const getHandles = (
  ResizeHandleComponent,
  sides: Sides,
  scale: number,
  active: boolean,
  nativeActive: boolean,
  isInSelectionGroup: boolean,
  coordinateGetterRef,
  requestMouseHandler,
  setDragState: SetDragState,
  isBeingChanged: boolean
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
    .map(
      ([handleName, movementReferenceCorner, cursor, x, y, dragLock]: [
        HandleName,
        HandleName,
        ResizeCursor,
        number,
        number,
        DragLock
      ]) => (
        <ResizeHandleComponent
          key={handleName}
          active={active}
          nativeActive={nativeActive}
          cursor={cursor}
          isBeingChanged={isBeingChanged}
          isInSelectionGroup={isInSelectionGroup}
          name={handleName}
          onMouseDown={(event: React.MouseEvent) => {
            // Ignore anything but left clicks
            if (event.buttons !== 1) return;

            event.stopPropagation();

            const { x: planeX, y: planeY } = coordinateGetterRef.current(event);

            const movingPoint = movementPoints[movementReferenceCorner];
            const anchorPoint = anchorPoints[movementReferenceCorner];
            const nextDragInnerOffset = {
              x: planeX - movingPoint.x,
              y: planeY - movingPoint.y,
            };

            requestMouseHandler();

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
      )
    );

  return handles;
};

const useNotifyRoot = (
  eventEmitter: EventEmitter,
  height: number,
  width: number,
  x: number,
  y: number,
  shapeId: ShapeId,
  isInternalComponent: boolean,
  shapeActions: ShapeActions
) => {
  // Notify of shape rectangle changes
  useLayoutEffect(() => {
    eventEmitter.emit(EventType.ChildRectChanged, shapeId, isInternalComponent);
  }, [height, width, x, y, shapeId, isInternalComponent, eventEmitter]);

  // Notify of mount/unmount
  const shapeActionsRef = useUpdatingRef(shapeActions);
  useLayoutEffect(() => {
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

const getNextRectOfSelectionChild = (
  selectionStartRect: Rectangle,
  selectionEndRect: Rectangle,
  childRect: Rectangle
): Rectangle => {
  const scaleX =
    selectionStartRect.width !== 0
      ? selectionEndRect.width / selectionStartRect.width
      : 0;
  const scaleY =
    selectionStartRect.height !== 0
      ? selectionEndRect.height / selectionStartRect.height
      : 0;

  return {
    x: selectionEndRect.x + (childRect.x - selectionStartRect.x) * scaleX,
    y: selectionEndRect.y + (childRect.y - selectionStartRect.y) * scaleY,
    width: scaleX !== 0 ? childRect.width * scaleX : selectionEndRect.width,
    height: scaleY !== 0 ? childRect.height * scaleY : selectionEndRect.height,
  };
};

const createSelectionChildRectConstrainedGetter = (
  childRect: Rectangle,
  constrainMove: ConstrainMoveFunc,
  constrainResize: ConstrainResizeFunc,
  vectorHeight: number,
  vectorWidth: number
) => (selectionStartRect: Rectangle, selectionEndRect: Rectangle) => {
  const {
    x: adjustedX,
    y: adjustedY,
    width: adjustedWidth,
    height: adjustedHeight,
  } = getNextRectOfSelectionChild(
    selectionStartRect,
    selectionEndRect,
    childRect
  );

  const { x, y } = constrainMove({
    originalX: childRect.x,
    originalY: childRect.y,
    x: adjustedX,
    y: adjustedY,
    width: adjustedWidth,
    height: adjustedHeight,
    vectorHeight,
    vectorWidth,
  });

  const { x: right, y: bottom } = constrainResize({
    originalMovingCorner: {
      x: x + childRect.width,
      y: y + childRect.height,
    },
    startCorner: { x, y },
    movingCorner: {
      x: x + adjustedWidth,
      y: y + adjustedHeight,
    },
    lockedDimension: null,
    vectorHeight,
    vectorWidth,
  });
  return { x, y, width: right - x, height: bottom - y };
};

const useShapeActions = (
  forwardedRef,
  props: WrappedShapePropsInActions,
  forceFocusCb: () => void,
  getSelectionChildUpdatedRect: GetSelectionChildUpdatedRect,
  setDragState: SetDragState
): ShapeActions => {
  const simulatedTransformRef = useRef(0);
  const shapeActions = {
    props,
    forceFocus: forceFocusCb,
    getSelectionChildUpdatedRect,
    simulateTransform(nextRect: Rectangle) {
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

  useImperativeHandle(forwardedRef, () => shapeActions, [
    props,
    forceFocusCb,
    setDragState,
  ]);

  return shapeActions;
};

const useMouseHandlerRef = (
  props: WrappedShapePropsInActions,
  constrainMove: ConstrainMoveFunc,
  constrainResize: ConstrainResizeFunc,
  coordinateGetterRef,
  dragCurrentCoordinates: Point,
  dragInnerOffset: Point,
  dragLock: DragLock,
  dragStartCoordinates: Point,
  eventEmitter,
  isDragToMove: boolean,
  isMouseDown: boolean,
  onChange,
  onIntermediateChange,
  setDragState: SetDragState,
  vectorHeight: number,
  vectorWidth: number
) => {
  const { height, width, x, y } = props;

  const onMouseMove = (event: MouseEvent) => {
    if (!isMouseDown) return;

    if (isDragToMove) {
      const { x: rawX, y: rawY } = coordinateGetterRef.current(
        event,
        dragInnerOffset
      );

      const coords = constrainMove({
        originalX: dragCurrentCoordinates.x,
        originalY: dragCurrentCoordinates.y,
        x: rawX,
        y: rawY,
        width,
        height,
        vectorHeight,
        vectorWidth,
      });

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
    } else {
      const { x: rawX, y: rawY } = coordinateGetterRef.current(
        event,
        dragInnerOffset
      );

      const { x: nextX, y: nextY } = constrainResize({
        originalMovingCorner: dragCurrentCoordinates,
        startCorner: dragStartCoordinates,
        movingCorner: { x: rawX, y: rawY },
        lockedDimension: dragLock,
        vectorHeight,
        vectorWidth,
      });

      const coords = {
        x: dragLock !== 'x' ? nextX : dragCurrentCoordinates.x,
        y: dragLock !== 'y' ? nextY : dragCurrentCoordinates.y,
      };
      setDragState(prevState => ({
        ...prevState,
        dragCurrentCoordinates: coords,
      }));

      onIntermediateChange(
        getRectFromCornerCoordinates(coords, dragStartCoordinates)
      );
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

  const mouseHandlerRef = useUpdatingRef((event: MouseEvent) => {
    if (event.type === 'mousemove') {
      onMouseMove(event);
    } else if (event.type === 'mouseup') {
      onMouseUp();
    }
  });

  return () => {
    eventEmitter.overwriteAllListenersOfType(
      EventType.MouseEvent,
      mouseHandlerRef
    );
  };
};

const useOnKeyDown = (
  props: WrappedShapePropsInActions,
  constrainMove: ConstrainMoveFunc,
  constrainResize: ConstrainResizeFunc,
  height: number,
  keyboardTransformMultiplier: number,
  onChange,
  onDelete,
  onKeyDown,
  vectorHeight: number,
  vectorWidth: number,
  width: number,
  x: number,
  y: number
) => {
  const keyboardMove = (dX: number, dY: number) => {
    const { x: nextX, y: nextY } = constrainMove({
      originalX: x,
      originalY: y,
      x: x + dX * keyboardTransformMultiplier,
      y: y + dY * keyboardTransformMultiplier,
      width,
      height,
      vectorHeight,
      vectorWidth,
    });

    onChange({ x: nextX, y: nextY, width, height }, props);
  };

  const keyboardResize = (dX: number, dY: number) => {
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
      lockedDimension: null,
      vectorHeight,
      vectorWidth,
    });

    onChange(
      getRectFromCornerCoordinates({ x, y }, { x: nextX, y: nextY }),
      props
    );
  };

  return (event: React.KeyboardEvent) => {
    // User-defined callback
    onKeyDown(event, props);

    // If the user-defined callback called event.preventDefault(),
    // we consider the event handled
    if (event.defaultPrevented) return;

    let handled = true;
    type KeyArgs = [number, number];
    const handleKeyboardTransform = (moveArgs: KeyArgs, resizeArgs: KeyArgs) =>
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

function wrapShape(
  WrappedComponent: React.ComponentType<WrappedShapeReceivedProps>
) {
  const propTypes = {
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

  const WrappedShape = React.forwardRef<ShapeActions, WrappedShapeProps>(
    (
      {
        // props extracted here are not passed to child
        constrainMove = defaultConstrainMove,
        constrainResize = defaultConstrainResize,
        isInternalComponent = false,
        keyboardTransformMultiplier = 1,
        onBlur = () => {},
        onChange = () => {},
        onDelete = () => {},
        onFocus = () => {},
        onIntermediateChange = () => {},
        onKeyDown = () => {},
        ResizeHandleComponent = DefaultResizeHandleComponent,
        wrapperProps = {},
        ...otherMainProps
      },
      forwardedRef
    ) => {
      const [nativeActive, setNativeActive] = useState(false);

      const props: WrappedShapePropsInActions = {
        disabled: false,
        isInSelectionGroup: false,
        ...otherMainProps,
        active:
          otherMainProps.active !== undefined
            ? otherMainProps.active
            : nativeActive,
      };
      const {
        // props extracted here are still passed to the child
        active,
        disabled,
        isInSelectionGroup,
        shapeId,
        height,
        width,
        x,
        y,
      } = props;

      const {
        dimensions: { scale, vectorHeight, vectorWidth },
        coordinateGetterRef,
        eventEmitter,
      } = useRootContext();

      const wrapperElRef = useRef<SVGGElement>(null);

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

      useCancelModeOnEscapeKey(isMouseDown, () =>
        setDragState(defaultDragState)
      );

      const forceFocusCb = useCallback(() => {
        // Force focus if it's not already focused
        if (!nativeActive) {
          forceFocus(wrapperElRef.current);
        }
      }, [nativeActive, wrapperElRef]);
      const getSelectionChildUpdatedRect = useCallback(
        createSelectionChildRectConstrainedGetter(
          { x, y, height, width },
          constrainMove,
          constrainResize,
          vectorHeight,
          vectorWidth
        ),
        [
          x,
          y,
          width,
          height,
          constrainMove,
          constrainResize,
          vectorWidth,
          vectorHeight,
        ]
      );
      const shapeActions = useShapeActions(
        forwardedRef,
        props,
        forceFocusCb,
        getSelectionChildUpdatedRect,
        setDragState
      );

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

      const requestMouseHandler = useMouseHandlerRef(
        props,
        constrainMove,
        constrainResize,
        coordinateGetterRef,
        dragCurrentCoordinates,
        dragInnerOffset,
        dragLock,
        dragStartCoordinates,
        eventEmitter,
        isDragToMove,
        isMouseDown,
        onChange,
        onIntermediateChange,
        setDragState,
        vectorHeight,
        vectorWidth
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
        requestMouseHandler,
        setDragState,
        isMouseDown
      );

      const shapeOnKeyDown = useOnKeyDown(
        props,
        constrainMove,
        constrainResize,
        height,
        keyboardTransformMultiplier,
        onChange,
        onDelete,
        onKeyDown,
        vectorHeight,
        vectorWidth,
        width,
        x,
        y
      );
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
          focusable={!disabled ? 'true' : undefined} // IE11 support
          tabIndex={!disabled ? 0 : undefined}
          onFocus={event => {
            gotFocusAfterClickRef.current = true;
            eventEmitter.emit(
              EventType.ChildFocus,
              shapeId,
              isInternalComponent
            );
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
            // Ignore anything but left clicks
            if (event.buttons !== 1) return;

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

            requestMouseHandler();

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
            {...props}
            width={currentWidth}
            height={currentHeight}
          />
          {!disabled && handles}
        </g>
      );
    }
  );

  WrappedShape.propTypes = propTypes;

  WrappedShape.displayName = `wrapShape(${WrappedComponent.displayName ||
    WrappedComponent.name ||
    'Component'})`;

  return React.memo(WrappedShape);
}

export default wrapShape;
