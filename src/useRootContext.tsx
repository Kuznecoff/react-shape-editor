import React, { useContext } from 'react';
import { Point, MouseHandlerFunc } from './types';

interface CallbackContextProps {
  getPlaneCoordinatesFromEvent: (event: MouseEvent) => Point;
  onShapeMountedOrUnmounted: (
    instance: React.ComponentType,
    didMount: boolean
  ) => void;
  setMouseHandlerRef: (
    mouseHandlerRef: React.MutableRefObject<MouseHandlerFunc>
  ) => void;
}

export const CallbacksContext = React.createContext({} as CallbackContextProps);
export const VectorHeightContext = React.createContext(0);
export const VectorWidthContext = React.createContext(0);
export const ScaleContext = React.createContext(1);

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
