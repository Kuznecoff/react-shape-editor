import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import DefaultResizeHandleComponent from './DefaultResizeHandleComponent';
import { deprecatedWrappingStyle as withContext } from './useRootContext.tsx';
import {
  getRectFromCornerCoordinates,
  defaultConstrainMove,
  defaultConstrainResize,
} from './utils.ts';

const defaultDragState = {
  isMouseDown: false,
  dragStartCoordinates: null,
  dragCurrentCoordinates: null,
  dragInnerOffset: null,
  dragLock: null,
  isDragToMove: true,
};

function wrapShape(WrappedComponent) {
  // const WrappedShape = class extends React.PureComponent {
  //   constructor(props) {
  //     super(props);

  //     this.state = {
  //       ...defaultDragState,
  //       nativeActive: false,
  //     };
  //   }

  //   simulateTransform(nextRect) {
  //     cancelAnimationFrame(this.simulatedTransform);

  //     if (!nextRect) {
  //       this.setState(defaultDragState);
  //       return;
  //     }

  //     this.simulatedTransform = window.requestAnimationFrame(() => {
  //       this.setState(() => ({
  //         isMouseDown: true,
  //         dragStartCoordinates: { x: nextRect.x, y: nextRect.y },
  //         dragCurrentCoordinates: {
  //           x: nextRect.x + nextRect.width,
  //           y: nextRect.y + nextRect.height,
  //         },
  //       }));
  //     });
  //   }

  //   getParentCoordinatesForMove(event) {
  //     const {
  //       constrainMove,
  //       width,
  //       height,
  //       getPlaneCoordinatesFromEvent,
  //     } = this.props;
  //     const { dragCurrentCoordinates, dragInnerOffset } = this.state;

  //     const { x: rawX, y: rawY } = getPlaneCoordinatesFromEvent(
  //       event,
  //       dragInnerOffset
  //     );

  //     const { x, y } = constrainMove({
  //       originalX: dragCurrentCoordinates ? dragCurrentCoordinates.x : rawX,
  //       originalY: dragCurrentCoordinates ? dragCurrentCoordinates.y : rawY,
  //       x: rawX,
  //       y: rawY,
  //       width,
  //       height,
  //     });

  //     return { x, y };
  //   }

  //   getParentCoordinatesForResize(
  //     event,
  //     dragStartCoordinates = this.state.dragStartCoordinates,
  //     dragCurrentCoordinates = this.state.dragCurrentCoordinates,
  //     dragInnerOffset = this.state.dragInnerOffset,
  //     dragLock = this.state.dragLock
  //   ) {
  //     const { constrainResize, getPlaneCoordinatesFromEvent } = this.props;
  //     const { x: rawX, y: rawY } = getPlaneCoordinatesFromEvent(
  //       event,
  //       dragInnerOffset
  //     );

  //     const { x, y } = constrainResize({
  //       originalMovingCorner: dragCurrentCoordinates,
  //       startCorner: dragStartCoordinates,
  //       movingCorner: { x: rawX, y: rawY },
  //       lockedDimension: dragLock,
  //     });

  //     return {
  //       x: dragLock !== 'x' ? x : dragCurrentCoordinates.x,
  //       y: dragLock !== 'y' ? y : dragCurrentCoordinates.y,
  //     };
  //   }

  //   keyboardMove(dX, dY) {
  //     const {
  //       x,
  //       y,
  //       width,
  //       height,
  //       keyboardTransformMultiplier,
  //       constrainMove,
  //       onChange,
  //     } = this.props;

  //     const { x: nextX, y: nextY } = constrainMove({
  //       originalX: x,
  //       originalY: y,
  //       x: x + dX * keyboardTransformMultiplier,
  //       y: y + dY * keyboardTransformMultiplier,
  //       width,
  //       height,
  //     });

  //     onChange(
  //       {
  //         x: nextX,
  //         y: nextY,
  //         width: this.props.width,
  //         height: this.props.height,
  //       },
  //       this.props
  //     );
  //   }

  //   keyboardResize(dX, dY) {
  //     const {
  //       x,
  //       y,
  //       width,
  //       height,
  //       keyboardTransformMultiplier,
  //       constrainResize,
  //       onChange,
  //     } = this.props;

  //     const { x: nextX, y: nextY } = constrainResize({
  //       originalMovingCorner: {
  //         x: x + width,
  //         y: y + height,
  //       },
  //       startCorner: { x, y },
  //       movingCorner: {
  //         x: x + width + dX * keyboardTransformMultiplier,
  //         y: y + height + dY * keyboardTransformMultiplier,
  //       },
  //     });

  //     onChange(
  //       getRectFromCornerCoordinates({ x, y }, { x: nextX, y: nextY }),
  //       this.props
  //     );
  //   }

  //   forceFocus() {
  //     // If it's already focused, return early
  //     if (this.state.nativeActive) {
  //       return;
  //     }

  //     // IE11 doesn't have the focus method
  //     if (wrapperElRef.current && wrapperElRef.current.focus) {
  //       wrapperElRef.current.focus();
  //     }
  //   }

  const useUpdatingRef = value => {
    const ref = useRef(value);
    ref.current = value;
    return ref;
  };

  const useNotifyRoot = (
    height,
    width,
    x,
    y,
    onChildRectChanged,
    onShapeMountedOrUnmounted,
    shapeId,
    isInternalComponent,
    instance
  ) => {
    // Use refs for these so we can always use their most recent value,
    // but without triggering the rect change callback
    const onChildRectChangedRef = useUpdatingRef(onChildRectChanged);
    const shapeIdRef = useUpdatingRef(shapeId);
    const isInternalComponentRef = useUpdatingRef(isInternalComponent);

    // Notify of shape rectangle changes
    useEffect(() => {
      onChildRectChangedRef.current(
        shapeIdRef.current,
        isInternalComponentRef.current
      );
    }, [
      height,
      width,
      x,
      y,
      onChildRectChangedRef,
      shapeIdRef,
      isInternalComponentRef,
    ]);

    // Notify of mount/unmount
    const onShapeMountedOrUnmountedRef = useUpdatingRef(
      onShapeMountedOrUnmounted
    );
    useEffect(() => {
      if (!isInternalComponentRef.current) {
        onShapeMountedOrUnmountedRef.current(instance, true);
      }

      return () => {
        if (!isInternalComponentRef.current) {
          onShapeMountedOrUnmountedRef.current(instance, false);
        }
      };
    }, [instance, isInternalComponentRef, onShapeMountedOrUnmountedRef]);
  };

  function WrappedShape(props) {
    const {
      // props extracted here are not passed to child
      constrainMove,
      constrainResize,
      getPlaneCoordinatesFromEvent,
      isInternalComponent,
      keyboardTransformMultiplier,
      onBlur,
      onChange,
      onChildFocus,
      onChildRectChanged,
      onChildToggleSelection,
      onDelete,
      onFocus,
      onIntermediateChange,
      onKeyDown,
      onShapeMountedOrUnmounted,
      ResizeHandleComponent,
      setMouseHandlerRef,
      wrapperProps,
      ...otherProps
    } = props;
    const {
      // props extracted here are still passed to the child
      active: artificialActive,
      disabled,
      isInSelectionGroup,
      scale,
      shapeId,
      height,
      width,
      x,
      y,
    } = props;

    useNotifyRoot(
      height,
      width,
      x,
      y,
      onChildRectChanged,
      onShapeMountedOrUnmounted,
      shapeId,
      isInternalComponent,
      this
    );
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

    const onMouseMove = event => {
      if (!isMouseDown) {
        return;
      }

      if (isDragToMove) {
        const coords = this.getParentCoordinatesForMove(event);
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
        const coords = this.getParentCoordinatesForResize(event);
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

    const mouseHandlerRef = useRef(() => {});
    mouseHandlerRef.current = event => {
      if (event.type === 'mousemove') {
        onMouseMove(event);
      } else if (event.type === 'mouseup') {
        onMouseUp();
      }
    };
    const [nativeActive, setNativeActive] = useState(false);

    const active = artificialActive !== null ? artificialActive : nativeActive;

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

    const wrapperElRef = useRef(null);

    const RECOMMENDED_CORNER_SIZE = 10;
    const cornerSize = RECOMMENDED_CORNER_SIZE / scale;
    const hasSpaciousVertical =
      (sides.bottom - sides.top) * scale > RECOMMENDED_CORNER_SIZE * 2;
    const hasSpaciousHorizontal =
      (sides.right - sides.left) * scale > RECOMMENDED_CORNER_SIZE * 2;
    // Generate drag handles
    const handles = [
      hasSpaciousVertical && [
        'w',
        'nw',
        'ew-resize',
        0,
        currentHeight / 2,
        'y',
      ],
      hasSpaciousHorizontal && [
        'n',
        'ne',
        'ns-resize',
        currentWidth / 2,
        0,
        'x',
      ],
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

            const { x: planeX, y: planeY } = getPlaneCoordinatesFromEvent(
              event
            );

            const movingPoint = movementPoints[movementReferenceCorner];
            const anchorPoint = anchorPoints[movementReferenceCorner];
            const dragInnerOffset = {
              x: planeX - movingPoint.x,
              y: planeY - movingPoint.y,
            };

            setMouseHandlerRef({ current: this.mouseHandler });
            this.setState({
              isMouseDown: true,
              dragStartCoordinates: anchorPoint,
              dragCurrentCoordinates: movingPoint,
              dragInnerOffset,
              isDragToMove: false,
              dragLock,
            });
          }}
          recommendedSize={cornerSize}
          scale={scale}
          x={x}
          y={y}
        />
      ));

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
          this.gotFocusAfterClick = true;
          onChildFocus(shapeId, isInternalComponent);
          setNativeActive(true);
          onFocus(event, props);
        }}
        onBlur={event => {
          setNativeActive(false);
          onBlur(event, props);
        }}
        onMouseDown={event => {
          event.stopPropagation();

          // Focusing support for Safari
          // Safari (12) does not currently allow focusing via mouse events,
          // even on elements with tabIndex="0" (tabbing with the keyboard
          // does work, however). This logic waits to see if focus was called
          // following a click, and forces the focused state if necessary.
          this.gotFocusAfterClick = false;
          setTimeout(() => {
            if (!this.unmounted && !this.gotFocusAfterClick) {
              this.forceFocus();
            }
          });

          if (event.shiftKey) {
            onChildToggleSelection(shapeId, isInternalComponent, event);

            // Prevent default to keep this from triggering blur/focus events
            // on the elements involved, which would otherwise cause a wave
            // of event listener callbacks that are not needed.
            event.preventDefault();
            return;
          }

          const { x: planeX, y: planeY } = getPlaneCoordinatesFromEvent(event);

          setMouseHandlerRef(mouseHandlerRef);
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
        onKeyDown={event => {
          onKeyDown(event, props);

          // If the user-defined callback called event.preventDefault(),
          // we consider the event handled
          if (event.defaultPrevented) {
            return;
          }

          let handled = true;
          const handleKeyboardTransform = (moveArgs, resizeArgs) =>
            event.shiftKey
              ? this.keyboardResize(...resizeArgs)
              : this.keyboardMove(...moveArgs);
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
        }}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...wrapperProps}
      >
        <WrappedComponent
          isBeingChanged={isMouseDown}
          active={active}
          nativeActive={nativeActive}
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...otherProps}
          width={currentWidth}
          height={currentHeight}
        />
        {!disabled && handles}
      </g>
    );
  }

  WrappedShape.propTypes = {
    active: PropTypes.bool,
    constrainMove: PropTypes.func,
    constrainResize: PropTypes.func,
    disabled: PropTypes.bool,
    getPlaneCoordinatesFromEvent: PropTypes.func.isRequired,
    height: PropTypes.number.isRequired,
    isInSelectionGroup: PropTypes.bool,
    isInternalComponent: PropTypes.bool,
    keyboardTransformMultiplier: PropTypes.number,
    onBlur: PropTypes.func,
    onChange: PropTypes.func,
    onChildRectChanged: PropTypes.func,
    onChildFocus: PropTypes.func,
    onChildToggleSelection: PropTypes.func,
    onDelete: PropTypes.func,
    onFocus: PropTypes.func,
    onKeyDown: PropTypes.func,
    onIntermediateChange: PropTypes.func,
    onShapeMountedOrUnmounted: PropTypes.func.isRequired,
    ResizeHandleComponent: PropTypes.func,
    scale: PropTypes.number.isRequired,
    shapeId: PropTypes.string.isRequired,
    setMouseHandlerRef: PropTypes.func.isRequired,
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
    onChildRectChanged: () => {},
    onChildFocus: () => {},
    onChildToggleSelection: () => {},
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

  return withContext(WrappedShape);
}

export default wrapShape;
