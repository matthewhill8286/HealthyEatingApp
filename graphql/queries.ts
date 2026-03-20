/**
 * GraphQL queries for Supabase pg_graphql using Apollo gql tags.
 */
import { gql } from '@apollo/client';

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export const GET_PROFILE = gql`
  query GetProfile($userId: UUID!) {
    profilesCollection(filter: { id: { eq: $userId } }, first: 1) {
      edges {
        node {
          id
          display_name
          sex
          date_of_birth
          dietary_preference
          goal
          daily_calorie_target
          daily_protein_g
          daily_carbs_g
          daily_fat_g
          daily_fibre_g
          allergies
          disliked_ingredients
          weight_kg
          height_cm
          activity_level
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Taste Profile
// ---------------------------------------------------------------------------

export const GET_TASTE_PROFILE = gql`
  query GetTasteProfile($userId: UUID!) {
    user_taste_profileCollection(filter: { user_id: { eq: $userId } }, first: 1) {
      edges {
        node {
          id
          preferred_cuisines
          avoided_ingredients
          spice_tolerance
          cooking_skill
          max_prep_time_min
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export const GET_RECIPES = gql`
  query GetRecipes($first: Int) {
    recipesCollection(first: $first, orderBy: [{ created_at: DescNullsLast }]) {
      edges {
        node {
          id
          title
          description
          cuisine
          difficulty
          prep_time_min
          cook_time_min
          total_time_min
          servings
          calories_per_serving
          protein_per_serving
          fat_per_serving
          carbs_per_serving
          fibre_per_serving
          meal_types
          diet_types
          image_url
          is_ai_generated
          is_public
          rating
        }
      }
    }
  }
`;

export const GET_RECIPE_DETAIL = gql`
  query GetRecipeDetail($recipeId: UUID!) {
    recipesCollection(filter: { id: { eq: $recipeId } }, first: 1) {
      edges {
        node {
          id
          title
          description
          cuisine
          difficulty
          prep_time_min
          cook_time_min
          total_time_min
          servings
          calories_per_serving
          protein_per_serving
          fat_per_serving
          carbs_per_serving
          fibre_per_serving
          sugar_per_serving
          sodium_per_serving
          meal_types
          diet_types
          image_url
          is_ai_generated
          is_public
          rating
          instructions
          notes
          source_url
          recipe_ingredientsCollection(orderBy: [{ display_order: AscNullsLast }]) {
            edges {
              node {
                id
                quantity
                unit
                is_optional
                preparation_note
                display_order
                ingredients {
                  id
                  name
                  category
                  calories
                  protein_g
                  total_fat_g
                  total_carbs_g
                  dietary_fibre_g
                }
              }
            }
          }
          recipe_tagsCollection {
            edges {
              node {
                tags {
                  id
                  name
                  category
                }
              }
            }
          }
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Meal Plans
// ---------------------------------------------------------------------------

export const GET_ACTIVE_MEAL_PLAN = gql`
  query GetActiveMealPlan($userId: UUID!) {
    meal_plansCollection(
      filter: { user_id: { eq: $userId }, is_active: { eq: true } }
      orderBy: [{ start_date: DescNullsLast }]
      first: 1
    ) {
      edges {
        node {
          id
          name
          start_date
          end_date
          is_active
        }
      }
    }
  }
`;

export const GET_MEAL_PLAN_ENTRIES = gql`
  query GetMealPlanEntries($planId: UUID!) {
    meal_plan_entriesCollection(
      filter: { meal_plan_id: { eq: $planId } }
      orderBy: [{ plan_date: AscNullsLast }, { meal_type: AscNullsLast }]
    ) {
      edges {
        node {
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
          is_completed
          recipes {
            id
            title
            image_url
            calories_per_serving
            protein_per_serving
            fat_per_serving
            carbs_per_serving
            fibre_per_serving
            prep_time_min
            cook_time_min
          }
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Shopping Lists
// ---------------------------------------------------------------------------

export const GET_SHOPPING_LIST = gql`
  query GetShoppingList($userId: UUID!) {
    shopping_listsCollection(
      filter: { user_id: { eq: $userId } }
      orderBy: [{ created_at: DescNullsLast }]
      first: 1
    ) {
      edges {
        node {
          id
          name
          created_at
          shopping_list_itemsCollection {
            edges {
              node {
                id
                ingredient_id
                custom_item_name
                quantity
                unit
                status
                aisle
                notes
                ingredients {
                  id
                  name
                  category
                }
              }
            }
          }
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Helpers for shopping list generation
// ---------------------------------------------------------------------------

export const GET_RECIPE_INGREDIENTS_FOR_PLAN = gql`
  query GetRecipeIngredientsForPlan($recipeIds: [UUID!]!) {
    recipe_ingredientsCollection(filter: { recipe_id: { in: $recipeIds } }) {
      edges {
        node {
          id
          recipe_id
          ingredient_id
          quantity
          unit
          is_optional
        }
      }
    }
  }
`;

/**
 * Fetch ingredient names per recipe — used for allergen/dislike filtering.
 * Returns a lightweight map of recipe_id → ingredient names.
 */
export const GET_RECIPE_INGREDIENT_NAMES = gql`
  query GetRecipeIngredientNames {
    recipe_ingredientsCollection {
      edges {
        node {
          id
          recipe_id
          ingredients {
            id
            name
          }
        }
      }
    }
  }
`;

export const GET_RECIPES_BASE_SERVINGS = gql`
  query GetRecipesBaseServings($recipeIds: [UUID!]!) {
    recipesCollection(filter: { id: { in: $recipeIds } }) {
      edges {
        node {
          id
          servings
        }
      }
    }
  }
`;
