import React, { Component } from 'react';
import PropTypes from 'prop-types';
import wrapShape from './wrapShape';
import { getRectFromCornerCoordinates } from './utils';

function getScaledMouseCoordinates(event, scale = 1) {
  const { top, left } = event.target.getBoundingClientRect();
  const domX = event.clientX - left;
  const domY = event.clientY - top;

  return {
    x: domX / scale,
    y: domY / scale,
  };
}

const DraggedOne = wrapShape(() => (
  <div style={{ background: 'rgba(0,0,255,0.5)', height: '100%' }} />
));

class ShapeEditor extends Component {
  constructor(props) {
    super(props);

    this.state = {
      planeWidth: 0,
      planeHeight: 0,
      dragStartCoordinates: null,
      dragCurrentCoordinates: null,
      hasDragStarted: false,
    };

    this.getImageDimensionInfo = this.getImageDimensionInfo.bind(this);
    this.getScaledDimensions = this.getScaledDimensions.bind(this);
    this.getCoordinatesFromEvent = this.getCoordinatesFromEvent.bind(this);
    this.onDragFinish = this.onDragFinish.bind(this);
  }

  componentDidMount() {
    this.getImageDimensionInfo();

    window.addEventListener('mouseup', this.onDragFinish);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.planeImageSrc !== this.props.planeImageSrc) {
      this.getImageDimensionInfo();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('mouseup', this.onDragFinish);
    this.unmounted = true;
  }

  // Load the background image in memory to measure its dimensions
  getImageDimensionInfo() {
    if (!this.props.planeImageSrc) {
      return;
    }

    const memoryImage = new Image();

    memoryImage.onload = () => {
      if (!this.unmounted) {
        this.setState({
          planeWidth: memoryImage.naturalWidth,
          planeHeight: memoryImage.naturalHeight,
        });
      }
    };
    memoryImage.src = this.props.planeImageSrc;
  }

  getScaledDimensions() {
    const { scale } = this.props;
    const { planeHeight, planeWidth } = this.state;

    return {
      scaledWidth: planeWidth * scale,
      scaledHeight: planeHeight * scale,
    };
  }

  getCoordinatesFromEvent(event, isStartEvent = false) {
    const { scale, constrainResize, constrainMove } = this.props;
    const { dragStartCoordinates, planeWidth, planeHeight } = this.state;

    const { x: rawX, y: rawY } = getScaledMouseCoordinates(event, scale);

    if (isStartEvent) {
      const { x, y } = constrainMove({
        x: rawX,
        y: rawY,
        width: 0,
        height: 0,
        planeWidth,
        planeHeight,
      });

      return { x, y };
    }

    const { x, y } = constrainResize({
      startCorner: dragStartCoordinates,
      movingCorner: { x: rawX, y: rawY },
      lockedDimension: null,
      planeWidth,
      planeHeight,
    });

    return { x, y };
  }

  onDragFinish(event) {
    if (!this.state.hasDragStarted) {
      return;
    }

    const { dragStartCoordinates, dragCurrentCoordinates } = this.state;
    if (
      dragStartCoordinates.x === dragCurrentCoordinates.x ||
      dragStartCoordinates.y === dragCurrentCoordinates.y
    ) {
      this.setState({
        dragStartCoordinates: null,
        dragCurrentCoordinates: null,
        hasDragStarted: false,
      });
      return;
    }

    const newRect = getRectFromCornerCoordinates(
      dragStartCoordinates,
      dragCurrentCoordinates
    );

    this.setState(
      {
        dragStartCoordinates: null,
        dragCurrentCoordinates: null,
        hasDragStarted: false,
      },
      () => {
        this.props.onAddShape(newRect);
      }
    );
  }

  render() {
    const {
      children,
      constrainMove,
      constrainResize,
      disableDrawMode,
      planeImageSrc,
      scale,
    } = this.props;
    const {
      dragCurrentCoordinates,
      dragStartCoordinates,
      hasDragStarted,
      planeHeight,
      planeWidth,
    } = this.state;
    const { scaledWidth, scaledHeight } = this.getScaledDimensions();

    const draggedRect = hasDragStarted
      ? getRectFromCornerCoordinates(
          dragStartCoordinates,
          dragCurrentCoordinates
        )
      : null;

    const childConstrainMove = rect =>
      constrainMove({ ...rect, planeWidth, planeHeight });
    const childConstrainResize = args =>
      constrainResize({ ...args, planeWidth, planeHeight });

    return (
      <div
        className="rse-outer-container"
        style={{ overflow: 'auto', height: '100%', userSelect: 'none' }}
      >
        {planeImageSrc ? (
          <div
            data-is-plane-container
            className="rse-plane-container"
            style={{
              backgroundImage: `url(${planeImageSrc})`,
              backgroundSize: 'cover',
              height: scaledHeight,
              width: scaledWidth,
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseDown={event => {
              if (disableDrawMode) {
                return;
              }

              const startCoordinates = this.getCoordinatesFromEvent(
                event,
                true
              );
              this.setState({
                hasDragStarted: true,
                dragStartCoordinates: startCoordinates,
                dragCurrentCoordinates: startCoordinates,
              });
            }}
            onMouseMove={event => {
              if (!hasDragStarted) {
                return;
              }

              const currentCoordinates = this.getCoordinatesFromEvent(event);

              this.setState({
                dragCurrentCoordinates: currentCoordinates,
              });
            }}
          >
            {React.Children.map(children, (child, i) =>
              React.cloneElement(child, {
                constrainMove: childConstrainMove,
                constrainResize: childConstrainResize,
                scale,
                isPlaneDragging: hasDragStarted,
              })
            )}
            {hasDragStarted && (
              <DraggedOne
                height={draggedRect.height}
                disabled
                scale={scale}
                width={draggedRect.width}
                x={draggedRect.x}
                y={draggedRect.y}
              />
            )}
          </div>
        ) : (
          'no image found'
        )}
      </div>
    );
  }
}

ShapeEditor.propTypes = {
  children: PropTypes.node,
  constrainMove: PropTypes.func,
  constrainResize: PropTypes.func,
  disableDrawMode: PropTypes.bool,
  onAddShape: PropTypes.func.isRequired,
  planeImageSrc: PropTypes.string.isRequired,
  scale: PropTypes.number,
};

ShapeEditor.defaultProps = {
  children: null,
  constrainMove: ({ x, y }) => ({ x, y }),
  constrainResize: ({ movingCorner }) => movingCorner,
  disableDrawMode: false,
  scale: 1,
};

export default ShapeEditor;
