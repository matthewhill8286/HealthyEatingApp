export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_suggestions: {
        Row: {
          created_at: string | null
          estimated_calories: number | null
          estimated_carbs_g: number | null
          estimated_fat_g: number | null
          estimated_fibre_g: number | null
          estimated_protein_g: number | null
          for_date: string | null
          id: string
          meal_type: Database["public"]["Enums"]["meal_type"] | null
          model_version: string | null
          prompt_context: Json | null
          recipe_id: string | null
          status: Database["public"]["Enums"]["suggestion_status"] | null
          suggested_description: string | null
          suggested_recipe_data: Json | null
          suggested_title: string
          suggestion_reason: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          estimated_calories?: number | null
          estimated_carbs_g?: number | null
          estimated_fat_g?: number | null
          estimated_fibre_g?: number | null
          estimated_protein_g?: number | null
          for_date?: string | null
          id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"] | null
          model_version?: string | null
          prompt_context?: Json | null
          recipe_id?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"] | null
          suggested_description?: string | null
          suggested_recipe_data?: Json | null
          suggested_title: string
          suggestion_reason?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          estimated_calories?: number | null
          estimated_carbs_g?: number | null
          estimated_fat_g?: number | null
          estimated_fibre_g?: number | null
          estimated_protein_g?: number | null
          for_date?: string | null
          id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"] | null
          model_version?: string | null
          prompt_context?: Json | null
          recipe_id?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"] | null
          suggested_description?: string | null
          suggested_recipe_data?: Json | null
          suggested_title?: string
          suggestion_reason?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      cooking_log: {
        Row: {
          actual_cook_time_min: number | null
          actual_prep_time_min: number | null
          cooked_at: string | null
          id: string
          modifications: string | null
          notes: string | null
          photo_url: string | null
          rating: number | null
          recipe_id: string
          servings_made: number | null
          user_id: string
        }
        Insert: {
          actual_cook_time_min?: number | null
          actual_prep_time_min?: number | null
          cooked_at?: string | null
          id?: string
          modifications?: string | null
          notes?: string | null
          photo_url?: string | null
          rating?: number | null
          recipe_id: string
          servings_made?: number | null
          user_id: string
        }
        Update: {
          actual_cook_time_min?: number | null
          actual_prep_time_min?: number | null
          cooked_at?: string | null
          id?: string
          modifications?: string | null
          notes?: string | null
          photo_url?: string | null
          rating?: number | null
          recipe_id?: string
          servings_made?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooking_log_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      favourite_recipes: {
        Row: {
          created_at: string | null
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favourite_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          added_sugars_g: number | null
          calcium_mg: number | null
          calories: number | null
          category: string | null
          cholesterol_mg: number | null
          copper_mg: number | null
          created_at: string | null
          created_by: string | null
          default_unit: Database["public"]["Enums"]["unit_type"] | null
          description: string | null
          dietary_fibre_g: number | null
          glycemic_index: number | null
          id: string
          image_url: string | null
          insoluble_fibre_g: number | null
          iron_mg: number | null
          is_common: boolean | null
          magnesium_mg: number | null
          manganese_mg: number | null
          monounsaturated_fat_g: number | null
          name: string
          name_normalized: string | null
          omega3_mg: number | null
          omega6_mg: number | null
          phosphorus_mg: number | null
          polyunsaturated_fat_g: number | null
          potassium_mg: number | null
          protein_g: number | null
          saturated_fat_g: number | null
          selenium_mcg: number | null
          sodium_mg: number | null
          soluble_fibre_g: number | null
          sugars_g: number | null
          total_carbs_g: number | null
          total_fat_g: number | null
          trans_fat_g: number | null
          updated_at: string | null
          vitamin_a_mcg: number | null
          vitamin_b1_mg: number | null
          vitamin_b12_mcg: number | null
          vitamin_b2_mg: number | null
          vitamin_b3_mg: number | null
          vitamin_b5_mg: number | null
          vitamin_b6_mg: number | null
          vitamin_b9_mcg: number | null
          vitamin_c_mg: number | null
          vitamin_d_mcg: number | null
          vitamin_e_mg: number | null
          vitamin_k_mcg: number | null
          zinc_mg: number | null
        }
        Insert: {
          added_sugars_g?: number | null
          calcium_mg?: number | null
          calories?: number | null
          category?: string | null
          cholesterol_mg?: number | null
          copper_mg?: number | null
          created_at?: string | null
          created_by?: string | null
          default_unit?: Database["public"]["Enums"]["unit_type"] | null
          description?: string | null
          dietary_fibre_g?: number | null
          glycemic_index?: number | null
          id?: string
          image_url?: string | null
          insoluble_fibre_g?: number | null
          iron_mg?: number | null
          is_common?: boolean | null
          magnesium_mg?: number | null
          manganese_mg?: number | null
          monounsaturated_fat_g?: number | null
          name: string
          name_normalized?: string | null
          omega3_mg?: number | null
          omega6_mg?: number | null
          phosphorus_mg?: number | null
          polyunsaturated_fat_g?: number | null
          potassium_mg?: number | null
          protein_g?: number | null
          saturated_fat_g?: number | null
          selenium_mcg?: number | null
          sodium_mg?: number | null
          soluble_fibre_g?: number | null
          sugars_g?: number | null
          total_carbs_g?: number | null
          total_fat_g?: number | null
          trans_fat_g?: number | null
          updated_at?: string | null
          vitamin_a_mcg?: number | null
          vitamin_b1_mg?: number | null
          vitamin_b12_mcg?: number | null
          vitamin_b2_mg?: number | null
          vitamin_b3_mg?: number | null
          vitamin_b5_mg?: number | null
          vitamin_b6_mg?: number | null
          vitamin_b9_mcg?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_mcg?: number | null
          vitamin_e_mg?: number | null
          vitamin_k_mcg?: number | null
          zinc_mg?: number | null
        }
        Update: {
          added_sugars_g?: number | null
          calcium_mg?: number | null
          calories?: number | null
          category?: string | null
          cholesterol_mg?: number | null
          copper_mg?: number | null
          created_at?: string | null
          created_by?: string | null
          default_unit?: Database["public"]["Enums"]["unit_type"] | null
          description?: string | null
          dietary_fibre_g?: number | null
          glycemic_index?: number | null
          id?: string
          image_url?: string | null
          insoluble_fibre_g?: number | null
          iron_mg?: number | null
          is_common?: boolean | null
          magnesium_mg?: number | null
          manganese_mg?: number | null
          monounsaturated_fat_g?: number | null
          name?: string
          name_normalized?: string | null
          omega3_mg?: number | null
          omega6_mg?: number | null
          phosphorus_mg?: number | null
          polyunsaturated_fat_g?: number | null
          potassium_mg?: number | null
          protein_g?: number | null
          saturated_fat_g?: number | null
          selenium_mcg?: number | null
          sodium_mg?: number | null
          soluble_fibre_g?: number | null
          sugars_g?: number | null
          total_carbs_g?: number | null
          total_fat_g?: number | null
          trans_fat_g?: number | null
          updated_at?: string | null
          vitamin_a_mcg?: number | null
          vitamin_b1_mg?: number | null
          vitamin_b12_mcg?: number | null
          vitamin_b2_mg?: number | null
          vitamin_b3_mg?: number | null
          vitamin_b5_mg?: number | null
          vitamin_b6_mg?: number | null
          vitamin_b9_mcg?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_mcg?: number | null
          vitamin_e_mg?: number | null
          vitamin_k_mcg?: number | null
          zinc_mg?: number | null
        }
        Relationships: []
      }
      meal_plan_entries: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string | null
          day_of_week: number | null
          fat_g: number | null
          fibre_g: number | null
          id: string
          is_completed: boolean | null
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes: string | null
          plan_date: string | null
          protein_g: number | null
          recipe_id: string | null
          servings: number | null
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          day_of_week?: number | null
          fat_g?: number | null
          fibre_g?: number | null
          id?: string
          is_completed?: boolean | null
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes?: string | null
          plan_date?: string | null
          protein_g?: number | null
          recipe_id?: string | null
          servings?: number | null
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          day_of_week?: number | null
          fat_g?: number | null
          fibre_g?: number | null
          id?: string
          is_completed?: boolean | null
          meal_plan_id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          notes?: string | null
          plan_date?: string | null
          protein_g?: number | null
          recipe_id?: string | null
          servings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_entries_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_entries_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          start_date: string
          target_calories: number | null
          target_carbs_g: number | null
          target_fat_g: number | null
          target_fibre_g: number | null
          target_protein_g: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_fibre_g?: number | null
          target_protein_g?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_fibre_g?: number | null
          target_protein_g?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      prep_session_recipes: {
        Row: {
          best_before: string | null
          display_order: number | null
          id: string
          prep_session_id: string
          recipe_id: string
          servings_to_prep: number | null
          status: Database["public"]["Enums"]["prep_status"] | null
          storage_instructions: string | null
        }
        Insert: {
          best_before?: string | null
          display_order?: number | null
          id?: string
          prep_session_id: string
          recipe_id: string
          servings_to_prep?: number | null
          status?: Database["public"]["Enums"]["prep_status"] | null
          storage_instructions?: string | null
        }
        Update: {
          best_before?: string | null
          display_order?: number | null
          id?: string
          prep_session_id?: string
          recipe_id?: string
          servings_to_prep?: number | null
          status?: Database["public"]["Enums"]["prep_status"] | null
          storage_instructions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prep_session_recipes_prep_session_id_fkey"
            columns: ["prep_session_id"]
            isOneToOne: false
            referencedRelation: "prep_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prep_session_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      prep_sessions: {
        Row: {
          created_at: string | null
          estimated_duration_min: number | null
          id: string
          meal_plan_id: string | null
          name: string
          notes: string | null
          scheduled_date: string
          scheduled_time: string | null
          status: Database["public"]["Enums"]["prep_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          estimated_duration_min?: number | null
          id?: string
          meal_plan_id?: string | null
          name: string
          notes?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["prep_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          estimated_duration_min?: number | null
          id?: string
          meal_plan_id?: string | null
          name?: string
          notes?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["prep_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prep_sessions_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_level: string | null
          allergies: string[] | null
          avatar_url: string | null
          created_at: string | null
          daily_calorie_target: number | null
          daily_carbs_g: number | null
          daily_fat_g: number | null
          daily_fibre_g: number | null
          daily_protein_g: number | null
          date_of_birth: string | null
          dietary_preference: Database["public"]["Enums"]["diet_type"] | null
          disliked_ingredients: string[] | null
          display_name: string | null
          goal: Database["public"]["Enums"]["goal_type"] | null
          height_cm: number | null
          id: string
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          allergies?: string[] | null
          avatar_url?: string | null
          created_at?: string | null
          daily_calorie_target?: number | null
          daily_carbs_g?: number | null
          daily_fat_g?: number | null
          daily_fibre_g?: number | null
          daily_protein_g?: number | null
          date_of_birth?: string | null
          dietary_preference?: Database["public"]["Enums"]["diet_type"] | null
          disliked_ingredients?: string[] | null
          display_name?: string | null
          goal?: Database["public"]["Enums"]["goal_type"] | null
          height_cm?: number | null
          id: string
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          allergies?: string[] | null
          avatar_url?: string | null
          created_at?: string | null
          daily_calorie_target?: number | null
          daily_carbs_g?: number | null
          daily_fat_g?: number | null
          daily_fibre_g?: number | null
          daily_protein_g?: number | null
          date_of_birth?: string | null
          dietary_preference?: Database["public"]["Enums"]["diet_type"] | null
          disliked_ingredients?: string[] | null
          display_name?: string | null
          goal?: Database["public"]["Enums"]["goal_type"] | null
          height_cm?: number | null
          id?: string
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          ingredient_id: string
          is_optional: boolean | null
          preparation_note: string | null
          quantity: number
          quantity_grams: number | null
          recipe_id: string
          unit: Database["public"]["Enums"]["unit_type"] | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          ingredient_id: string
          is_optional?: boolean | null
          preparation_note?: string | null
          quantity: number
          quantity_grams?: number | null
          recipe_id: string
          unit?: Database["public"]["Enums"]["unit_type"] | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          ingredient_id?: string
          is_optional?: boolean | null
          preparation_note?: string | null
          quantity?: number
          quantity_grams?: number | null
          recipe_id?: string
          unit?: Database["public"]["Enums"]["unit_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_tags: {
        Row: {
          recipe_id: string
          tag_id: string
        }
        Insert: {
          recipe_id: string
          tag_id: string
        }
        Update: {
          recipe_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_tags_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          calories_per_serving: number | null
          carbs_per_serving: number | null
          cook_time_min: number | null
          created_at: string | null
          created_by: string
          cuisine: string | null
          description: string | null
          diet_types: Database["public"]["Enums"]["diet_type"][] | null
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          fat_per_serving: number | null
          fibre_per_serving: number | null
          id: string
          image_url: string | null
          instructions: Json | null
          is_ai_generated: boolean | null
          is_public: boolean | null
          meal_types: Database["public"]["Enums"]["meal_type"][] | null
          notes: string | null
          prep_time_min: number | null
          protein_per_serving: number | null
          rating: number | null
          servings: number | null
          sodium_per_serving: number | null
          source_url: string | null
          sugar_per_serving: number | null
          times_cooked: number | null
          title: string
          total_time_min: number | null
          updated_at: string | null
        }
        Insert: {
          calories_per_serving?: number | null
          carbs_per_serving?: number | null
          cook_time_min?: number | null
          created_at?: string | null
          created_by: string
          cuisine?: string | null
          description?: string | null
          diet_types?: Database["public"]["Enums"]["diet_type"][] | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          fat_per_serving?: number | null
          fibre_per_serving?: number | null
          id?: string
          image_url?: string | null
          instructions?: Json | null
          is_ai_generated?: boolean | null
          is_public?: boolean | null
          meal_types?: Database["public"]["Enums"]["meal_type"][] | null
          notes?: string | null
          prep_time_min?: number | null
          protein_per_serving?: number | null
          rating?: number | null
          servings?: number | null
          sodium_per_serving?: number | null
          source_url?: string | null
          sugar_per_serving?: number | null
          times_cooked?: number | null
          title: string
          total_time_min?: number | null
          updated_at?: string | null
        }
        Update: {
          calories_per_serving?: number | null
          carbs_per_serving?: number | null
          cook_time_min?: number | null
          created_at?: string | null
          created_by?: string
          cuisine?: string | null
          description?: string | null
          diet_types?: Database["public"]["Enums"]["diet_type"][] | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          fat_per_serving?: number | null
          fibre_per_serving?: number | null
          id?: string
          image_url?: string | null
          instructions?: Json | null
          is_ai_generated?: boolean | null
          is_public?: boolean | null
          meal_types?: Database["public"]["Enums"]["meal_type"][] | null
          notes?: string | null
          prep_time_min?: number | null
          protein_per_serving?: number | null
          rating?: number | null
          servings?: number | null
          sodium_per_serving?: number | null
          source_url?: string | null
          sugar_per_serving?: number | null
          times_cooked?: number | null
          title?: string
          total_time_min?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shopping_list_items: {
        Row: {
          aisle: string | null
          created_at: string | null
          custom_item_name: string | null
          id: string
          ingredient_id: string | null
          notes: string | null
          quantity: number | null
          shopping_list_id: string
          status: Database["public"]["Enums"]["shopping_item_status"] | null
          unit: Database["public"]["Enums"]["unit_type"] | null
        }
        Insert: {
          aisle?: string | null
          created_at?: string | null
          custom_item_name?: string | null
          id?: string
          ingredient_id?: string | null
          notes?: string | null
          quantity?: number | null
          shopping_list_id: string
          status?: Database["public"]["Enums"]["shopping_item_status"] | null
          unit?: Database["public"]["Enums"]["unit_type"] | null
        }
        Update: {
          aisle?: string | null
          created_at?: string | null
          custom_item_name?: string | null
          id?: string
          ingredient_id?: string | null
          notes?: string | null
          quantity?: number | null
          shopping_list_id?: string
          status?: Database["public"]["Enums"]["shopping_item_status"] | null
          unit?: Database["public"]["Enums"]["unit_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_shopping_list_id_fkey"
            columns: ["shopping_list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          created_at: string | null
          id: string
          meal_plan_id: string | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          meal_plan_id?: string | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          meal_plan_id?: string | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_lists_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestion_feedback: {
        Row: {
          created_at: string | null
          feedback_tags: string[] | null
          feedback_text: string | null
          id: string
          rating: number | null
          suggestion_id: string
          user_id: string
          would_cook_again: boolean | null
        }
        Insert: {
          created_at?: string | null
          feedback_tags?: string[] | null
          feedback_text?: string | null
          id?: string
          rating?: number | null
          suggestion_id: string
          user_id: string
          would_cook_again?: boolean | null
        }
        Update: {
          created_at?: string | null
          feedback_tags?: string[] | null
          feedback_text?: string | null
          id?: string
          rating?: number | null
          suggestion_id?: string
          user_id?: string
          would_cook_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_feedback_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_taste_profile: {
        Row: {
          avoided_ingredients: string[] | null
          budget_preference: string | null
          cooking_skill: Database["public"]["Enums"]["difficulty_level"] | null
          created_at: string | null
          flavour_profile: Json | null
          household_size: number | null
          id: string
          ingredient_affinity: Json | null
          last_updated_by_ai: string | null
          max_cook_time_min: number | null
          max_prep_time_min: number | null
          preferred_cuisines: string[] | null
          preferred_ingredients: string[] | null
          spice_tolerance: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avoided_ingredients?: string[] | null
          budget_preference?: string | null
          cooking_skill?: Database["public"]["Enums"]["difficulty_level"] | null
          created_at?: string | null
          flavour_profile?: Json | null
          household_size?: number | null
          id?: string
          ingredient_affinity?: Json | null
          last_updated_by_ai?: string | null
          max_cook_time_min?: number | null
          max_prep_time_min?: number | null
          preferred_cuisines?: string[] | null
          preferred_ingredients?: string[] | null
          spice_tolerance?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avoided_ingredients?: string[] | null
          budget_preference?: string | null
          cooking_skill?: Database["public"]["Enums"]["difficulty_level"] | null
          created_at?: string | null
          flavour_profile?: Json | null
          household_size?: number | null
          id?: string
          ingredient_affinity?: Json | null
          last_updated_by_ai?: string | null
          max_cook_time_min?: number | null
          max_prep_time_min?: number | null
          preferred_cuisines?: string[] | null
          preferred_ingredients?: string[] | null
          spice_tolerance?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_recipe_nutrition: {
        Args: { p_recipe_id: string }
        Returns: undefined
      }
      generate_shopping_list: {
        Args: { p_user_id: string }
        Returns: string
      }
    }
    Enums: {
      diet_type:
        | "omnivore"
        | "vegetarian"
        | "vegan"
        | "pescatarian"
        | "keto"
        | "paleo"
        | "mediterranean"
        | "carnivore"
        | "whole30"
        | "gluten_free"
        | "dairy_free"
        | "low_fodmap"
      difficulty_level: "easy" | "medium" | "hard" | "expert"
      goal_type:
        | "lose_weight"
        | "maintain_weight"
        | "gain_weight"
        | "build_muscle"
        | "improve_health"
        | "increase_energy"
      meal_type:
        | "breakfast"
        | "morning_snack"
        | "lunch"
        | "afternoon_snack"
        | "dinner"
        | "evening_snack"
      prep_status: "not_started" | "in_progress" | "completed"
      shopping_item_status: "needed" | "purchased" | "skipped"
      suggestion_status: "pending" | "accepted" | "rejected" | "saved"
      unit_type:
        | "g"
        | "mg"
        | "mcg"
        | "ml"
        | "l"
        | "tsp"
        | "tbsp"
        | "cup"
        | "oz"
        | "lb"
        | "piece"
        | "slice"
        | "clove"
        | "bunch"
        | "pinch"
        | "to_taste"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      diet_type: [
        "omnivore",
        "vegetarian",
        "vegan",
        "pescatarian",
        "keto",
        "paleo",
        "mediterranean",
        "carnivore",
        "whole30",
        "gluten_free",
        "dairy_free",
        "low_fodmap",
      ],
      difficulty_level: ["easy", "medium", "hard", "expert"],
      goal_type: [
        "lose_weight",
        "maintain_weight",
        "gain_weight",
        "build_muscle",
        "improve_health",
        "increase_energy",
      ],
      meal_type: [
        "breakfast",
        "morning_snack",
        "lunch",
        "afternoon_snack",
        "dinner",
        "evening_snack",
      ],
      prep_status: ["not_started", "in_progress", "completed"],
      shopping_item_status: ["needed", "purchased", "skipped"],
      suggestion_status: ["pending", "accepted", "rejected", "saved"],
      unit_type: [
        "g",
        "mg",
        "mcg",
        "ml",
        "l",
        "tsp",
        "tbsp",
        "cup",
        "oz",
        "lb",
        "piece",
        "slice",
        "clove",
        "bunch",
        "pinch",
        "to_taste",
      ],
    },
  },
} as const
