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

type ResizeComponentHandleProps = {
  active: boolean;
  nativeActive: boolean;
  cursor: ResizeCursor;
  isBeingChanged: boolean;
  isInSelectionGroup: boolean;
  name: HandleName;
  onMouseDown: (event: React.MouseEvent) => void;
  recommendedSize: number;
  scale: number;
  x: number;
  y: number;
};
export type ResizeHandleComponentType = React.ComponentType<
  ResizeComponentHandleProps
>;

export type WrappedShapeProps = {
  active?: boolean;
  constrainMove?: ConstrainMoveFunc;
  constrainResize?: ConstrainResizeFunc;
  disabled?: boolean;
  height: number;
  isInSelectionGroup?: boolean;
  isInternalComponent?: boolean;
  keyboardTransformMultiplier?: number;
  onBlur?: (event: React.FocusEvent, props: WrappedShapePropsInActions) => void;
  onChange?: (nextRect: Rectangle, props: WrappedShapePropsInActions) => void;
  onDelete?: (
    event: React.KeyboardEvent,
    props: WrappedShapePropsInActions
  ) => void;
  onFocus?: (
    event: React.FocusEvent,
    props: WrappedShapePropsInActions
  ) => void;
  onKeyDown?: (
    event: React.KeyboardEvent,
    props: WrappedShapePropsInActions
  ) => void;
  onIntermediateChange?: (intermediateRect: Rectangle) => void;
  ResizeHandleComponent?: ResizeHandleComponentType;
  shapeId: ShapeId;
  width: number;
  wrapperProps?: object;
  x: number;
  y: number;
};

export type WrappedShapePropsInActions = Required<
  Omit<
    WrappedShapeProps,
    | 'constrainMove'
    | 'constrainResize'
    | 'isInternalComponent'
    | 'keyboardTransformMultiplier'
    | 'onBlur'
    | 'onChange'
    | 'onDelete'
    | 'onFocus'
    | 'onIntermediateChange'
    | 'onKeyDown'
    | 'ResizeHandleComponent'
    | 'wrapperProps'
  >
> & { [k: string]: any }; // Allow for passing of any extra props

export type GetSelectionChildUpdatedRect = (
  selectionStartRect: Rectangle,
  selectionEndRect: Rectangle
) => Rectangle;

export interface ShapeActions {
  props: WrappedShapePropsInActions;
  forceFocus: () => void;
  getSelectionChildUpdatedRect: GetSelectionChildUpdatedRect;
  simulateTransform: (nextRect: Rectangle) => void;
}

export type HandleName = 'w' | 'n' | 's' | 'e' | 'nw' | 'ne' | 'sw' | 'se';

export type ResizeCursor =
  | 'ns-resize'
  | 'ew-resize'
  | 'nesw-resize'
  | 'nwse-resize';
