/**
 * Zero-dependency reactive state for cross-component coordination.
 *
 * Replaces the previous RxJS implementation with plain pub/sub classes.
 * The public API is identical — all consumer files work without changes.
 */
import { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// SimpleSubject<T> — persistent value that emits on change (replaces BehaviorSubject)
// ---------------------------------------------------------------------------

type Listener<T> = (value: T) => void;

class SimpleSubject<T> {
  private _value: T;
  private _listeners: Set<Listener<T>> = new Set();

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  getValue(): T {
    return this._value;
  }

  next(value: T) {
    this._value = value;
    this._listeners.forEach((fn) => fn(value));
  }

  subscribe(listener: Listener<T>): { unsubscribe: () => void } {
    this._listeners.add(listener);
    // Emit current value immediately, matching BehaviorSubject behaviour
    listener(this._value);
    return {
      unsubscribe: () => {
        this._listeners.delete(listener);
      },
    };
  }
}

// ---------------------------------------------------------------------------
// EventBus<T> — fire-and-forget events (replaces Subject)
// ---------------------------------------------------------------------------

class EventBus<T> {
  private _listeners: Set<Listener<T>> = new Set();

  next(value: T) {
    this._listeners.forEach((fn) => fn(value));
  }

  subscribe(listener: Listener<T>): { unsubscribe: () => void } {
    this._listeners.add(listener);
    return {
      unsubscribe: () => {
        this._listeners.delete(listener);
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Event bus — fire-and-forget events across the app
// ---------------------------------------------------------------------------

export type AppEvent =
  | { type: 'MEAL_PLAN_UPDATED' }
  | { type: 'SHOPPING_LIST_UPDATED' }
  | { type: 'PROFILE_UPDATED' }
  | { type: 'RECIPE_ADDED_TO_PLAN'; recipeId: string | null; mealType: string }
  | { type: 'ENTRY_REMOVED'; entryId: string }
  | { type: 'SEED_BATCH_COMPLETE'; mealType: string; completed: number; total: number }
  | { type: 'SEED_COMPLETE' }
  | { type: 'RECIPE_IMPORTED' };

export const appEvents$ = new EventBus<AppEvent>();

/** Emit an event to all subscribers */
export function emitEvent(event: AppEvent) {
  appEvents$.next(event);
}

// ---------------------------------------------------------------------------
// Reactive state — persistent values that emit on change
// ---------------------------------------------------------------------------

/** Whether the shopping list needs regenerating (stale) */
export const shoppingListStale$ = new SimpleSubject<boolean>(false);

/** Number of active meal plan entries for today (for tab badge) */
export const todayMealCount$ = new SimpleSubject<number>(0);

/** Recipe seed progress — null when not seeding */
export type SeedState = {
  seeding: boolean;
  mealType: string;
  completed: number;
  total: number;
} | null;
export const seedState$ = new SimpleSubject<SeedState>(null);

// ---------------------------------------------------------------------------
// React hook — subscribe to any SimpleSubject in a component
// ---------------------------------------------------------------------------

/**
 * useObservable — subscribe to a SimpleSubject and return its latest value.
 *
 * Usage:
 *   const stale = useObservable(shoppingListStale$, false);
 *   const count = useObservable(todayMealCount$, 0);
 */
export function useObservable<T>(
  subject: { subscribe: (listener: Listener<T>) => { unsubscribe: () => void }; getValue?: () => T },
  initialValue: T,
): T {
  const [value, setValue] = useState<T>(() =>
    subject.getValue ? subject.getValue() : initialValue,
  );

  // Keep a stable ref so the effect never re-subscribes unnecessarily
  const subjectRef = useRef(subject);
  subjectRef.current = subject;

  useEffect(() => {
    const { unsubscribe } = subjectRef.current.subscribe(setValue);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}

/**
 * useAppEvent — run a callback whenever a specific event type fires.
 *
 * Usage:
 *   useAppEvent('MEAL_PLAN_UPDATED', () => refetch());
 */
export function useAppEvent(eventType: AppEvent['type'], callback: (event: AppEvent) => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const { unsubscribe } = appEvents$.subscribe((event) => {
      if (event.type === eventType) callbackRef.current(event);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType]);
}
