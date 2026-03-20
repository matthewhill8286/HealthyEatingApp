/**
 * RxJS-powered reactive state for cross-component coordination.
 *
 * Provides Subjects that any component can subscribe to for real-time
 * updates without prop drilling or context re-renders.
 */
import { BehaviorSubject, Subject } from 'rxjs';
import { useEffect, useState } from 'react';

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

export const appEvents$ = new Subject<AppEvent>();

/** Emit an event to all subscribers */
export function emitEvent(event: AppEvent) {
  appEvents$.next(event);
}

// ---------------------------------------------------------------------------
// Reactive state — persistent values that emit on change
// ---------------------------------------------------------------------------

/** Whether the shopping list needs regenerating (stale) */
export const shoppingListStale$ = new BehaviorSubject<boolean>(false);

/** Number of active meal plan entries for today (for tab badge) */
export const todayMealCount$ = new BehaviorSubject<number>(0);

/** Recipe seed progress — null when not seeding */
export type SeedState = {
  seeding: boolean;
  mealType: string;
  completed: number;
  total: number;
} | null;
export const seedState$ = new BehaviorSubject<SeedState>(null);

// ---------------------------------------------------------------------------
// React hook — subscribe to any Observable in a component
// ---------------------------------------------------------------------------

/**
 * useObservable — subscribe to an RxJS Observable and return its latest value.
 *
 * Usage:
 *   const stale = useObservable(shoppingListStale$, false);
 *   const event = useObservable(appEvents$, null);
 */
export function useObservable<T>(observable: { subscribe: Function }, initialValue: T): T {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    const sub = observable.subscribe((v: T) => setValue(v));
    return () => sub.unsubscribe();
  }, [observable]);

  return value;
}

/**
 * useAppEvent — run a callback whenever a specific event type fires.
 *
 * Usage:
 *   useAppEvent('MEAL_PLAN_UPDATED', () => refetch());
 */
export function useAppEvent(eventType: AppEvent['type'], callback: (event: AppEvent) => void) {
  useEffect(() => {
    const sub = appEvents$.subscribe((event) => {
      if (event.type === eventType) {
        callback(event);
      }
    });
    return () => sub.unsubscribe();
  }, [eventType, callback]);
}
