import React, { useRef, useContext } from 'react';
import { ShapeActions, ShapeId } from './types';
import { useUpdatingRef } from './hooks';

export enum EventType {
  MountedOrUnmounted = 'MountedOrUnmounted',
  MouseEvent = 'MouseEvent',
  ChildRectChanged = 'ChildRectChanged',
  ChildFocus = 'ChildFocus',
  ChildToggleSelection = 'ChildToggleSelection',
}

interface CustomListeners {
  [EventType.MountedOrUnmounted]: (
    shapeActionRef: React.MutableRefObject<ShapeActions>,
    didMount: boolean
  ) => void;
  [EventType.MouseEvent]: (event: MouseEvent) => void;
  [EventType.ChildRectChanged]: (
    shapeId: ShapeId,
    isInternalComponent: boolean
  ) => void;
  [EventType.ChildFocus]: (
    shapeId: ShapeId,
    isInternalComponent: boolean
  ) => void;
  [EventType.ChildToggleSelection]: (
    shapeId: ShapeId,
    isInternalComponent: boolean,
    event: React.MouseEvent
  ) => void;
}

type ListenerParams = {
  [key in keyof CustomListeners]: Parameters<CustomListeners[key]>;
};

type ListenerRefs = {
  [key in keyof CustomListeners]: React.MutableRefObject<CustomListeners[key]>;
};

type Listener = (...args: any[]) => void;

type ListenerRef = React.MutableRefObject<Listener>;

type ListenerObj = {
  [key in EventType]: Array<ListenerRefs[key]>;
};

class EventEmitter {
  private listeners: ListenerObj;

  constructor() {
    this.listeners = {} as ListenerObj;
  }

  addListener<T, K extends keyof ListenerRefs, V extends ListenerRefs>(
    eventType: K,
    fn: V[K]
  ): EventEmitter {
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

export const useAdditionalListener = <
  T,
  K extends keyof CustomListeners,
  V extends CustomListeners
>(
  emitter: EventEmitter,
  eventType: K,
  listener: V[K]
): void => {
  const listenerRef = useUpdatingRef(listener);

  emitter
    .removeListener(eventType, listenerRef)
    .addListener(eventType, listenerRef);
};

// useAdditionalListener(
//   new EventEmitter(),
//   EventType.ChildFocus,
//   (a: number) => {}
// );

const EventEmitterContext = React.createContext<EventEmitter | undefined>(
  undefined
);
export const EventEmitterProvider = EventEmitterContext.Provider;
export const useEventEmitterContext = (): EventEmitter => {
  const emitter = useContext(EventEmitterContext);
  if (emitter === undefined) {
    throw new Error(
      'useEventEmitterContext must be used within a EventEmitterProvider'
    );
  }

  return emitter;
};
