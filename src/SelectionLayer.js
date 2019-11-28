import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { getRectFromCornerCoordinates } from './utils.ts';
import useRootContext from './useRootContext.tsx';
import DefaultSelectionDrawComponent from './DefaultSelectionDrawComponent';
import DefaultSelectionComponent from './DefaultSelectionComponent';
import {
  useCancelModeOnEscapeKey,
  useForceUpdate,
  useUpdatingRef,
} from './hooks.ts';
import { EventType, useAdditionalListener } from './EventEmitter.ts';

const defaultDragState = {
  dragStartCoordinates: null,
  dragCurrentCoordinates: null,
  isMouseDown: false,
};

export const SelectionContext = React.createContext(null);

const SELECTION_COMPONENT_SHAPE_ID = 'rse-internal-selection-component';

const getNextRectOfSelectionChild = (
  selectionStartRect,
  selectionEndRect,
  childRect
) => {
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

const getNextRectOfSelectionChildConstrained = (
  selectionStartRect,
  selectionEndRect,
  childRect,
  constrainMove,
  constrainResize
) => {
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
  });
  return { x, y, width: right - x, height: bottom - y };
};

const getSelectionRect = childRects => {
  const selectionX = Math.min(...childRects.map(c => c.x));
  const selectionY = Math.min(...childRects.map(c => c.y));

  return {
    x: selectionX,
    y: selectionY,
    height: Math.max(...childRects.map(c => c.y + c.height)) - selectionY,
    width: Math.max(...childRects.map(c => c.x + c.width)) - selectionX,
  };
};

const useMouseHandlerRef = (
  isMouseDown,
  dragStartCoordinates,
  dragCurrentCoordinates,
  setDragState,
  coordinateGetterRef,
  selectionElRef,
  onSelectionChange,
  wrappedShapeActionRefsRef,
  selectionIsLargeEnough
) => {
  const onMouseUp = () => {
    if (!isMouseDown) {
      return;
    }

    if (!selectionIsLargeEnough()) {
      setDragState(defaultDragState);
      return;
    }

    const selectRect = getRectFromCornerCoordinates(
      dragStartCoordinates,
      dragCurrentCoordinates
    );
    const selectedShapeIds = Object.keys(
      wrappedShapeActionRefsRef.current
    ).filter(shapeId => {
      const { x, y, width, height } = wrappedShapeActionRefsRef.current[
        shapeId
      ].current.props;

      return (
        x + width > selectRect.x &&
        x < selectRect.x + selectRect.width &&
        y + height > selectRect.y &&
        y < selectRect.y + selectRect.height
      );
    });

    setDragState(defaultDragState);

    onSelectionChange(selectedShapeIds);
    if (selectedShapeIds.length >= 2 && selectionElRef.current) {
      // Focus on the group selection rect when it is first drawn
      selectionElRef.current.forceFocus();
    } else if (selectedShapeIds.length === 1) {
      // In the event that a single shape is selected, give native focus to it as well
      wrappedShapeActionRefsRef.current[
        selectedShapeIds[0]
      ].current.forceFocus();
    }
  };

  const onMouseMove = event => {
    if (!isMouseDown) {
      return;
    }

    setDragState(dragState => ({
      ...dragState,
      dragCurrentCoordinates: coordinateGetterRef.current(event),
    }));
  };

  const mouseHandlerRef = useUpdatingRef(event => {
    if (event.type === 'mousemove') {
      onMouseMove(event);
    } else if (event.type === 'mouseup') {
      onMouseUp(event);
    }
  });

  return mouseHandlerRef;
};

const useChildAddDeleteHandler = (
  eventEmitter,
  onSelectionChange,
  selectedShapeIds,
  selectionElRef,
  wrappedShapeActionRefsRef
) => {
  const selectedChildrenDidChangeRef = useRef(false);
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    if (selectedChildrenDidChangeRef.current) {
      selectedChildrenDidChangeRef.current = false;

      // Only force update if there is a selection visible.
      // Otherwise, no change
      if (
        selectedShapeIds.filter(
          shapeId => wrappedShapeActionRefsRef.current[shapeId]
        ).length >= 2
      ) {
        forceUpdate();
      }
    }
  });

  const onChildRectChanged = (shapeId, isInternalComponent) => {
    if (isInternalComponent) return;

    if (
      !selectedChildrenDidChangeRef.current &&
      selectedShapeIds.indexOf(shapeId) >= 0
    ) {
      selectedChildrenDidChangeRef.current = true;
    }
  };

  const onShapeMountedOrUnmounted = (shapeActionsRef, didMount) => {
    const { shapeId } = shapeActionsRef.current.props;
    if (
      !selectedChildrenDidChangeRef.current &&
      selectedShapeIds.indexOf(shapeId) >= 0
    ) {
      selectedChildrenDidChangeRef.current = true;
    }

    if (didMount) {
      // eslint-disable-next-line no-param-reassign
      wrappedShapeActionRefsRef.current[shapeId] = shapeActionsRef;
    } else {
      // eslint-disable-next-line no-param-reassign
      delete wrappedShapeActionRefsRef.current[shapeId];
    }
  };

  const onChildToggleSelection = (
    clickedShapeId,
    isInternalComponent,
    event
  ) => {
    const isClickingSelection = clickedShapeId === SELECTION_COMPONENT_SHAPE_ID;
    if (isInternalComponent && !isClickingSelection) return;

    let targetShapeId = clickedShapeId;

    // When trying to click shapes behind the selection rectangle, the
    // selection rectangle absorbs the mouseDown event, so we have to
    // use the position of the click to retrieve the element under the mouse.
    if (isClickingSelection) {
      const elementsUnderMouse =
        typeof document.msElementsFromPoint === 'function'
          ? Array.prototype.slice.call(
              // msElementsFromPoint returns null when there are no elements
              // found
              document.msElementsFromPoint(event.clientX, event.clientY) || []
            )
          : document.elementsFromPoint(event.clientX, event.clientY);

      // Only the child elements (e.g., <rect>) of the wrapShape <g> tags
      // get picked up by elementsFromPoint, so here we aim to access the
      // <g> tags (which contain the shapeId) by getting the parentNode
      // of each element found
      for (let i = 0; i < elementsUnderMouse.length; i += 1) {
        const { parentNode } = elementsUnderMouse[i];
        if (!parentNode) {
          // eslint-disable-next-line no-continue
          continue;
        }

        // IE11-compatible way to get dataset info from SVG elements
        let shapeId = null;
        if (parentNode.dataset) {
          ({ shapeId } = parentNode.dataset);
        } else if (typeof parentNode.getAttribute === 'function') {
          shapeId = parentNode.getAttribute('data-shape-id');
        }

        if (
          typeof shapeId !== 'string' ||
          shapeId === SELECTION_COMPONENT_SHAPE_ID
        ) {
          // eslint-disable-next-line no-continue
          continue;
        }

        targetShapeId = shapeId;
        break;
      }
    }

    const isAdd = selectedShapeIds.indexOf(targetShapeId) < 0;
    if (isAdd) {
      const nextSelectedShapeIds = [...selectedShapeIds, targetShapeId];
      onSelectionChange(nextSelectedShapeIds);

      if (nextSelectedShapeIds.length >= 2) {
        // Focus on the group selection rect when it is drawn
        if (selectionElRef.current) {
          selectionElRef.current.forceFocus();
        } else {
          setTimeout(() => {
            if (selectionElRef.current) {
              selectionElRef.current.forceFocus();
            }
          });
        }
      }
    } else if (selectedShapeIds.length >= 2) {
      // Only deselect when it is a group selection
      onSelectionChange(selectedShapeIds.filter(id => id !== targetShapeId));
    }
  };

  const onChildFocus = (shapeId, isInternalComponent) => {
    if (isInternalComponent) return;

    if (
      // We don't want to focus on the shape if it's already
      // the only focused shape
      selectedShapeIds.length !== 1 ||
      selectedShapeIds[0] !== shapeId
    ) {
      onSelectionChange([shapeId]);
    }
  };

  useAdditionalListener(
    eventEmitter,
    EventType.MountedOrUnmounted,
    onShapeMountedOrUnmounted
  );
  useAdditionalListener(
    eventEmitter,
    EventType.ChildToggleSelection,
    onChildToggleSelection
  );
  useAdditionalListener(
    eventEmitter,
    EventType.ChildRectChanged,
    onChildRectChanged
  );
  useAdditionalListener(eventEmitter, EventType.ChildFocus, onChildFocus);
};

const SelectionLayer = ({
  children,
  keyboardTransformMultiplier,
  onChange,
  onDelete,
  onSelectionChange,
  selectedShapeIds,
  SelectionComponent,
  selectionComponentProps,
  SelectionDrawComponent,
  minimumDistanceForSelection,
}) => {
  const [
    { isMouseDown, dragStartCoordinates, dragCurrentCoordinates },
    setDragState,
  ] = useState(defaultDragState);
  useCancelModeOnEscapeKey(isMouseDown, () => setDragState(defaultDragState));

  const selectionIsLargeEnough = () => {
    const selectionRect = getRectFromCornerCoordinates(
      dragStartCoordinates,
      dragCurrentCoordinates
    );

    return (
      selectionRect.width >= minimumDistanceForSelection ||
      selectionRect.height >= minimumDistanceForSelection
    );
  };

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

  const selectionElRef = useRef();
  const wrappedShapeActionRefsRef = useRef({});
  useChildAddDeleteHandler(
    eventEmitter,
    onSelectionChange,
    selectedShapeIds,
    selectionElRef,
    wrappedShapeActionRefsRef
  );

  const mouseHandlerRef = useMouseHandlerRef(
    isMouseDown,
    dragStartCoordinates,
    dragCurrentCoordinates,
    setDragState,
    coordinateGetterRef,
    selectionElRef,
    onSelectionChange,
    wrappedShapeActionRefsRef,
    selectionIsLargeEnough
  );

  const draggedRect = isMouseDown
    ? getRectFromCornerCoordinates(dragStartCoordinates, dragCurrentCoordinates)
    : null;

  const selectedShapeActionRefs = selectedShapeIds
    .map(shapeId => wrappedShapeActionRefsRef.current[shapeId])
    .filter(Boolean);

  let extra = null;
  if (isMouseDown) {
    if (selectionIsLargeEnough()) {
      extra = (
        <SelectionDrawComponent
          shapeId="rse-internal-selection-draw-component"
          disabled
          height={draggedRect.height}
          isInternalComponent
          scale={scale}
          width={draggedRect.width}
          x={draggedRect.x}
          y={draggedRect.y}
        />
      );
    }
  } else if (selectedShapeActionRefs.length >= 2) {
    const selectionRect = getSelectionRect(
      selectedShapeActionRefs.map(s => s.current.props)
    );
    extra = (
      <SelectionComponent
        keyboardTransformMultiplier={keyboardTransformMultiplier}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...selectionComponentProps}
        shapeId={SELECTION_COMPONENT_SHAPE_ID}
        isInternalComponent
        ref={selectionElRef}
        onIntermediateChange={intermediateRect => {
          selectedShapeActionRefs.forEach(shapeActionRef => {
            const {
              constrainMove,
              constrainResize,
              x,
              y,
              width,
              height,
            } = shapeActionRef.current.props;

            const tempRect = getNextRectOfSelectionChildConstrained(
              selectionRect,
              intermediateRect,
              { x, y, width, height },
              constrainMove,
              constrainResize
            );
            shapeActionRef.current.simulateTransform(tempRect);
          });
        }}
        onDelete={event => {
          onDelete(
            event,
            selectedShapeActionRefs.map(
              shapeActionRef => shapeActionRef.current.props
            )
          );
        }}
        onChange={nextSelectionRect => {
          const nextRects = selectedShapeActionRefs.map(shapeActionRef => {
            const {
              constrainMove,
              constrainResize,
              x,
              y,
              width,
              height,
            } = shapeActionRef.current.props;

            return getNextRectOfSelectionChildConstrained(
              selectionRect,
              nextSelectionRect,
              { x, y, width, height },
              constrainMove,
              constrainResize
            );
          });

          // Restore the shapes back to their original positions
          selectedShapeActionRefs.forEach(s => {
            s.current.simulateTransform(null);
          });

          onChange(
            nextRects,
            selectedShapeActionRefs.map(s => s.current.props)
          );
        }}
        scale={scale}
        height={selectionRect.height}
        width={selectionRect.width}
        x={selectionRect.x}
        y={selectionRect.y}
      />
    );
  }

  return (
    <g
      onMouseDown={() => {
        // Clear the selection
        if (selectedShapeIds.length > 0) {
          onSelectionChange([]);
        }
      }}
    >
      <rect
        className="rse-selection-layer"
        x={-vectorPaddingLeft}
        y={-vectorPaddingTop}
        width={vectorWidth + vectorPaddingLeft + vectorPaddingRight}
        height={vectorHeight + vectorPaddingTop + vectorPaddingBottom}
        fill="transparent"
        onMouseDown={event => {
          const startCoordinates = coordinateGetterRef.current(event);
          eventEmitter.overwriteAllListenersOfType(
            EventType.MouseEvent,
            mouseHandlerRef
          );
          setDragState({
            dragStartCoordinates: startCoordinates,
            dragCurrentCoordinates: startCoordinates,
            isMouseDown: true,
          });

          // Clear the selection
          if (selectedShapeIds.length > 0) {
            onSelectionChange([]);
          }
        }}
      />

      {children}
      {extra}
    </g>
  );
};

SelectionLayer.propTypes = {
  children: PropTypes.node,
  keyboardTransformMultiplier: PropTypes.number,
  minimumDistanceForSelection: PropTypes.number,
  onChange: PropTypes.func,
  onDelete: PropTypes.func,
  onSelectionChange: PropTypes.func.isRequired,
  selectedShapeIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  SelectionComponent: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({}),
  ]),
  selectionComponentProps: PropTypes.shape({}),
  SelectionDrawComponent: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({}),
  ]),
};

SelectionLayer.defaultProps = {
  children: null,
  keyboardTransformMultiplier: 1,
  minimumDistanceForSelection: 15,
  onChange: () => {},
  onDelete: () => {},
  SelectionComponent: DefaultSelectionComponent,
  selectionComponentProps: {},
  SelectionDrawComponent: DefaultSelectionDrawComponent,
};

export default SelectionLayer;
