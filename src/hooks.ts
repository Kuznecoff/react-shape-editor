import { useEffect, useRef, useReducer } from 'react';

export const useUpdatingRef = <T>(value: T): React.MutableRefObject<T> => {
  const ref = useRef(value);
  ref.current = value;
  return ref;
};

export const useIsMountedRef = (): React.MutableRefObject<boolean> => {
  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, [isMountedRef]);

  return isMountedRef;
};

export const useForceUpdate = (): React.Dispatch<undefined> => {
  const [ignored, forceUpdate] = useReducer(x => x + 1, 0);

  return forceUpdate;
};
