import React, { useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Point } from './types';
import { useEventEmitterContext } from './EventEmitter';
import { useIsMountedRef } from './hooks';

type CoordinateGetterType = React.MutableRefObject<
  (event: React.MouseEvent | MouseEvent) => Point
>;

const CoordinateGetterRefContext = React.createContext<
  CoordinateGetterType | undefined
>(undefined);

type DimensionsType = Readonly<{
  vectorWidth: number;
  vectorHeight: number;
  vectorPaddingTop: number;
  vectorPaddingRight: number;
  vectorPaddingBottom: number;
  vectorPaddingLeft: number;
  scale: number;
}>;

const DimensionsContext = React.createContext<DimensionsType | undefined>(
  undefined
);

interface Props {
  value: DimensionsType;
  children: any;
}
const dimensionsProviderPropTypes = {
  value: PropTypes.shape({
    vectorWidth: PropTypes.number.isRequired,
    vectorHeight: PropTypes.number.isRequired,
    vectorPaddingTop: PropTypes.number.isRequired,
    vectorPaddingRight: PropTypes.number.isRequired,
    vectorPaddingBottom: PropTypes.number.isRequired,
    vectorPaddingLeft: PropTypes.number.isRequired,
    scale: PropTypes.number.isRequired,
  }).isRequired,
  children: PropTypes.node.isRequired,
};
export const DimensionsProvider: React.FunctionComponent<Props> = ({
  children,
  value: propDims,
}) => {
  // Essentially memoizing the dimensions so passing an object doesn't
  // trigger re-renders on every render of the parent
  // See: https://reactjs.org/docs/context.html#caveats
  const [dimensions, setDimensions] = useState(propDims);
  const isMountedRef = useIsMountedRef();
  useEffect(() => {
    // Skip the mount/unmount step because the state
    // has already been initialized with the propDims
    if (!isMountedRef.current) {
      return;
    }

    setDimensions(propDims);
  }, [
    propDims.scale,
    propDims.vectorWidth,
    propDims.vectorHeight,
    propDims.vectorPaddingTop,
    propDims.vectorPaddingRight,
    propDims.vectorPaddingBottom,
    propDims.vectorPaddingLeft,
  ]);

  return (
    <DimensionsContext.Provider value={dimensions}>
      {children}
    </DimensionsContext.Provider>
  );
};
DimensionsProvider.propTypes = dimensionsProviderPropTypes;
export const CoordinateGetterRefProvider = CoordinateGetterRefContext.Provider;

export { EventEmitterProvider } from './EventEmitter';

/**
 * Access the root context values
 */
const useRootContext = () => {
  const coordinateGetterRef = useContext(CoordinateGetterRefContext);
  if (coordinateGetterRef === undefined) {
    throw new Error(
      'useRootContext must be used within a CoordinateGetterRefProvider'
    );
  }

  const dimensions = useContext(DimensionsContext);
  if (dimensions === undefined) {
    throw new Error('useRootContext must be used within a DimensionsProvider');
  }

  return {
    eventEmitter: useEventEmitterContext(),
    coordinateGetterRef,
    dimensions,
  };
};

export default useRootContext;
