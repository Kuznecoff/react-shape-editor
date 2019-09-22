import React, { useContext } from 'react';
import {
  CallbacksContext,
  VectorHeightContext,
  VectorWidthContext,
  ScaleContext,
} from './ShapeEditor';

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
