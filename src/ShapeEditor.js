import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  CallbacksContext,
  VectorHeightContext,
  VectorWidthContext,
  ScaleContext,
} from './useRootContext.tsx';

class ShapeEditor extends Component {
  constructor(props) {
    super(props);

    this.wrappedShapeActionRefs = [];
    this.justAddedShapeActionRefs = [];

    this.getPlaneCoordinatesFromEvent = this.getPlaneCoordinatesFromEvent.bind(
      this
    );
    this.onMouseEvent = this.onMouseEvent.bind(this);
    this.onShapeMountedOrUnmounted = this.onShapeMountedOrUnmounted.bind(this);
    this.setMouseHandlerRef = this.setMouseHandlerRef.bind(this);

    this.callbacks = {
      onShapeMountedOrUnmounted: this.onShapeMountedOrUnmounted,
      getPlaneCoordinatesFromEvent: this.getPlaneCoordinatesFromEvent,
      setMouseHandlerRef: this.setMouseHandlerRef,
    };
  }

  componentDidMount() {
    window.addEventListener('mouseup', this.onMouseEvent);
    window.addEventListener('mousemove', this.onMouseEvent);
  }

  componentDidUpdate() {
    if (this.justAddedShapeActionRefs.length > 0 && this.props.focusOnAdd) {
      // Focus on shapes added since the last update
      this.justAddedShapeActionRefs.slice(-1)[0].current.forceFocus();
    } else if (this.lastDeletedRect && this.props.focusOnDelete) {
      // If something was deleted since the last update, focus on the
      // next closest shape by center coordinates
      const getShapeCenter = shape => ({
        x: shape.x + shape.width / 2,
        y: shape.y + shape.height / 2,
      });
      const deletedShapeCenter = getShapeCenter(this.lastDeletedRect);

      let closestDistance = Math.MAX_SAFE_INTEGER || 2 ** 53 - 1;
      let closestShapeActions = null;
      this.wrappedShapeActionRefs.forEach(shapeActionRef => {
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

    this.justAddedShapeActionRefs = [];
    this.lastDeletedRect = null;
  }

  componentWillUnmount() {
    window.removeEventListener('mouseup', this.onMouseEvent);
    window.removeEventListener('mousemove', this.onMouseEvent);

    this.justAddedShapeActionRefs = [];
    this.wrappedShapeActionRefs = [];
    this.unmounted = true;
  }

  onMouseEvent(event) {
    if (
      this.mouseHandlerRef &&
      typeof this.mouseHandlerRef.current === 'function'
    ) {
      this.mouseHandlerRef.current(event);
    }
  }

  onShapeMountedOrUnmounted(shapeActionsRef, didMount) {
    if (didMount) {
      this.justAddedShapeActionRefs = [
        ...this.justAddedShapeActionRefs,
        shapeActionsRef,
      ];
      this.wrappedShapeActionRefs = [
        ...this.wrappedShapeActionRefs,
        shapeActionsRef,
      ];
    } else {
      this.lastDeletedRect = {
        x: shapeActionsRef.current.props.x,
        y: shapeActionsRef.current.props.y,
        width: shapeActionsRef.current.props.width,
        height: shapeActionsRef.current.props.height,
      };
      this.wrappedShapeActionRefs = this.wrappedShapeActionRefs.filter(
        s => s !== shapeActionsRef
      );
    }
  }

  setMouseHandlerRef(mouseHandlerRef) {
    this.mouseHandlerRef = mouseHandlerRef;
  }

  getPlaneCoordinatesFromEvent(event, { x: offsetX = 0, y: offsetY = 0 } = {}) {
    const { scale } = this.props;
    const { top, left } = this.svgEl.getBoundingClientRect();

    return {
      x: (event.clientX - left) / scale - offsetX,
      y: (event.clientY - top) / scale - offsetY,
    };
  }

  render() {
    const {
      children,
      focusOnAdd,
      focusOnDelete,
      scale,
      vectorHeight,
      vectorWidth,
      style,
      ...otherProps
    } = this.props;

    return (
      <svg
        className="rse-plane-container"
        width={vectorWidth * scale}
        height={vectorHeight * scale}
        viewBox={`0 0 ${vectorWidth} ${vectorHeight}`}
        ref={el => {
          this.svgEl = el;
        }}
        style={{
          userSelect: 'none',
          ...style,
        }}
        // IE11 - prevent all elements from being focusable by default
        focusable={false}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...otherProps}
      >
        <CallbacksContext.Provider value={this.callbacks}>
          <VectorHeightContext.Provider value={vectorHeight}>
            <VectorWidthContext.Provider value={vectorWidth}>
              <ScaleContext.Provider value={scale}>
                {children}
              </ScaleContext.Provider>
            </VectorWidthContext.Provider>
          </VectorHeightContext.Provider>
        </CallbacksContext.Provider>
      </svg>
    );
  }
}

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
