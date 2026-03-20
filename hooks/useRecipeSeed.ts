/**
 * useRecipeSeed — background service that seeds the user's recipe collection.
 *
 * Mount this ONCE at the app root. It fires off seed requests in the background,
 * publishing progress to the reactive `seedState$` BehaviorSubject so any screen
 * can observe without coupling or blocking.
 *
 * The Discover screen (or any other) reads `seedState$` to show a banner.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { seedState$, emitEvent } from '@/lib/reactive';
import { useAuth } from '@/providers/AuthProvider';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'afternoon_snack'] as const;
const BATCH_SIZE = 5;
const BATCHES_PER_TYPE = 3; // 3 × 5 = 15 per meal type
const MIN_RECIPES_THRESHOLD = 30;

export function useRecipeSeed() {
  const { user } = useAuth();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!user || hasStarted.current) return;
    hasStarted.current = true;

    // Check recipe count first — if already seeded, skip entirely
    (async () => {
      try {
        const { count } = await supabase
          .from('recipes')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', user.id);

        if ((count ?? 0) >= MIN_RECIPES_THRESHOLD) return;

        // Start seeding in the background
        const total = MEAL_TYPES.length * BATCHES_PER_TYPE;
        let completed = 0;

        seedState$.next({ seeding: true, mealType: '', completed: 0, total });

        for (const mealType of MEAL_TYPES) {
          const label = mealType.replace(/_/g, ' ');
          seedState$.next({ seeding: true, mealType: label, completed, total });

          // Fire all batches for this meal type in parallel
          const batchPromises = Array.from({ length: BATCHES_PER_TYPE }, () =>
            supabase.functions.invoke('seed-recipes', {
              body: { mealType, count: BATCH_SIZE },
            })
          );

          const results = await Promise.allSettled(batchPromises);

          for (const result of results) {
            completed++;
            seedState$.next({ seeding: true, mealType: label, completed, total });

            // Emit event so any listening screen can refetch
            emitEvent({ type: 'SEED_BATCH_COMPLETE', mealType: label, completed, total });

            if (result.status === 'rejected') {
              console.warn(`Seed batch failed for ${mealType}:`, result.reason);
            }
          }
        }

        // Done
        seedState$.next(null);
        emitEvent({ type: 'SEED_COMPLETE' });
      } catch (err) {
        console.warn('Recipe seed error:', err);
        seedState$.next(null);
      }
    })();
  }, [user]);
}
