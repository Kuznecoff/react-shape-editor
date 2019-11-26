import React, { useContext } from 'react';
import { Point } from './types';
import { useEventEmitterContext } from './EventEmitter';

type CoordinateGetterType = React.MutableRefObject<
  (event: React.MouseEvent | MouseEvent) => Point
>;

const CoordinateGetterRefContext = React.createContext<
  CoordinateGetterType | undefined
>(undefined);

const VectorHeightContext = React.createContext<number | undefined>(undefined);
const VectorWidthContext = React.createContext<number | undefined>(undefined);
const ScaleContext = React.createContext<number | undefined>(undefined);

export const CoordinateGetterRefProvider = CoordinateGetterRefContext.Provider;
export const VectorHeightProvider = VectorHeightContext.Provider;
export const VectorWidthProvider = VectorWidthContext.Provider;
export const ScaleProvider = ScaleContext.Provider;
export { EventEmitterProvider } from './EventEmitter';

const useRootContext = () => {
  const coordinateGetterRef = useContext(CoordinateGetterRefContext);
  if (coordinateGetterRef === undefined) {
    throw new Error(
      'useRootContext must be used within a CoordinateGetterRefProvider'
    );
  }

  const vectorHeight = useContext(VectorHeightContext);
  if (vectorHeight === undefined) {
    throw new Error(
      'useRootContext must be used within a VectorHeightProvider'
    );
  }

  const vectorWidth = useContext(VectorWidthContext);
  if (vectorWidth === undefined) {
    throw new Error('useRootContext must be used within a VectorWidthProvider');
  }

  const scale = useContext(ScaleContext);
  if (scale === undefined) {
    throw new Error('useRootContext must be used within a ScaleProvider');
  }

  return {
    eventEmitter: useEventEmitterContext(),
    coordinateGetterRef,
    vectorHeight,
    vectorWidth,
    scale,
  };
};

export default useRootContext;
