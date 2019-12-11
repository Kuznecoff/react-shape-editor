import React, { useLayoutEffect, useRef, useState } from 'react';
import PropTypes, { ReactNodeLike, ReactComponentLike } from 'prop-types';
import { getRectFromCornerCoordinates, getElementsFromPoint } from './utils';
import useRootContext from './useRootContext';
import DefaultSelectionDrawComponent from './DefaultSelectionDrawComponent';
import DefaultSelectionComponent from './DefaultSelectionComponent';
import {
  useCancelModeOnEscapeKey,
  useForceUpdate,
  useUpdatingRef,
} from './hooks';
import { EventType, useAdditionalListener, EventEmitter } from './EventEmitter';
import {
  Point,
  ShapeId,
  WrappedShapePropsInActions,
  Rectangle,
  ShapeActions,
} from './types';

type DragState = {
  dragStartCoordinates: Point;
  dragCurrentCoordinates: Point;
  isMouseDown: boolean;
};
const defaultDragState: DragState = {
  dragStartCoordinates: { x: 0, y: 0 },
  dragCurrentCoordinates: { x: 0, y: 0 },
  isMouseDown: false,
};

export const SelectionContext = React.createContext(null);

const SELECTION_COMPONENT_SHAPE_ID = 'rse-internal-selection-component';

const getSelectionRect = (childRects: Rectangle[]) => {
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
  isMouseDown: boolean,
  dragStartCoordinates: Point,
  dragCurrentCoordinates: Point,
  setDragState,
  coordinateGetterRef,
  selectionElRef,
  onSelectionChange,
  wrappedShapeActionRefsRef,
  selectionIsLargeEnough: () => boolean
) => {
  const onMouseUp = () => {
    if (!isMouseDown) return;

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

  const onMouseMove = (event: MouseEvent) => {
    if (!isMouseDown) return;

    setDragState(dragState => ({
      ...dragState,
      dragCurrentCoordinates: coordinateGetterRef.current(event),
    }));
  };

  const mouseHandlerRef = useUpdatingRef((event: MouseEvent) => {
    if (event.type === 'mousemove') {
      onMouseMove(event);
    } else if (event.type === 'mouseup') {
      onMouseUp();
    }
  });

  return mouseHandlerRef;
};

const useChildAddDeleteHandler = (
  eventEmitter: EventEmitter,
  onSelectionChange,
  selectedShapeIds: ShapeId[],
  selectionElRef,
  wrappedShapeActionRefsRef
) => {
  const selectedChildrenDidChangeRef = useRef(false);
  const forceUpdate = useForceUpdate();

  useLayoutEffect(() => {
    if (selectedChildrenDidChangeRef.current) {
      selectedChildrenDidChangeRef.current = false;

      // Only force update if there is a selection.
      // Otherwise, no change
      if (selectedShapeIds.length >= 2) {
        forceUpdate();
      }
    }
  });

  const onChildRectChanged = (
    shapeId: ShapeId,
    isInternalComponent: boolean
  ) => {
    if (isInternalComponent) return;

    if (
      !selectedChildrenDidChangeRef.current &&
      selectedShapeIds.indexOf(shapeId) >= 0
    ) {
      selectedChildrenDidChangeRef.current = true;
    }
  };

  const onShapeMountedOrUnmounted = (
    shapeActionsRef: React.MutableRefObject<ShapeActions>,
    didMount: boolean
  ) => {
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
    clickedShapeId: ShapeId,
    isInternalComponent: boolean,
    event: React.MouseEvent
  ) => {
    const isClickingSelection = clickedShapeId === SELECTION_COMPONENT_SHAPE_ID;
    if (isInternalComponent && !isClickingSelection) return;

    let targetShapeId = clickedShapeId;

    // When trying to click shapes behind the selection rectangle, the
    // selection rectangle absorbs the mouseDown event, so we have to
    // use the position of the click to retrieve the element under the mouse.
    if (isClickingSelection) {
      const elementsUnderMouse = getElementsFromPoint(
        event.clientX,
        event.clientY
      );

      // Only the child elements (e.g., <rect>) of the wrapShape <g> tags
      // get picked up by elementsFromPoint, so here we aim to access the
      // <g> tags (which contain the shapeId) by getting the parentNode
      // of each element found
      for (let i = 0; i < elementsUnderMouse.length; i += 1) {
        const parentNode = elementsUnderMouse[i].parentNode as
          | SVGElement
          | HTMLElement
          | null;
        if (!parentNode || !(parentNode instanceof SVGGElement)) {
          // eslint-disable-next-line no-continue
          continue;
        }

        // IE11-compatible way to get dataset info from SVG elements
        let shapeId: string | null | undefined;
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

  const onChildFocus = (shapeId: ShapeId, isInternalComponent: boolean) => {
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

const propTypes = {
  children: PropTypes.node,
  keyboardTransformMultiplier: PropTypes.number,
  minimumDistanceForSelection: PropTypes.number,
  onChange: PropTypes.func,
  onDelete: PropTypes.func,
  onSelectionChange: PropTypes.func.isRequired,
  selectedShapeIds: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
  SelectionComponent: PropTypes.elementType,
  selectionComponentProps: PropTypes.shape({}),
  SelectionDrawComponent: PropTypes.elementType,
};
type Props = {
  children?: ReactNodeLike;
  keyboardTransformMultiplier?: number;
  minimumDistanceForSelection?: number;
  onChange?: (
    nextRects: Rectangle[],
    changedShapesProps: WrappedShapePropsInActions[]
  ) => void;
  onDelete?: (
    event: React.KeyboardEvent,
    deletedShapesProps: WrappedShapePropsInActions[]
  ) => void;
  onSelectionChange: (selectedShapeIds: ShapeId[]) => void;
  selectedShapeIds: ShapeId[];
  SelectionComponent?: ReactComponentLike;
  selectionComponentProps?: object;
  SelectionDrawComponent?: ReactComponentLike;
};

const SelectionLayer: React.FunctionComponent<Props> = ({
  children = null,
  keyboardTransformMultiplier = 1,
  minimumDistanceForSelection = 15,
  onChange = () => {},
  onDelete = () => {},
  onSelectionChange,
  selectedShapeIds,
  SelectionComponent = DefaultSelectionComponent,
  selectionComponentProps = {},
  SelectionDrawComponent = DefaultSelectionDrawComponent,
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
  const wrappedShapeActionRefsRef = useRef<{
    [shapeId: string]: React.MutableRefObject<ShapeActions>;
  }>({});
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

  const selectedShapeActionRefs = selectedShapeIds
    .map(shapeId => wrappedShapeActionRefsRef.current[shapeId])
    .filter(Boolean);

  let extra: JSX.Element | null = null;
  if (isMouseDown) {
    if (selectionIsLargeEnough()) {
      const selectionRect = getRectFromCornerCoordinates(
        dragStartCoordinates,
        dragCurrentCoordinates
      );
      extra = (
        <SelectionDrawComponent
          shapeId="rse-internal-selection-draw-component"
          disabled
          height={selectionRect.height}
          isInternalComponent
          scale={scale}
          width={selectionRect.width}
          x={selectionRect.x}
          y={selectionRect.y}
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
            const tempRect = shapeActionRef.current.getSelectionChildUpdatedRect(
              selectionRect,
              intermediateRect
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
          const nextRects = selectedShapeActionRefs.map(shapeActionRef =>
            shapeActionRef.current.getSelectionChildUpdatedRect(
              selectionRect,
              nextSelectionRect
            )
          );

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
      onMouseDown={event => {
        // Ignore anything but left clicks
        if (event.buttons !== 1) return;

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
          // Ignore anything but left clicks
          if (event.buttons !== 1) return;

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

SelectionLayer.propTypes = propTypes;

export default SelectionLayer;
