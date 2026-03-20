/**
 * GraphQL mutations for Supabase pg_graphql using Apollo gql tags.
 */
import { gql } from '@apollo/client';

// ---------------------------------------------------------------------------
// Meal Plan Entries
// ---------------------------------------------------------------------------

export const INSERT_MEAL_PLAN_ENTRY = gql`
  mutation InsertMealPlanEntry(
    $mealPlanId: UUID!
    $recipeId: UUID
    $mealType: meal_type!
    $planDate: Date!
    $servings: BigFloat
    $calories: BigFloat
    $proteinG: BigFloat
    $fatG: BigFloat
    $carbsG: BigFloat
    $fibreG: BigFloat
    $notes: String
  ) {
    insertIntomeal_plan_entriesCollection(
      objects: [
        {
          meal_plan_id: $mealPlanId
          recipe_id: $recipeId
          meal_type: $mealType
          plan_date: $planDate
          servings: $servings
          calories: $calories
          protein_g: $proteinG
          fat_g: $fatG
          carbs_g: $carbsG
          fibre_g: $fibreG
          notes: $notes
        }
      ]
    ) {
      records {
        id
        meal_type
        plan_date
        servings
        calories
        protein_g
        fat_g
        carbs_g
        fibre_g
        notes
      }
    }
  }
`;

export const DELETE_MEAL_PLAN_ENTRY = gql`
  mutation DeleteMealPlanEntry($entryId: UUID!) {
    deleteFrommeal_plan_entriesCollection(
      filter: { id: { eq: $entryId } }
      atMost: 1
    ) {
      records {
        id
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Meal Plans
// ---------------------------------------------------------------------------

export const INSERT_MEAL_PLAN = gql`
  mutation InsertMealPlan(
    $userId: UUID!
    $name: String!
    $startDate: Date!
    $endDate: Date!
    $isActive: Boolean
  ) {
    insertIntomeal_plansCollection(
      objects: [
        {
          user_id: $userId
          name: $name
          start_date: $startDate
          end_date: $endDate
          is_active: $isActive
        }
      ]
    ) {
      records {
        id
        name
        start_date
        end_date
        is_active
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Shopping Lists
// ---------------------------------------------------------------------------
// Shopping list generation is now handled by the server-side RPC function
// `generate_shopping_list`. Item toggling uses Supabase client directly.
// This avoids pg_graphql issues (BigFloat, atMost limits, cache errors).
// The GET_SHOPPING_LIST query in queries.ts is still used for reading.
