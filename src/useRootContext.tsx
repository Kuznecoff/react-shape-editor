import React, { useContext } from 'react';
import { Point, MouseHandlerFunc, ShapeActions } from './types';

interface CallbackContextProps {
  getPlaneCoordinatesFromEvent: (event: React.MouseEvent) => Point;
  onShapeMountedOrUnmounted: (
    shapeActionRef: React.MutableRefObject<ShapeActions>,
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
    event: React.MouseEvent
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
