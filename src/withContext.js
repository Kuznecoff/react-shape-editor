import React, { useContext } from 'react';
import {
  CallbacksContext,
  VectorHeightContext,
  VectorWidthContext,
  ScaleContext,
} from './ShapeEditor';

function withContext(Component) {
  function ComponentWithRseContext(props, ref) {
    const callbacks = useContext(CallbacksContext);
    const vectorHeight = useContext(VectorHeightContext);
    const vectorWidth = useContext(VectorWidthContext);
    const scale = useContext(ScaleContext);
    return (
      <Component
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...callbacks}
        callbacks={callbacks}
        vectorHeight={vectorHeight}
        vectorWidth={vectorWidth}
        ref={ref}
        scale={scale}
      />
    );
  }

  ComponentWithRseContext.displayName =
    Component.displayName || Component.name || 'Component';

  return React.forwardRef(ComponentWithRseContext);
}

export default withContext;
