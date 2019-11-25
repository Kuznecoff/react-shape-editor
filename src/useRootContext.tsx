import React, { useContext } from 'react';
import { Point, MouseHandlerFunc, Rectangle } from './types';

interface ShapeActions {
  props: object;
  forceFocus: () => void;
  simulateTransform: (nextRect: Rectangle) => void;
}

interface CallbackContextProps {
  getPlaneCoordinatesFromEvent: (event: MouseEvent) => Point;
  onShapeMountedOrUnmounted: (
    shapeActionRef: React.MutableRefObject<MouseHandlerFunc>,
    didMount: boolean
  ) => void;
  setMouseHandlerRef: (
    mouseHandlerRef: React.MutableRefObject<MouseHandlerFunc>
  ) => void;
  onChildRectChanged: (shapeId: boolean, isInternalComponent: boolean) => void;
  onChildFocus: (shapeId: boolean, isInternalComponent: boolean) => void;
  onChildToggleSelection: (
    shapeId: boolean,
    isInternalComponent: boolean,
    event: MouseEvent
  ) => void;
}

const CallbacksContext = React.createContext({} as CallbackContextProps);
const VectorHeightContext = React.createContext(0);
const VectorWidthContext = React.createContext(0);
const ScaleContext = React.createContext(1);

export const CallbacksProvider = CallbacksContext.Provider;
export const VectorHeightProvider = VectorHeightContext.Provider;
export const VectorWidthProvider = VectorWidthContext.Provider;
export const ScaleProvider = ScaleContext.Provider;

const useRootContext = () => ({
  callbacks: useContext(CallbacksContext),
  vectorHeight: useContext(VectorHeightContext),
  vectorWidth: useContext(VectorWidthContext),
  scale: useContext(ScaleContext),
});

export default useRootContext;

export const deprecatedWrappingStyle = (
  Component: React.ComponentType
): React.FunctionComponent => props => {
  const extraContext = useRootContext();
  return <Component {...props} {...extraContext} {...extraContext.callbacks} />;
};
