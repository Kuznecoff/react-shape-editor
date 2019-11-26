import { useRef, useEffect } from 'react';
import { ShapeActions, ShapeId, MouseHandlerFunc } from './types';
import { useUpdatingRef } from './hooks';

export enum EventType {
  MountedOrUnmounted = 'MountedOrUnmounted',
  MouseEvent = 'MouseEvent',
  ChildRectChanged = 'ChildRectChanged',
  ChildFocus = 'ChildFocus',
  ChildToggleSelection = 'ChildToggleSelection',
}

type ChildRectChangedListener = (
  shapeId: ShapeId,
  isInternalComponent: boolean
) => void;
type ChildFocusListener = (
  shapeId: ShapeId,
  isInternalComponent: boolean
) => void;
type MountedOrUnmountedListener = (
  shapeActionRef: React.MutableRefObject<ShapeActions>,
  didMount: boolean
) => void;
type MouseEventListener = (
  mouseHandlerRef: React.MutableRefObject<MouseHandlerFunc>
) => void;
type ChildToggleSelectionListener = (
  shapeId: ShapeId,
  isInternalComponent: boolean,
  event: React.MouseEvent
) => void;

type Listener = (...args: any[]) => void;
type CustomListener =
  | ChildRectChangedListener
  | ChildFocusListener
  | MountedOrUnmountedListener
  | MouseEventListener
  | ChildToggleSelectionListener;

type ListenerRef = React.MutableRefObject<Listener>;

class EventEmitter {
  listeners = {};

  addListener(eventType: EventType, fn: ListenerRef): EventEmitter {
    this.listeners[eventType] = this.listeners[eventType] || [];
    this.listeners[eventType].push(fn);

    return this;
  }

  removeListener(eventType: EventType, fn: ListenerRef): EventEmitter {
    let matchingListeners = this.listeners[eventType];
    if (!matchingListeners) {
      return this;
    }

    for (let i = matchingListeners.length; i > 0; i--) {
      if (matchingListeners[i] === fn) {
        matchingListeners.splice(i, 1);
        break;
      }
    }

    return this;
  }

  overwriteAllListenersOfType(
    eventType: EventType,
    fn: ListenerRef
  ): EventEmitter {
    delete this.listeners[eventType];

    return this.addListener(eventType, fn);
  }

  emit(eventType: EventType, ...args: any[]): void {
    let matchingListeners = this.listeners[eventType];
    if (!matchingListeners) {
      return;
    }

    matchingListeners.forEach((f: ListenerRef) => {
      f.current(...args);
    });
  }
}

export const useNewEventEmitter = (): EventEmitter => {
  const emitterRef = useRef(new EventEmitter());

  return emitterRef.current;
};

export const useAdditionalListener = (
  emitter: EventEmitter,
  eventType: EventType,
  listener: CustomListener
): void => {
  const listenerRef = useUpdatingRef(listener);

  useEffect(() => {
    emitter.addListener(eventType, listenerRef);

    return () => {
      emitter.removeListener(eventType, listenerRef);
    };
  }, []);
};
