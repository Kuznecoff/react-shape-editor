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

type Listener = (...args: any[]) => void;
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

type ListenerRef = React.MutableRefObject<Listener>;
type ChildRectChangedListenerRef = React.MutableRefObject<
  ChildRectChangedListener
>;
type ChildFocusListenerRef = React.MutableRefObject<ChildFocusListener>;
type MountedOrUnmountedListenerRef = React.MutableRefObject<
  MountedOrUnmountedListener
>;
type MouseEventListenerRef = React.MutableRefObject<MouseEventListener>;
type ChildToggleSelectionListenerRef = React.MutableRefObject<
  ChildToggleSelectionListener
>;

class EventEmitter {
  listeners = {};

  addListener(
    eventType: EventType.ChildRectChanged,
    fn: ChildRectChangedListenerRef
  ): EventEmitter;
  addListener(
    eventType: EventType.ChildFocus,
    fn: ChildFocusListenerRef
  ): EventEmitter;
  addListener(
    eventType: EventType.MountedOrUnmounted,
    fn: MountedOrUnmountedListenerRef
  ): EventEmitter;
  addListener(
    eventType: EventType.MouseEvent,
    fn: MouseEventListenerRef
  ): EventEmitter;
  addListener(
    eventType: EventType.ChildToggleSelection,
    fn: ChildToggleSelectionListenerRef
  ): EventEmitter;
  addListener(eventType: EventType, fn: ListenerRef): EventEmitter {
    this.listeners[eventType] = this.listeners[eventType] || [];
    this.listeners[eventType].push(fn);
    return this;
  }

  removeListener(eventType: EventType, fn: ListenerRef) {
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

  emit(
    eventType: EventType.ChildRectChanged,
    ...args: Parameters<ChildRectChangedListener>
  ): void;
  emit(
    eventType: EventType.ChildFocus,
    ...args: Parameters<ChildFocusListener>
  ): void;
  emit(
    eventType: EventType.MountedOrUnmounted,
    ...args: Parameters<MountedOrUnmountedListener>
  ): void;
  emit(
    eventType: EventType.MouseEvent,
    ...args: Parameters<MouseEventListener>
  ): void;
  emit(
    eventType: EventType.ChildToggleSelection,
    ...args: Parameters<ChildToggleSelectionListener>
  ): void;
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

export const useNewEmitter = () => {
  const emitterRef = useRef(new EventEmitter());

  return emitterRef.current;
};

function useNewListener(
  emitter: EventEmitter,
  eventType: EventType.ChildRectChanged,
  listener: ChildRectChangedListener
): void;
function useNewListener(
  emitter: EventEmitter,
  eventType: EventType.ChildFocus,
  listener: ChildFocusListener
): void;
function useNewListener(
  emitter: EventEmitter,
  eventType: EventType.MountedOrUnmounted,
  listener: MountedOrUnmountedListener
): void;
function useNewListener(
  emitter: EventEmitter,
  eventType: EventType.MouseEvent,
  listener: MouseEventListener
): void;
function useNewListener(
  emitter: EventEmitter,
  eventType: EventType.ChildToggleSelection,
  listener: ChildToggleSelectionListener
): void;

function useNewListener(
  emitter: EventEmitter,
  eventType: EventType,
  listener: Listener
): void {
  const listenerRef = useUpdatingRef(listener);
  useEffect(() => {
    emitter.addListener(eventType, listenerRef);

    return () => {
      emitter.removeListener(eventType, listenerRef);
    };
  }, []);
}

export { useNewListener };
