export type ShapeId = string;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ConstrainMoveFunc {
  (
    args: Readonly<{
      x: number;
      y: number;
      width: number;
      height: number;
      originalX: number;
      originalY: number;
      vectorWidth: number;
      vectorHeight: number;
    }>
  ): Point;
}

export interface ConstrainResizeFunc {
  (
    args: Readonly<{
      originalMovingCorner: Point;
      startCorner: Point;
      movingCorner: Point;
      lockedDimension: 'x' | 'y' | null;
      vectorWidth: number;
      vectorHeight: number;
    }>
  ): Point;
}

export type WrappedShapeReceivedProps = {
  active: boolean;
  disabled: boolean;
  height: number;
  isBeingChanged: boolean;
  isInSelectionGroup: boolean;
  nativeActive: boolean;
  scale: number;
  shapeId: ShapeId;
  width: number;
  x: number;
  y: number;
};

type ResizeHandleComponent = any;

export type WrappedShapeProps = {
  active?: boolean | null;
  constrainMove?: ConstrainMoveFunc;
  constrainResize?: ConstrainResizeFunc;
  disabled?: boolean;
  height: number;
  isInSelectionGroup?: boolean;
  isInternalComponent?: boolean;
  keyboardTransformMultiplier?: number;
  onBlur?: (event: FocusEvent, props: WrappedShapePropsInActions) => void;
  onChange?: (nextRect: Rectangle, props: WrappedShapePropsInActions) => void;
  onDelete?: (event: KeyboardEvent, props: WrappedShapePropsInActions) => void;
  onFocus?: (event: FocusEvent, props: WrappedShapePropsInActions) => void;
  onKeyDown?: (event: KeyboardEvent, props: WrappedShapePropsInActions) => void;
  onIntermediateChange?: (intermediateRect: Rectangle) => void;
  ResizeHandleComponent?: ResizeHandleComponent;
  shapeId: string;
  width: number;
  wrapperProps?: object;
  x: number;
  y: number;
};

export type WrappedShapePropsInActions = Required<WrappedShapeProps>;

export interface ShapeActions {
  props: WrappedShapePropsInActions;
  forceFocus: () => void;
  simulateTransform: (nextRect: Rectangle) => void;
}
