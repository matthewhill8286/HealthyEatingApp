/**
 * Mifflin-St Jeor BMR → TDEE → Macro Calculator
 *
 * Uses the Mifflin-St Jeor equation (1990), considered the most accurate
 * predictive equation for estimating BMR in healthy individuals.
 */

export type Sex = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'        // little or no exercise
  | 'lightly_active'   // light exercise 1-3 days/week
  | 'moderately_active' // moderate exercise 3-5 days/week
  | 'very_active'      // hard exercise 6-7 days/week
  | 'extra_active';    // very hard exercise, physical job

export type Goal =
  | 'lose_weight'
  | 'maintain_weight'
  | 'gain_weight'
  | 'build_muscle'
  | 'improve_health'
  | 'increase_energy';

export type MacroTargets = {
  calories: number;
  protein: number;   // grams
  carbs: number;     // grams
  fat: number;       // grams
  fibre: number;     // grams
};

// Activity multipliers for TDEE = BMR × multiplier
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

// Calorie adjustments based on goal
const GOAL_CALORIE_ADJUSTMENTS: Record<Goal, number> = {
  lose_weight: -500,       // ~0.5 kg/week deficit
  maintain_weight: 0,
  gain_weight: 400,        // lean bulk surplus
  build_muscle: 300,       // moderate surplus
  improve_health: 0,
  increase_energy: 100,    // slight surplus
};

// Protein targets in g/kg of body weight
const GOAL_PROTEIN_PER_KG: Record<Goal, number> = {
  lose_weight: 2.0,       // higher protein to preserve muscle in deficit
  maintain_weight: 1.6,
  gain_weight: 1.8,
  build_muscle: 2.2,      // maximum for muscle synthesis
  improve_health: 1.4,
  increase_energy: 1.6,
};

/**
 * Calculate BMR using the Mifflin-St Jeor equation
 *
 * Male:   BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5
 * Female: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: Sex,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === 'male' ? base + 5 : base - 161;
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * Calculate complete macro targets from user stats
 */
export function calculateMacros(params: {
  weightKg: number;
  heightCm: number;
  dateOfBirth: Date;
  sex: Sex;
  activityLevel: ActivityLevel;
  goal: Goal;
}): MacroTargets {
  const { weightKg, heightCm, dateOfBirth, sex, activityLevel, goal } = params;

  const age = calculateAge(dateOfBirth);
  const bmr = calculateBMR(weightKg, heightCm, age, sex);
  const tdee = calculateTDEE(bmr, activityLevel);
  const calories = Math.max(1200, tdee + GOAL_CALORIE_ADJUSTMENTS[goal]);

  // Protein: based on body weight and goal
  const proteinG = Math.round(weightKg * GOAL_PROTEIN_PER_KG[goal]);

  // Fat: 25-30% of calories (higher for keto would be handled separately)
  const fatPct = goal === 'lose_weight' ? 0.25 : 0.28;
  const fatG = Math.round((calories * fatPct) / 9);

  // Carbs: remaining calories after protein and fat
  const proteinCals = proteinG * 4;
  const fatCals = fatG * 9;
  const carbCals = Math.max(0, calories - proteinCals - fatCals);
  const carbsG = Math.round(carbCals / 4);

  // Fibre: 14g per 1000 kcal (Institute of Medicine recommendation)
  const fibreG = Math.round((calories / 1000) * 14);

  return {
    calories,
    protein: proteinG,
    carbs: carbsG,
    fat: fatG,
    fibre: Math.max(25, fibreG), // minimum 25g
  };
}

/**
 * Get a human-readable summary of the calculation
 */
export function getCalculationSummary(params: {
  weightKg: number;
  heightCm: number;
  dateOfBirth: Date;
  sex: Sex;
  activityLevel: ActivityLevel;
  goal: Goal;
}): { bmr: number; tdee: number; adjustment: number; targets: MacroTargets } {
  const { weightKg, heightCm, dateOfBirth, sex, activityLevel, goal } = params;

  const age = calculateAge(dateOfBirth);
  const bmr = Math.round(calculateBMR(weightKg, heightCm, age, sex));
  const tdee = calculateTDEE(bmr, activityLevel);
  const adjustment = GOAL_CALORIE_ADJUSTMENTS[goal];
  const targets = calculateMacros(params);

  return { bmr, tdee, adjustment, targets };
}

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, { label: string; description: string }> = {
  sedentary: { label: 'Sedentary', description: 'Desk job, little exercise' },
  lightly_active: { label: 'Lightly Active', description: 'Light exercise 1-3 days/week' },
  moderately_active: { label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week' },
  very_active: { label: 'Very Active', description: 'Hard exercise 6-7 days/week' },
  extra_active: { label: 'Extra Active', description: 'Athlete or physical job' },
};
