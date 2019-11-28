import { useEffect, useRef, useReducer } from 'react';

/**
 * Returns a ref that gets updated with the latest value on every render
 */
export const useUpdatingRef = <T>(value: T): React.MutableRefObject<T> => {
  const ref = useRef(value);
  ref.current = value;
  return ref;
};

/**
 * Returns a ref telling whether the calling component has been mounted or not.
 * Is false for the first render and unmount step.
 */
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

/**
 * Returns a function to force-update a component
 */
export const useForceUpdate = (): React.Dispatch<undefined> => {
  const [ignored, forceUpdate] = useReducer(x => x + 1, 0);

  return forceUpdate;
};

/**
 * Triggers a cancel callback when the Escape key is pressed with a mode active
 *
 * @param isActive The mode is active
 * @param cancel Callback to cancel out of the mode
 */
export const useCancelModeOnEscapeKey = (
  isActive: boolean,
  cancel: () => void
) => {
  useEffect(() => {
    if (!isActive) return;

    const doCancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      }
    };

    window.addEventListener('keydown', doCancel);
    return () => {
      window.removeEventListener('keydown', doCancel);
    };
  }, [isActive, cancel]);
};
