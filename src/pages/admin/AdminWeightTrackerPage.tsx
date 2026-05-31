import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, ChevronDown, ChevronRight, Dumbbell, ExternalLink, Flame, Pencil, Save, Scale, Utensils, X } from "lucide-react";
import { Button, Checkbox, Input, Select, Textarea } from "../../components/ui";
import "./AdminWeightTrackerPage.css";

type Gender = "male" | "female";
type Formula = "mifflin" | "harris" | "katch";
type ResultUnit = "calories" | "kilojoules";
type AgeCalculateMode = "age" | "time-between";
type MacroMode = "balanced" | "low-fat" | "low-carb" | "high-protein" | "custom";
type LengthUnit = "in-to-ft" | "ft-to-in";
type WaterActivity = "sedentary" | "light" | "moderate" | "very-active" | "extremely-active";
type WaterClimate = "tropical" | "temperate" | "cold";
type WorkoutPlanMode = "progression" | "circuit";
type MealPlanMealId = "breakfast" | "lunch" | "snack" | "dinner" | "late-snack";

interface MealPlanOption {
  id: string;
  title: string;
  focus: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  notes?: string;
}

interface MealPlanMeal {
  id: MealPlanMealId;
  title: string;
  subtitle: string;
  options: MealPlanOption[];
  selectedOptionId: string;
}

interface MealOptionEditor {
  mealId: MealPlanMealId;
  optionId?: string;
  draft: Omit<MealPlanOption, "id">;
}

interface WeightTrackerSettings {
  age: number;
  gender: Gender;
  feet: number;
  inches: number;
  weight: number;
  activity: string;
  formula: Formula;
  bodyFat: number;
  unit: ResultUnit;
  startDate: string;
  foodSearch: string;
  foodCategory: string;
  birthDate: string;
  ageOnDate: string;
  ageMode: AgeCalculateMode;
  macroMode: MacroMode;
  customProteinPercent: number;
  customCarbPercent: number;
  customFatPercent: number;
  lengthAmount: number;
  lengthUnit: LengthUnit;
  waterActivity: WaterActivity;
  waterClimate: WaterClimate;
  workoutPlan: WorkoutPlanMode;
}

interface FoodEntry {
  category: string;
  name: string;
  serving: string;
  calories: number;
  kj: number;
}

interface ExerciseEntry {
  activity: string;
  calories125: number;
  calories155: number;
  calories185: number;
}

interface WorkoutTemplate {
  offset: number;
  type: string;
  exercises: string;
  workoutLink?: string;
  workoutLink2?: string;
  variation: string;
  level: string;
  pushups: string;
  pushupLink?: string;
}

interface WorkoutOverride {
  type?: string;
  exercises?: string;
  workoutLink?: string;
  workoutLink2?: string;
  variation?: string;
  level?: string;
  pushups?: string;
  pushupLink?: string;
}

const storageKey = "admin:weight-tracker";
const completionStorageKey = "admin:weight-tracker:completion:v4";
const workoutOverridesStorageKey = "admin:weight-tracker:workout-overrides:v4";
const collapsedSectionsStorageKey = "admin:weight-tracker:collapsed-sections";
const mealPlanStorageKey = "admin:weight-tracker:meal-plan:v1";

const defaultSettings: WeightTrackerSettings = {
  age: 23,
  gender: "male",
  feet: 6,
  inches: 3.5,
  weight: 277,
  activity: "1.55",
  formula: "mifflin",
  bodyFat: 20,
  unit: "calories",
  startDate: "2026-05-24",
  foodSearch: "",
  foodCategory: "All",
  birthDate: "2003-01-31",
  ageOnDate: "2026-05-31",
  ageMode: "age",
  macroMode: "high-protein",
  customProteinPercent: 30,
  customCarbPercent: 40,
  customFatPercent: 30,
  lengthAmount: 1,
  lengthUnit: "in-to-ft",
  
  waterActivity: "moderate",
  waterClimate: "tropical",
  workoutPlan: "progression",
};

const activityOptions = [
  { value: "1.2", label: "Sedentary" },
  { value: "1.375", label: "Light: exercise 1-3 times/week" },
  { value: "1.55", label: "Moderate: exercise 4-5 times/week" },
  { value: "1.725", label: "Active: daily exercise or intense 3-4 times/week" },
  { value: "1.9", label: "Very active: intense exercise 6-7 times/week" },
];

const macroPlans: Record<MacroMode, { label: string; protein: number; carbs: number; fat: number }> = {
  balanced: { label: "Balanced", protein: 25, carbs: 50, fat: 25 },
  "low-fat": { label: "Low Fat", protein: 25, carbs: 55, fat: 20 },
  "low-carb": { label: "Low Carb", protein: 30, carbs: 25, fat: 45 },
  "high-protein": { label: "High Protein", protein: 35, carbs: 45, fat: 20 },
  custom: { label: "Create Your Own", protein: 30, carbs: 40, fat: 30 },
};

const waterActivityOptions: { value: WaterActivity; label: string; extraMl: number }[] = [
  { value: "sedentary", label: "Sedentary", extraMl: 0 },
  { value: "light", label: "Light Activity", extraMl: 350 },
  { value: "moderate", label: "Moderately Active", extraMl: 700 },
  { value: "very-active", label: "Very Active", extraMl: 1000 },
  { value: "extremely-active", label: "Extremely Active", extraMl: 1400 },
];

const waterClimateOptions: { value: WaterClimate; label: string; extraMl: number }[] = [
  { value: "tropical", label: "Tropical", extraMl: 700 },
  { value: "temperate", label: "Temperate", extraMl: 0 },
  { value: "cold", label: "Cold", extraMl: -150 },
];

const foods: FoodEntry[] = [
  { category: "Fruit", name: "Apple", serving: "1 (4 oz.)", calories: 59, kj: 247 },
  { category: "Fruit", name: "Banana", serving: "1 (6 oz.)", calories: 151, kj: 632 },
  { category: "Fruit", name: "Grapes", serving: "1 cup", calories: 100, kj: 419 },
  { category: "Fruit", name: "Orange", serving: "1 (4 oz.)", calories: 53, kj: 222 },
  { category: "Fruit", name: "Pear", serving: "1 (5 oz.)", calories: 82, kj: 343 },
  { category: "Fruit", name: "Peach", serving: "1 (6 oz.)", calories: 67, kj: 281 },
  { category: "Fruit", name: "Pineapple", serving: "1 cup", calories: 82, kj: 343 },
  { category: "Fruit", name: "Strawberry", serving: "1 cup", calories: 53, kj: 222 },
  { category: "Fruit", name: "Watermelon", serving: "1 cup", calories: 50, kj: 209 },
  { category: "Vegetables", name: "Asparagus", serving: "1 cup", calories: 27, kj: 113 },
  { category: "Vegetables", name: "Broccoli", serving: "1 cup", calories: 45, kj: 188 },
  { category: "Vegetables", name: "Carrots", serving: "1 cup", calories: 50, kj: 209 },
  { category: "Vegetables", name: "Cucumber", serving: "4 oz.", calories: 17, kj: 71 },
  { category: "Vegetables", name: "Eggplant", serving: "1 cup", calories: 35, kj: 147 },
  { category: "Vegetables", name: "Lettuce", serving: "1 cup", calories: 5, kj: 21 },
  { category: "Vegetables", name: "Tomato", serving: "1 cup", calories: 22, kj: 92 },
  { category: "Proteins", name: "Beef, regular, cooked", serving: "2 oz.", calories: 142, kj: 595 },
  { category: "Proteins", name: "Chicken, cooked", serving: "2 oz.", calories: 136, kj: 569 },
  { category: "Proteins", name: "Tofu", serving: "4 oz.", calories: 86, kj: 360 },
  { category: "Proteins", name: "Egg", serving: "1 large", calories: 78, kj: 327 },
  { category: "Proteins", name: "Fish, Catfish, cooked", serving: "2 oz.", calories: 136, kj: 569 },
  { category: "Proteins", name: "Pork, cooked", serving: "2 oz.", calories: 137, kj: 574 },
  { category: "Proteins", name: "Shrimp, cooked", serving: "2 oz.", calories: 56, kj: 234 },
  { category: "Common Meals/Snacks", name: "Bread, white", serving: "1 slice (1 oz.)", calories: 75, kj: 314 },
  { category: "Common Meals/Snacks", name: "Butter", serving: "1 tablespoon", calories: 102, kj: 427 },
  { category: "Common Meals/Snacks", name: "Caesar salad", serving: "3 cups", calories: 481, kj: 2014 },
  { category: "Common Meals/Snacks", name: "Cheeseburger", serving: "1 sandwich", calories: 285, kj: 1193 },
  { category: "Common Meals/Snacks", name: "Hamburger", serving: "1 sandwich", calories: 250, kj: 1047 },
  { category: "Common Meals/Snacks", name: "Dark Chocolate", serving: "1 oz.", calories: 155, kj: 649 },
  { category: "Common Meals/Snacks", name: "Corn", serving: "1 cup", calories: 132, kj: 553 },
  { category: "Common Meals/Snacks", name: "Pizza", serving: "1 slice (14\")", calories: 285, kj: 1193 },
  { category: "Common Meals/Snacks", name: "Potato", serving: "6 oz.", calories: 130, kj: 544 },
  { category: "Common Meals/Snacks", name: "Rice", serving: "1 cup cooked", calories: 206, kj: 862 },
  { category: "Common Meals/Snacks", name: "Sandwich", serving: "1 (6\" Subway Turkey Sandwich)", calories: 200, kj: 837 },
  { category: "Beverages/Dairy", name: "Beer", serving: "1 can", calories: 154, kj: 645 },
  { category: "Beverages/Dairy", name: "Coca-Cola Classic", serving: "1 can", calories: 150, kj: 628 },
  { category: "Beverages/Dairy", name: "Diet Coke", serving: "1 can", calories: 0, kj: 0 },
  { category: "Beverages/Dairy", name: "Milk (1%)", serving: "1 cup", calories: 102, kj: 427 },
  { category: "Beverages/Dairy", name: "Milk (2%)", serving: "1 cup", calories: 122, kj: 511 },
  { category: "Beverages/Dairy", name: "Milk (Whole)", serving: "1 cup", calories: 146, kj: 611 },
  { category: "Beverages/Dairy", name: "Orange Juice", serving: "1 cup", calories: 111, kj: 465 },
  { category: "Beverages/Dairy", name: "Apple cider", serving: "1 cup", calories: 117, kj: 490 },
  { category: "Beverages/Dairy", name: "Yogurt (low-fat)", serving: "1 cup", calories: 154, kj: 645 },
  { category: "Beverages/Dairy", name: "Yogurt (non-fat)", serving: "1 cup", calories: 110, kj: 461 },
];

const exercises: ExerciseEntry[] = [
  { activity: "Golf (using cart)", calories125: 198, calories155: 246, calories185: 294 },
  { activity: "Walking (3.5 mph)", calories125: 215, calories155: 267, calories185: 319 },
  { activity: "Kayaking", calories125: 283, calories155: 352, calories185: 420 },
  { activity: "Softball/Baseball", calories125: 289, calories155: 359, calories185: 428 },
  { activity: "Swimming (free-style, moderate)", calories125: 397, calories155: 492, calories185: 587 },
  { activity: "Tennis (general)", calories125: 397, calories155: 492, calories185: 587 },
  { activity: "Running (9 minute mile)", calories125: 624, calories155: 773, calories185: 923 },
  { activity: "Bicycling (12-14 mph, moderate)", calories125: 454, calories155: 562, calories185: 671 },
  { activity: "Football (general)", calories125: 399, calories155: 494, calories185: 588 },
  { activity: "Basketball (general)", calories125: 340, calories155: 422, calories185: 503 },
  { activity: "Soccer (general)", calories125: 397, calories155: 492, calories185: 587 },
];

const progressionWorkoutTemplates: WorkoutTemplate[] = [
  { offset: 1, type: "Full-Body Dumbbell Strength", exercises: "20 Min Full Body\nPlank Hold (30 or more)", variation: "#1 Wall Pushups", level: "Level 1", pushups: "2 Sets of 30 Pushups" },
  { offset: 3, type: "Cardio + Core Conditioning", exercises: "60-90 min Ride (10-15 miles)\n10 Min Dumbbell Standing Abs\nRussian Twists (10 per side/30s rest)\nLeg Raises (15 reps/30s rest)\nFlutter Kicks (30s/30s rest)", variation: "#1 Wall Pushups", level: "Level 2", pushups: "2 Sets of 50 Pushups" },
  { offset: 5, type: "Dumbbell Upper + Yoga Mobility", exercises: "20 Min Upper Body Dumbbell Workout At Home\n20 Min Yoga Routine for Athletes", variation: "#1 Wall Pushups", level: "Level 3", pushups: "3 Sets of 50 Pushups" },
  { offset: 8, type: "Full-Body Dumbbell Strength", exercises: "20 Min Full Body\nPlank Hold (30 or more)", variation: "#2 Incline Pushups", level: "Level 1", pushups: "2 Sets of 20 Pushups" },
  { offset: 10, type: "Cardio + Core Conditioning", exercises: "60-90 min Ride (10-15 miles)\n10 Min Dumbbell Standing Abs\nRussian Twists (10 per side/30s rest)\nLeg Raises (15 reps/30s rest)\nFlutter Kicks (30s/30s rest)", variation: "#2 Incline Pushups", level: "Level 2", pushups: "2 Sets of 30 Pushups" },
  { offset: 12, type: "Dumbbell Upper + Yoga Mobility", exercises: "20 Min Upper Body Dumbbell Workout At Home\n20 Min Yoga Routine for Athletes", variation: "#2 Incline Pushups", level: "Level 3", pushups: "3 Sets of 40 Pushups" },
  { offset: 15, type: "Full-Body Dumbbell Strength", exercises: "20 Min Full Body\nPlank Hold (30 or more)", variation: "#3 Advanced Incline Pushups", level: "Level 1", pushups: "2 Sets of 20 Pushups" },
  { offset: 17, type: "Cardio + Core Conditioning", exercises: "60-90 min Ride (10-15 miles)\n10 Min Dumbbell Standing Abs\nRussian Twists (10 per side/30s rest)\nLeg Raises (15 reps/30s rest)\nFlutter Kicks (30s/30s rest)", variation: "#3 Advanced Incline Pushups", level: "Level 2", pushups: "2 Sets of 30 Pushups" },
  { offset: 19, type: "Dumbbell Upper + Yoga Mobility", exercises: "20 Min Upper Body Dumbbell Workout At Home\n20 Min Yoga Routine for Athletes", variation: "#3 Advanced Incline Pushups", level: "Level 3", pushups: "3 Sets of 35 Pushups" },
  { offset: 22, type: "Full-Body Dumbbell Strength", exercises: "20 Min Full Body\nPlank Hold (30 or more)", variation: "#4 Knee Pushups", level: "Level 1", pushups: "2 Sets of 10 Pushups" },
  { offset: 24, type: "Cardio + Core Conditioning", exercises: "60-90 min Ride (10-15 miles)\n10 Min Dumbbell Standing Abs\nRussian Twists (10 per side/30s rest)\nLeg Raises (15 reps/30s rest)\nFlutter Kicks (30s/30s rest)", variation: "#4 Knee Pushups", level: "Level 2", pushups: "2 Sets of 20 Pushups" },
  { offset: 26, type: "Dumbbell Upper + Yoga Mobility", exercises: "20 Min Upper Body Dumbbell Workout At Home\n20 Min Yoga Routine for Athletes", variation: "#4 Knee Pushups", level: "Level 3", pushups: "3 Sets of 30 Pushups" },
  { offset: 29, type: "Full-Body Dumbbell Strength", exercises: "20 Min Full Body\nPlank Hold (30 or more)", variation: "#5 Full Pushups", level: "Level 1", pushups: "2 Sets of 5 Pushups" },
  { offset: 31, type: "Cardio + Core Conditioning", exercises: "60-90 min Ride (10-15 miles)\n10 Min Dumbbell Standing Abs\nRussian Twists (10 per side/30s rest)\nLeg Raises (15 reps/30s rest)\nFlutter Kicks (30s/30s rest)", variation: "#5 Full Pushups", level: "Level 2", pushups: "2 Sets of 15 Pushups" },
  { offset: 33, type: "Dumbbell Upper + Yoga Mobility", exercises: "20 Min Upper Body Dumbbell Workout At Home\n20 Min Yoga Routine for Athletes", variation: "#5 Full Pushups", level: "Level 3", pushups: "3 Sets of 25 Pushups" },
  { offset: 36, type: "Full-Body Dumbbell Strength", exercises: "20 Min Full Body\nPlank Hold (30 or more)", variation: "#6 Narrow Pushups", level: "Level 1", pushups: "2 Sets of 5 Pushups" },
  { offset: 38, type: "Cardio + Core Conditioning", exercises: "60-90 min Ride (10-15 miles)\n10 Min Dumbbell Standing Abs\nRussian Twists (10 per side/30s rest)\nLeg Raises (15 reps/30s rest)\nFlutter Kicks (30s/30s rest)", variation: "#6 Narrow Pushups", level: "Level 2", pushups: "2 Sets of 10 Pushups" },
  { offset: 40, type: "Dumbbell Upper + Yoga Mobility", exercises: "20 Min Upper Body Dumbbell Workout At Home\n20 Min Yoga Routine for Athletes", variation: "#6 Narrow Pushups", level: "Level 3", pushups: "3 Sets of 20 Pushups" },
  { offset: 43, type: "Full-Body Dumbbell Strength", exercises: "20 Min Full Body\nPlank Hold (30 or more)", variation: "#7 Side Staggered Pushups", level: "Level 1", pushups: "2 Sets of 5 Pushups (Per Side)" },
  { offset: 45, type: "Cardio + Core Conditioning", exercises: "60-90 min Ride (10-15 miles)\n10 Min Dumbbell Standing Abs\nRussian Twists (10 per side/30s rest)\nLeg Raises (15 reps/30s rest)\nFlutter Kicks (30s/30s rest)", variation: "#7 Side Staggered Pushups", level: "Level 2", pushups: "2 Sets of 10 Pushups (Per Side)" },
  { offset: 47, type: "Dumbbell Upper + Yoga Mobility", exercises: "20 Min Upper Body Dumbbell Workout At Home\n20 Min Yoga Routine for Athletes", variation: "#7 Side Staggered Pushups", level: "Level 3", pushups: "2 Sets of 20 Pushups (Per Side)" },
  { offset: 50, type: "Full-Body Dumbbell Strength", exercises: "20 Min Full Body\nPlank Hold (30 or more)", variation: "#8 Archer Pushups", level: "Level 1", pushups: "2 Sets of 5 Pushups (Per Side)" },
  { offset: 52, type: "Cardio + Core Conditioning", exercises: "60-90 min Ride (10-15 miles)\n10 Min Dumbbell Standing Abs\nRussian Twists (10 per side/30s rest)\nLeg Raises (15 reps/30s rest)\nFlutter Kicks (30s/30s rest)", variation: "#8 Archer Pushups", level: "Level 2", pushups: "2 Sets of 9 Pushups (Per Side)" },
  { offset: 54, type: "Dumbbell Upper + Yoga Mobility", exercises: "20 Min Upper Body Dumbbell Workout At Home\n20 Min Yoga Routine for Athletes", variation: "#8 Archer Pushups", level: "Level 3", pushups: "2 Sets of 12 Pushups (Per Side)" },
  { offset: 57, type: "Full-Body Dumbbell Strength", exercises: "20 Min Full Body\nPlank Hold (30 or more)", variation: "#9 Sliding One-Arm Pushups", pushupLink: "https://www.hybridcalisthenics.com/sliding-onearm-pushups", level: "Level 1", pushups: "2 Sets of 5 Pushups (Per Side)" },
  { offset: 59, type: "Cardio + Core Conditioning", exercises: "60-90 min Ride (10-15 miles)\n10 Min Dumbbell Standing Abs\nRussian Twists (10 per side/30s rest)\nLeg Raises (15 reps/30s rest)\nFlutter Kicks (30s/30s rest)", variation: "#9 Sliding One-Arm Pushups", pushupLink: "https://www.hybridcalisthenics.com/sliding-onearm-pushups", level: "Level 2", pushups: "2 Sets of 9 Pushups (Per Side)" },
  { offset: 61, type: "Dumbbell Upper + Yoga Mobility", exercises: "20 Min Upper Body Dumbbell Workout At Home\n20 Min Yoga Routine for Athletes", variation: "#9 Sliding One-Arm Pushups", pushupLink: "https://www.hybridcalisthenics.com/sliding-onearm-pushups", level: "Level 3", pushups: "2 Sets of 12 Pushups (Per Side)" },
  { offset: 64, type: "Full-Body Dumbbell Strength", exercises: "20 Min Full Body\nPlank Hold (30 or more)", variation: "#10 One-Arm Pushups", pushupLink: "https://www.hybridcalisthenics.com/onearm-pushups", level: "Level 1", pushups: "2 Sets of 3 Pushups (Per Side)" },
  { offset: 66, type: "Cardio + Core Conditioning", exercises: "60-90 min Ride (10-15 miles)\n10 Min Dumbbell Standing Abs\nRussian Twists (10 per side/30s rest)\nLeg Raises (15 reps/30s rest)\nFlutter Kicks (30s/30s rest)", variation: "#10 One-Arm Pushups", pushupLink: "https://www.hybridcalisthenics.com/onearm-pushups", level: "Level 2", pushups: "2 Sets of 6 Pushups (Per Side)" },
  { offset: 68, type: "Dumbbell Upper + Yoga Mobility", exercises: "20 Min Upper Body Dumbbell Workout At Home\n20 Min Yoga Routine for Athletes", variation: "#10 One-Arm Pushups", pushupLink: "https://www.hybridcalisthenics.com/onearm-pushups", level: "Level 3", pushups: "2 Sets of 9 Pushups (Per Side)" },
  { offset: 71, type: "Full-Body Dumbbell Strength", exercises: "20 Min Full Body\nPlank Hold (30 or more)", variation: "#11 Advanced One-Arm Pushups", pushupLink: "https://www.hybridcalisthenics.com/advanced-onearm-pushups", level: "Level 1", pushups: "2 Sets of 3 Pushups (Per Side)" },
  { offset: 73, type: "Cardio + Core Conditioning", exercises: "60-90 min Ride (10-15 miles)\n10 Min Dumbbell Standing Abs\nRussian Twists (10 per side/30s rest)\nLeg Raises (15 reps/30s rest)\nFlutter Kicks (30s/30s rest)", variation: "#11 Advanced One-Arm Pushups", pushupLink: "https://www.hybridcalisthenics.com/advanced-onearm-pushups", level: "Level 2", pushups: "2 Sets of 6 Pushups (Per Side)" },
  { offset: 75, type: "Dumbbell Upper + Yoga Mobility", exercises: "20 Min Upper Body Dumbbell Workout At Home\n20 Min Yoga Routine for Athletes", variation: "#11 Advanced One-Arm Pushups", pushupLink: "https://www.hybridcalisthenics.com/advanced-onearm-pushups", level: "Level 3", pushups: "2 Sets of 9 Pushups (Per Side)" },
];

const circuitWorkoutTemplates: WorkoutTemplate[] = [
  {
    offset: 1,
    type: "Monday - Full Body Circuit",
    exercises: "Repeat this circuit 3 times\n1. Bodyweight Squats - 20 reps\n2. Mountain Climbers - 30 reps (15 per leg)\n3. Glute Bridges - 20 reps\n4. Plank Hold - 30 seconds\n5. Russian Twists - 40 reps (20 per side)",
    variation: "PushFit App",
    level: "15-20 reps",
    pushups: "Push-Ups on PushFit App - 15-20 reps\nModify by using knees if needed.",
  },
  {
    offset: 3,
    type: "Wednesday - Lower Body Focus",
    exercises: "Repeat this circuit 4 times\n1. Lunges - 15 reps per leg\n2. Wall Sits - 45 seconds hold\n3. Calf Raises - 30 reps\n4. Glute Bridges with a Hold - 15 reps (hold the top position for 2 seconds each time)\n5. Squat Pulses - 15 reps",
    variation: "Lower Body",
    level: "4 rounds",
    pushups: "No PushFit set today.",
  },
  {
    offset: 5,
    type: "Friday - Core and Upper Body",
    exercises: "Repeat this circuit 3 times\n1. Plank to Push-Up - 10 reps\n2. Russian Twists - 30 reps\n3. Bicycle Crunches - 30 reps\n4. Forearm Plank Hold - 40 seconds\n5. Tricep Dips (use a sturdy chair) - 15 reps",
    variation: "PushFit App",
    level: "15 reps",
    pushups: "Push-Ups on PushFit App - 15 reps",
  },
  {
    offset: 8,
    type: "Monday - Cardio and Core Burn",
    exercises: "Perform 5 rounds of the following circuit\n1. Mountain Climbers - 40 reps (20 per leg)\n2. Plank Jacks (modified for low ceilings) - 20 reps\n3. Plank Hold - 30 seconds\n4. Bicycle Crunches - 30 reps\n5. Superman Hold - 30 seconds\n6. Rest for 30-45 seconds between rounds.",
    variation: "Cardio + Core",
    level: "5 rounds",
    pushups: "No PushFit set today.",
  },
  {
    offset: 10,
    type: "Wednesday - Full Body Power",
    exercises: "Repeat this circuit 4 times\n1. Squat to Stand (squat, then raise your arms overhead) - 20 reps\n2. Plank to Push-Up - 10 reps\n3. Reverse Lunges - 15 reps per leg\n4. Leg Raises - 20 reps",
    variation: "PushFit App",
    level: "15 reps",
    pushups: "Push-Ups on PushFit App - 15 reps",
  },
  {
    offset: 12,
    type: "Friday - Low Impact, High Burn",
    exercises: "Repeat this circuit 3 times\n1. Squat Pulses - 15 reps\n2. Glute Bridges - 20 reps\n3. Plank Hold - 45 seconds\n4. Standing Side Crunch - 20 reps (10 per side)\n5. Lunges - 15 reps per leg\n6. Rest for 30-60 seconds between rounds.",
    variation: "Low Impact",
    level: "3 rounds",
    pushups: "No PushFit set today.",
  },
  {
    offset: 15,
    type: "Monday - Active Recovery / Stretch",
    exercises: "Focus on light stretching and mobility work.",
    variation: "Recovery",
    level: "Mobility",
    pushups: "No PushFit set today.",
  },
];

const foodCategories = ["All", ...Array.from(new Set(foods.map((food) => food.category)))];

function mealOption(
  id: string,
  title: string,
  focus: string,
  calories: number,
  protein: number,
  carbs: number,
  fats: number,
  notes?: string,
): MealPlanOption {
  return { id, title, focus, calories, protein, carbs, fats, notes };
}

const breakfastOptions = [
  mealOption("breakfast-1", "Greek Yogurt Berry Parfait", "High protein, fast prep", 420, 35, 38, 14),
  mealOption("breakfast-2", "Veggie Omelet + Toast", "Savory, balanced start", 480, 32, 28, 22),
  mealOption("breakfast-3", "Oatmeal + Banana + Peanut Butter", "Slow-release energy", 540, 22, 64, 20),
  mealOption("breakfast-4", "Protein Smoothie Bowl", "Light but filling", 400, 34, 42, 10),
  mealOption("breakfast-5", "Turkey Breakfast Wrap", "Portable and high protein", 450, 37, 30, 16),
  mealOption("breakfast-6", "Cottage Cheese + Fruit Bowl", "Creamy, no-cook option", 360, 30, 32, 10),
  mealOption("breakfast-7", "Avocado Toast + Eggs", "Healthy fats and satiety", 470, 25, 31, 27),
  mealOption("breakfast-8", "Overnight Oats + Chia", "Meal-prep friendly", 430, 27, 52, 14),
  mealOption("breakfast-9", "Breakfast Burrito", "Hearty and customizable", 510, 33, 34, 24),
  mealOption("breakfast-10", "Salmon Toast + Citrus", "Omega-3 rich", 460, 31, 24, 24),
  mealOption("breakfast-11", "Protein Pancakes", "Sweet but still high protein", 520, 38, 58, 15),
  mealOption("breakfast-12", "Chicken Hash Bowl", "Great post-workout meal", 560, 42, 40, 20),
  mealOption("breakfast-13", "Skyr + Granola", "Quick, cold breakfast", 390, 29, 41, 9),
  mealOption("breakfast-14", "Breakfast Rice Bowl", "Good if you train early", 500, 34, 50, 16),
  mealOption("breakfast-15", "Tofu Scramble + Potatoes", "Plant-forward option", 440, 26, 36, 18),
];

const lunchOptions = [
  mealOption("lunch-1", "Chicken Quinoa Bowl", "Lean protein + grains", 560, 45, 48, 18),
  mealOption("lunch-2", "Turkey Sandwich + Fruit", "Simple and portable", 520, 40, 50, 14),
  mealOption("lunch-3", "Tuna Rice Bowl", "Fast pantry-friendly lunch", 500, 38, 44, 16),
  mealOption("lunch-4", "Salmon Salad + Bread", "Lighter but satisfying", 540, 36, 28, 28),
  mealOption("lunch-5", "Beef Burrito Bowl", "Higher calorie training fuel", 620, 44, 52, 24),
  mealOption("lunch-6", "Grilled Chicken Wrap", "Easy desk lunch", 510, 41, 41, 15),
  mealOption("lunch-7", "Tofu Stir-Fry + Rice", "Vegetarian lunch option", 500, 28, 58, 18),
  mealOption("lunch-8", "Shrimp Pasta Salad", "Cool and fresh", 480, 34, 45, 14),
  mealOption("lunch-9", "Turkey Chili + Cornbread", "Comfort food with protein", 600, 43, 55, 18),
  mealOption("lunch-10", "Chicken Pasta Primavera", "Balanced classic", 580, 40, 62, 17),
  mealOption("lunch-11", "Steak Salad + Potatoes", "Heavier lunch for training days", 590, 42, 34, 26),
  mealOption("lunch-12", "Chickpea Grain Bowl", "Fiber-rich plant option", 540, 24, 62, 16),
  mealOption("lunch-13", "Egg Salad Sandwich", "Quick and filling", 490, 28, 42, 20),
  mealOption("lunch-14", "Mediterranean Chicken Pita", "Fresh and savory", 530, 39, 50, 16),
  mealOption("lunch-15", "Cottage Cheese Bowl + Wrap", "High protein and simple", 450, 33, 38, 12),
];

const snackOptions = [
  mealOption("snack-1", "Banana + Peanut Butter", "Quick pre-workout fuel", 290, 8, 34, 14),
  mealOption("snack-2", "Greek Yogurt + Granola", "Creamy and balanced", 260, 20, 28, 6),
  mealOption("snack-3", "Protein Shake", "Fast recovery snack", 220, 30, 10, 3),
  mealOption("snack-4", "Apple + Almonds", "Crunchy, easy to pack", 240, 6, 28, 11),
  mealOption("snack-5", "Rice Cakes + Honey + Turkey", "Light carb + protein combo", 280, 16, 34, 5),
  mealOption("snack-6", "Dates + Cottage Cheese", "Sweet and filling", 250, 18, 26, 6),
  mealOption("snack-7", "Hummus + Crackers", "Savory snack plate", 230, 8, 24, 11),
  mealOption("snack-8", "Edamame + Fruit", "Fiber-rich and portable", 240, 17, 22, 8),
  mealOption("snack-9", "Cheese Stick + Berries", "Small and easy", 180, 10, 14, 8),
  mealOption("snack-10", "Oats Bite + Yogurt", "Good if you need more carbs", 300, 18, 36, 8),
  mealOption("snack-11", "Tuna Packet + Crackers", "Protein-forward snack", 210, 22, 12, 5),
  mealOption("snack-12", "Fruit Smoothie", "Cool and quick", 270, 24, 30, 4),
  mealOption("snack-13", "Hard-Boiled Eggs + Toast", "Classic snack plate", 260, 18, 18, 12),
  mealOption("snack-14", "Protein Bar + Orange", "Convenient on the go", 250, 20, 28, 7),
  mealOption("snack-15", "Peanut Butter Toast", "Simple energy boost", 280, 10, 30, 12),
];

const dinnerOptions = [
  mealOption("dinner-1", "Salmon + Rice + Broccoli", "Balanced recovery meal", 620, 42, 54, 24),
  mealOption("dinner-2", "Chicken Breast + Sweet Potato", "Lean and reliable", 560, 48, 42, 14),
  mealOption("dinner-3", "Lean Beef Stir-Fry + Rice", "Higher energy dinner", 680, 45, 58, 26),
  mealOption("dinner-4", "Turkey Meatballs + Pasta", "Comforting and filling", 640, 40, 70, 18),
  mealOption("dinner-5", "Tofu Curry + Rice", "Plant-based dinner", 590, 30, 62, 20),
  mealOption("dinner-6", "Pork Tenderloin + Potatoes", "Simple roasted dinner", 610, 44, 40, 24),
  mealOption("dinner-7", "Shrimp Tacos + Slaw", "Lighter dinner option", 540, 36, 48, 18),
  mealOption("dinner-8", "Steak + Veggies + Quinoa", "Higher protein plate", 700, 50, 38, 30),
  mealOption("dinner-9", "Baked Chicken Thighs + Corn", "Rich and satisfying", 630, 43, 44, 28),
  mealOption("dinner-10", "Tilapia + Quinoa + Green Beans", "Light and clean", 560, 39, 46, 16),
  mealOption("dinner-11", "Chicken Fajita Bowl", "Big flavor, easy macros", 600, 45, 52, 20),
  mealOption("dinner-12", "Lamb Kebab + Rice", "Heavier dinner choice", 720, 42, 54, 32),
  mealOption("dinner-13", "Spaghetti + Turkey Sauce", "Family-style comfort", 670, 38, 78, 18),
  mealOption("dinner-14", "Chickpea Curry + Naan", "Vegetarian comfort meal", 610, 28, 76, 18),
  mealOption("dinner-15", "Sheet-Pan Sausage + Vegetables", "Low-fuss dinner", 650, 35, 34, 36),
];

const lateSnackOptions = [
  mealOption("late-snack-1", "Cottage Cheese + Berries", "High protein, light finish", 220, 22, 16, 6),
  mealOption("late-snack-2", "Casein Shake", "Slow-digesting recovery snack", 190, 30, 6, 2),
  mealOption("late-snack-3", "Greek Yogurt + Cinnamon", "Simple and calming", 180, 18, 12, 4),
  mealOption("late-snack-4", "Turkey Roll-Ups", "Low-carb savory bite", 170, 20, 4, 7),
  mealOption("late-snack-5", "Peanut Butter Toast", "If you need more calories", 230, 10, 22, 11),
  mealOption("late-snack-6", "Hard-Boiled Eggs", "Minimal prep", 160, 14, 2, 10),
  mealOption("late-snack-7", "Skyr + Walnuts", "Creamy with healthy fats", 210, 20, 10, 8),
  mealOption("late-snack-8", "Protein Pudding", "Dessert-style recovery snack", 200, 22, 14, 4),
  mealOption("late-snack-9", "Edamame Cup", "Warm or cold protein snack", 190, 16, 14, 8),
  mealOption("late-snack-10", "String Cheese + Apple", "Easy sweet-salty combo", 200, 10, 20, 9),
  mealOption("late-snack-11", "Tuna Salad Crackers", "Small but filling", 230, 20, 16, 9),
  mealOption("late-snack-12", "Almond Butter Rice Cake", "Light carb top-off", 210, 7, 22, 10),
  mealOption("late-snack-13", "Chocolate Milk + Protein", "Good post-training option", 240, 22, 24, 4),
  mealOption("late-snack-14", "Cottage Cheese + Pineapple", "Sweet, high-protein finish", 210, 20, 18, 4),
  mealOption("late-snack-15", "Small Smoothie", "Light and easy before bed", 230, 18, 26, 5),
];

const mealPlanSeed: MealPlanMeal[] = [
  {
    id: "breakfast",
    title: "Meal 1 - Breakfast",
    subtitle: "High-protein, energizing",
    options: breakfastOptions,
    selectedOptionId: "breakfast-1",
  },
  {
    id: "lunch",
    title: "Meal 2 - Lunch",
    subtitle: "Balanced and filling",
    options: lunchOptions,
    selectedOptionId: "lunch-1",
  },
  {
    id: "snack",
    title: "Meal 3 - Snack / Pre-Workout",
    subtitle: "Quick fuel",
    options: snackOptions,
    selectedOptionId: "snack-1",
  },
  {
    id: "dinner",
    title: "Meal 4 - Dinner",
    subtitle: "High-protein, lower-carb",
    options: dinnerOptions,
    selectedOptionId: "dinner-1",
  },
  {
    id: "late-snack",
    title: "Meal 5 - Late Snack (optional)",
    subtitle: "Protein-based recovery",
    options: lateSnackOptions,
    selectedOptionId: "late-snack-1",
  },
];

function createDefaultMealPlan() {
  return mealPlanSeed.map((meal) => ({
    ...meal,
    options: meal.options.map((option) => ({ ...option })),
  }));
}

function loadSettings() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function loadCompletion() {
  try {
    const saved = window.localStorage.getItem(completionStorageKey);
    return saved
      ? JSON.parse(saved) as { workouts?: Record<number, boolean>; pushups?: Record<number, boolean> }
      : {};
  } catch {
    return {};
  }
}

function loadWorkoutOverrides() {
  try {
    const saved = window.localStorage.getItem(workoutOverridesStorageKey);
    return saved ? JSON.parse(saved) as Record<number, WorkoutOverride> : {};
  } catch {
    return {};
  }
}

function loadCollapsedSections() {
  try {
    const saved = window.localStorage.getItem(collapsedSectionsStorageKey);
    return saved ? JSON.parse(saved) as Record<string, boolean> : {};
  } catch {
    return {};
  }
}

function loadMealPlan() {
  try {
    const saved = window.localStorage.getItem(mealPlanStorageKey);
    return saved ? JSON.parse(saved) as MealPlanMeal[] : createDefaultMealPlan();
  } catch {
    return createDefaultMealPlan();
  }
}

function toKg(pounds: number) {
  return pounds * 0.45359237;
}

function toCm(feet: number, inches: number) {
  return ((feet * 12) + inches) * 2.54;
}

function kgToLb(kg: number) {
  return kg / 0.45359237;
}

function formatPounds(value: number) {
  return `${value.toFixed(1)} lbs`;
}

function formatFeet(value: number) {
  return Number(value.toFixed(10)).toLocaleString(undefined, { maximumFractionDigits: 10 });
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(dateKey: string) {
  return new Intl.DateTimeFormat(undefined, { month: "numeric", day: "numeric", year: "numeric" }).format(new Date(`${dateKey}T00:00:00`));
}

function formatLongDate(dateKey: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function formatWeekday(dateKey: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(new Date(`${dateKey}T00:00:00`));
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function diffCalendarDates(startKey: string, endKey: string) {
  const start = new Date(`${startKey}T00:00:00`);
  const end = new Date(`${endKey}T00:00:00`);
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    days += daysInMonth(end.getFullYear(), end.getMonth() - 1);
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days };
}

function getAgeBreakdown(birthDate: string, ageOnDate: string) {
  const birth = new Date(`${birthDate}T00:00:00`);
  const target = new Date(`${ageOnDate}T00:00:00`);
  const milliseconds = Math.max(target.getTime() - birth.getTime(), 0);
  const totalDays = Math.floor(milliseconds / 86_400_000);
  const calendar = diffCalendarDates(birthDate, ageOnDate);
  const totalMonths = calendar.years * 12 + calendar.months;
  const weeks = Math.floor(totalDays / 7);
  const weekDays = totalDays % 7;
  let nextBirthday = new Date(target.getFullYear(), birth.getMonth(), birth.getDate());

  if (nextBirthday < target) {
    nextBirthday = new Date(target.getFullYear() + 1, birth.getMonth(), birth.getDate());
  }

  const daysUntilBirthday = Math.ceil((nextBirthday.getTime() - target.getTime()) / 86_400_000);

  return {
    ...calendar,
    totalMonths,
    totalDays,
    weeks,
    weekDays,
    hours: totalDays * 24,
    minutes: totalDays * 24 * 60,
    seconds: totalDays * 24 * 60 * 60,
    bornOn: formatLongDate(birthDate),
    ageOn: formatLongDate(ageOnDate),
    nextBirthday: formatLongDate(nextBirthday.toISOString().slice(0, 10)),
    daysUntilBirthday,
  };
}

function interpolateExerciseCalories(entry: ExerciseEntry, weight: number) {
  if (weight <= 125) return Math.round(entry.calories125 * (weight / 125));
  if (weight <= 155) return Math.round(entry.calories125 + ((entry.calories155 - entry.calories125) * (weight - 125)) / 30);
  if (weight <= 185) return Math.round(entry.calories155 + ((entry.calories185 - entry.calories155) * (weight - 155)) / 30);
  return Math.round(entry.calories185 * (weight / 185));
}

function getBmiClassification(bmi: number) {
  if (bmi < 16) return "Severe Thinness";
  if (bmi < 17) return "Moderate Thinness";
  if (bmi < 18.5) return "Mild Thinness";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  if (bmi < 35) return "Obese Class I";
  if (bmi < 40) return "Obese Class II";
  return "Obese Class III";
}

export default function AdminWeightTrackerPage() {
  const [settings, setSettings] = useState<WeightTrackerSettings>(loadSettings);
  const [completion] = useState(loadCompletion);
  const [completedWorkouts, setCompletedWorkouts] = useState<Record<number, boolean>>(completion.workouts ?? {});
  const [completedPushups, setCompletedPushups] = useState<Record<number, boolean>>(completion.pushups ?? {});
  const [workoutOverrides, setWorkoutOverrides] = useState<Record<number, WorkoutOverride>>(loadWorkoutOverrides);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(loadCollapsedSections);
  const [mealPlan, setMealPlan] = useState<MealPlanMeal[]>(loadMealPlan);
  const [editingWorkoutIndex, setEditingWorkoutIndex] = useState<number | null>(null);
  const [workoutDraft, setWorkoutDraft] = useState<WorkoutOverride | null>(null);
  const [mealOptionEditor, setMealOptionEditor] = useState<MealOptionEditor | null>(null);
  const [expandedMealOptions, setExpandedMealOptions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    window.localStorage.setItem(
      completionStorageKey,
      JSON.stringify({ workouts: completedWorkouts, pushups: completedPushups }),
    );
  }, [completedWorkouts, completedPushups]);

  useEffect(() => {
    window.localStorage.setItem(workoutOverridesStorageKey, JSON.stringify(workoutOverrides));
  }, [workoutOverrides]);

  useEffect(() => {
    window.localStorage.setItem(collapsedSectionsStorageKey, JSON.stringify(collapsedSections));
  }, [collapsedSections]);

  useEffect(() => {
    window.localStorage.setItem(mealPlanStorageKey, JSON.stringify(mealPlan));
  }, [mealPlan]);

  const weightKg = toKg(settings.weight);
  const heightCm = toCm(settings.feet, settings.inches);
  const totalHeightInches = settings.feet * 12 + settings.inches;
  const heightMeters = heightCm / 100;
  const bmi = settings.weight > 0 && heightMeters > 0 ? weightKg / (heightMeters ** 2) : 0;
  const bmiPrime = bmi / 25;
  const ponderalIndexMetric = heightMeters > 0 ? weightKg / (heightMeters ** 3) : 0;
  const healthyLow = kgToLb(18.5 * (heightMeters ** 2));
  const healthyHigh = kgToLb(25 * (heightMeters ** 2));
  const inchesOverFiveFeet = Math.max(totalHeightInches - 60, 0);
  const idealWeights = [
    {
      formula: "Robinson (1983)",
      value: settings.gender === "male"
        ? kgToLb(52 + 1.9 * inchesOverFiveFeet)
        : kgToLb(49 + 1.7 * inchesOverFiveFeet),
    },
    {
      formula: "Miller (1983)",
      value: settings.gender === "male"
        ? kgToLb(56.2 + 1.41 * inchesOverFiveFeet)
        : kgToLb(53.1 + 1.36 * inchesOverFiveFeet),
    },
    {
      formula: "Devine (1974)",
      value: settings.gender === "male"
        ? kgToLb(50 + 2.3 * inchesOverFiveFeet)
        : kgToLb(45.5 + 2.3 * inchesOverFiveFeet),
    },
    {
      formula: "Hamwi (1964)",
      value: settings.gender === "male"
        ? kgToLb(48 + 2.7 * inchesOverFiveFeet)
        : kgToLb(45.5 + 2.2 * inchesOverFiveFeet),
    },
  ];
  const leanBodyMassKg = weightKg * (1 - settings.bodyFat / 100);
  const bmr = useMemo(() => {
    if (settings.formula === "harris") {
      return settings.gender === "male"
        ? 13.397 * weightKg + 4.799 * heightCm - 5.677 * settings.age + 88.362
        : 9.247 * weightKg + 3.098 * heightCm - 4.33 * settings.age + 447.593;
    }

    if (settings.formula === "katch") {
      return 370 + 21.6 * leanBodyMassKg;
    }

    return settings.gender === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * settings.age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * settings.age - 161;
  }, [heightCm, leanBodyMassKg, settings.age, settings.formula, settings.gender, weightKg]);

  const maintenance = Math.round(bmr * Number(settings.activity));
  const resultMultiplier = settings.unit === "kilojoules" ? 4.184 : 1;
  const resultLabel = settings.unit === "kilojoules" ? "kJ/day" : "Calories/day";
  const selectedMacroPlan = macroPlans[settings.macroMode];
  const macroPercents = settings.macroMode === "custom"
    ? {
        protein: Math.max(0, settings.customProteinPercent),
        carbs: Math.max(0, settings.customCarbPercent),
        fat: Math.max(0, settings.customFatPercent),
      }
    : selectedMacroPlan;
  const macroPercentTotal = macroPercents.protein + macroPercents.carbs + macroPercents.fat;
  const macroScale = macroPercentTotal > 0 ? 100 / macroPercentTotal : 0;
  const macroCalories = {
    protein: maintenance * ((macroPercents.protein * macroScale) / 100),
    carbs: maintenance * ((macroPercents.carbs * macroScale) / 100),
    fat: maintenance * ((macroPercents.fat * macroScale) / 100),
  };
  const macroTargets = [
    {
      label: "Protein",
      value: Math.round(macroCalories.protein / 4),
      range: `${Math.round((maintenance * 0.1) / 4)} - ${Math.round((maintenance * 0.35) / 4)}`,
      unit: "grams/day",
    },
    {
      label: "Carbs",
      value: Math.round(macroCalories.carbs / 4),
      range: `${Math.round((maintenance * 0.45) / 4)} - ${Math.round((maintenance * 0.65) / 4)}`,
      unit: "grams/day",
    },
    {
      label: "Fat",
      value: Math.round(macroCalories.fat / 9),
      range: `${Math.round((maintenance * 0.2) / 9)} - ${Math.round((maintenance * 0.35) / 9)}`,
      unit: "grams/day",
    },
    {
      label: "Sugar",
      value: `<${Math.round((maintenance * 0.1) / 4)}`,
      range: "added sugar guideline",
      unit: "grams/day",
    },
    {
      label: "Saturated Fat",
      value: `<${Math.round((maintenance * 0.1) / 9)}`,
      range: "daily upper limit",
      unit: "grams/day",
    },
    {
      label: "Food Energy",
      value: maintenance.toLocaleString(),
      range: `${Math.round(maintenance * 4.184).toLocaleString()} kJ/day`,
      unit: "Calories/day",
    },
  ];
  const lengthConverted = settings.lengthUnit === "in-to-ft" ? settings.lengthAmount / 12 : settings.lengthAmount * 12;
  const lengthFromLabel = settings.lengthUnit === "in-to-ft" ? "inch" : "foot";
  const lengthToLabel = settings.lengthUnit === "in-to-ft" ? "foot" : "inch";
  const waterWeightKg = toKg(settings.weight);
  const waterActivityExtra = waterActivityOptions.find((option) => option.value === settings.waterActivity)?.extraMl ?? 0;
  const waterClimateExtra = waterClimateOptions.find((option) => option.value === settings.waterClimate)?.extraMl ?? 0;
  const waterMl = Math.max(500, Math.round(waterWeightKg * 35 + waterActivityExtra + waterClimateExtra));
  const waterLiters = waterMl / 1000;
  const waterOunces = waterMl / 29.5735;
  const waterGlasses = Math.ceil(waterOunces / 8);
  const waterBottles = Math.ceil(waterOunces / 16.9);
  const calorieTargets = [
    { label: "Maintain weight", note: "100%", value: maintenance },
    { label: "Mild weight loss", note: "0.5 lb/week", value: maintenance - 250 },
    { label: "Weight loss", note: "1 lb/week", value: maintenance - 500 },
    { label: "Extreme weight loss", note: "2 lb/week", value: maintenance - 1000 },
  ];

  const filteredFoods = foods.filter((food) => {
    const matchesCategory = settings.foodCategory === "All" || food.category === settings.foodCategory;
    const matchesSearch = food.name.toLowerCase().includes(settings.foodSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const selectedWorkoutTemplates = settings.workoutPlan === "circuit" ? circuitWorkoutTemplates : progressionWorkoutTemplates;
  const scheduledWorkouts = selectedWorkoutTemplates.map((workout, index) => ({
    ...workout,
    ...workoutOverrides[index],
    index,
    date: addDays(settings.startDate, workout.offset),
  }));
  const todayKey = new Date().toISOString().slice(0, 10);
  const currentWeekNumber = useMemo(() => {
    const start = new Date(`${settings.startDate}T00:00:00`);
    const today = new Date(`${todayKey}T00:00:00`);
    const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
    const resolvedWeek = Math.floor(daysSinceStart / 7) + 1;
    const lastWeek = Math.max(1, Math.max(...selectedWorkoutTemplates.map((workout) => Math.floor((workout.offset - 1) / 7) + 1)));
    return Math.min(Math.max(resolvedWeek, 1), lastWeek);
  }, [selectedWorkoutTemplates, settings.startDate, todayKey]);
  const workoutWeeks = Array.from(
    scheduledWorkouts.reduce((weeks, workout) => {
      const weekNumber = Math.floor((workout.offset - 1) / 7) + 1;
      const currentWeek = weeks.get(weekNumber) ?? [];
      currentWeek.push(workout);
      weeks.set(weekNumber, currentWeek);
      return weeks;
    }, new Map<number, typeof scheduledWorkouts>()),
  );
  const pushupLinkGroups = Array.from(
    scheduledWorkouts.reduce((groups, workout) => {
      if (!groups.has(workout.variation)) {
        groups.set(workout.variation, workout.pushupLink ?? "");
      }
      return groups;
    }, new Map<string, string>()),
  );
  const workoutTypeGroups = Array.from(
    scheduledWorkouts.reduce((groups, workout) => {
      if (!groups.has(workout.type)) {
        groups.set(workout.type, {
          exercises: workout.exercises,
          workoutLink: workout.workoutLink ?? "",
          workoutLink2: workout.workoutLink2 ?? "",
        });
      }
      return groups;
    }, new Map<string, { exercises: string; workoutLink: string; workoutLink2: string }>()),
  );

  const updateSetting = <K extends keyof WeightTrackerSettings>(key: K, value: WeightTrackerSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const isCollapsed = (key: string) => !!collapsedSections[key];

  const isWorkoutWeekCollapsed = (weekNumber: number) => {
    const key = `workout-week-${weekNumber}`;
    const saved = collapsedSections[key];
    if (typeof saved === "boolean") {
      return saved;
    }

    return weekNumber !== currentWeekNumber;
  };

  const toggleCollapsed = (key: string) => {
    setCollapsedSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const collapseHeading = (key: string, label: string) => (
    <button
      type="button"
      className="weight-tracker__collapse-heading"
      aria-expanded={!isCollapsed(key)}
      onClick={() => toggleCollapsed(key)}
    >
      {isCollapsed(key) ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
      <span>{label}</span>
    </button>
  );

  const createEmptyMealOptionDraft = (): Omit<MealPlanOption, "id"> => ({
    title: "",
    focus: "",
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    notes: "",
  });

  const toggleMealOptionExpanded = (mealId: MealPlanMealId, optionId: string) => {
    setExpandedMealOptions((current) => ({
      ...current,
      [`${mealId}:${optionId}`]: !current[`${mealId}:${optionId}`],
    }));
  };

  const startMealOptionAdd = (mealId: MealPlanMealId) => {
    setMealOptionEditor({ mealId, draft: createEmptyMealOptionDraft() });
  };

  const startMealOptionEdit = (mealId: MealPlanMealId, option: MealPlanOption) => {
    setMealOptionEditor({
      mealId,
      optionId: option.id,
      draft: {
        title: option.title,
        focus: option.focus,
        calories: option.calories,
        protein: option.protein,
        carbs: option.carbs,
        fats: option.fats,
        notes: option.notes ?? "",
      },
    });
  };

  const cancelMealOptionEdit = () => {
    setMealOptionEditor(null);
  };

  const saveMealOptionEdit = () => {
    if (!mealOptionEditor || !mealOptionEditor.draft.title.trim()) {
      return;
    }

    setMealPlan((current) => current.map((meal) => {
      if (meal.id !== mealOptionEditor.mealId) {
        return meal;
      }

      if (mealOptionEditor.optionId) {
        return {
          ...meal,
          options: meal.options.map((option) => option.id === mealOptionEditor.optionId
            ? { ...option, ...mealOptionEditor.draft, notes: mealOptionEditor.draft.notes?.trim() || undefined }
            : option),
        };
      }

      const nextId = `${meal.id}-${Date.now().toString(36)}`;
      return {
        ...meal,
        options: [...meal.options, { id: nextId, ...mealOptionEditor.draft, notes: mealOptionEditor.draft.notes?.trim() || undefined }],
        selectedOptionId: meal.selectedOptionId || nextId,
      };
    }));

    setMealOptionEditor(null);
  };

  const deleteMealOption = (mealId: MealPlanMealId, optionId: string) => {
    setMealPlan((current) => current.map((meal) => {
      if (meal.id !== mealId) {
        return meal;
      }

      const nextOptions = meal.options.filter((option) => option.id !== optionId);
      return {
        ...meal,
        options: nextOptions,
        selectedOptionId: meal.selectedOptionId === optionId ? nextOptions[0]?.id ?? "" : meal.selectedOptionId,
      };
    }));

    if (mealOptionEditor?.mealId === mealId && mealOptionEditor.optionId === optionId) {
      cancelMealOptionEdit();
    }
  };

  const selectMealOption = (mealId: MealPlanMealId, optionId: string) => {
    setMealPlan((current) => current.map((meal) => meal.id === mealId ? { ...meal, selectedOptionId: optionId } : meal));
  };

  const ageBreakdown = useMemo(
    () => getAgeBreakdown(settings.birthDate, settings.ageOnDate),
    [settings.ageOnDate, settings.birthDate],
  );

  const mealPlanSelectedOptions = useMemo(() => mealPlan.map((meal) => meal.options.find((option) => option.id === meal.selectedOptionId) ?? meal.options[0]).filter(Boolean) as MealPlanOption[], [mealPlan]);
  const mealPlanTotals = useMemo(() => mealPlanSelectedOptions.reduce((totals, option) => ({
    calories: totals.calories + option.calories,
    protein: totals.protein + option.protein,
    carbs: totals.carbs + option.carbs,
    fats: totals.fats + option.fats,
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 }), [mealPlanSelectedOptions]);

  // Sync numeric `age` into the live calculator when ageMode uses dates
  useEffect(() => {
    if (settings.ageMode === "age") {
      if (settings.age !== ageBreakdown.years) {
        updateSetting("age", ageBreakdown.years);
      }
    }
  // intentionally depend on these date fields and mode
  }, [ageBreakdown, settings.ageMode]);

  const startWorkoutEdit = (workout: WorkoutTemplate & { index: number }) => {
    setEditingWorkoutIndex(workout.index);
    setWorkoutDraft({
      type: workout.type,
      exercises: workout.exercises,
      workoutLink: workout.workoutLink ?? "",
      workoutLink2: workout.workoutLink2 ?? "",
      variation: workout.variation,
      level: workout.level,
      pushups: workout.pushups,
      pushupLink: workout.pushupLink ?? "",
    });
  };

  const cancelWorkoutEdit = () => {
    setEditingWorkoutIndex(null);
    setWorkoutDraft(null);
  };

  const saveWorkoutEdit = () => {
    if (editingWorkoutIndex == null || !workoutDraft) {
      return;
    }

    setWorkoutOverrides((current) => ({
      ...current,
      [editingWorkoutIndex]: workoutDraft,
    }));
    cancelWorkoutEdit();
  };

  const updatePushupLinkForVariation = (variation: string, pushupLink: string) => {
    setWorkoutOverrides((current) => {
      const next = { ...current };

      selectedWorkoutTemplates.forEach((workout, index) => {
        const currentVariation = current[index]?.variation ?? workout.variation;

        if (currentVariation === variation) {
          next[index] = {
            ...current[index],
            pushupLink,
          };
        }
      });

      return next;
    });
  };

  const updateWorkoutTypeGroup = (
    type: string,
    field: "exercises" | "workoutLink" | "workoutLink2",
    value: string,
  ) => {
    setWorkoutOverrides((current) => {
      const next = { ...current };

      selectedWorkoutTemplates.forEach((workout, index) => {
        const currentType = current[index]?.type ?? workout.type;

        if (currentType === type) {
          next[index] = {
            ...current[index],
            [field]: value,
          };
        }
      });

      return next;
    });
  };

  return (
    <div className="admin-panel-stack weight-tracker">
      <section className="admin-panel admin-panel--hero">
        <p className="admin-panel__eyebrow">Admin Only</p>
        <div className="admin-panel__title-row">
          <Scale size={20} />
          <h2>Weight & Workout Tracker</h2>
        </div>
        <p>Live calorie math, food references, exercise burn estimates, and a start-date-driven workout plan.</p>
      </section>

      <div className="weight-tracker__grid">
        <section className="admin-panel">
          <div className="admin-panel__title-row">
            <Flame size={18} />
            <h2>Live Calculator</h2>
          </div>
          <div className="weight-tracker__calculator-stack">
            <div className="weight-tracker__calculator-group">
              {collapseHeading("live-age", "Age Calculator")}
              {!isCollapsed("live-age") ? <div className="weight-tracker__form-grid">
                <Select
                  label="Calculate"
                  value={settings.ageMode}
                  onChange={(event) => updateSetting("ageMode", event.target.value as AgeCalculateMode)}
                  options={[
                    { value: "age", label: "Age" },
                    { value: "time-between", label: "Time between dates" },
                  ]}
                />
                <Input label="Date of Birth" type="date" value={settings.birthDate} onChange={(event) => updateSetting("birthDate", event.target.value)} />
                <Input label="Find Age On" type="date" value={settings.ageOnDate} onChange={(event) => updateSetting("ageOnDate", event.target.value)} />
              </div> : null}
            </div>

            <div className="weight-tracker__calculator-group">
              {collapseHeading("live-body", "Body Details")}
              {!isCollapsed("live-body") ? <div className="weight-tracker__form-grid">
                <Input label="Age" type="number" value={Math.floor(settings.age)} onChange={(event) => updateSetting("age", Math.floor(Number(event.target.value)))} />
                <div>
                  <span className="ui-input-label">Gender</span>
                  <div className="weight-tracker__radio-row">
                    <label className="weight-tracker__radio"><input type="radio" checked={settings.gender === "male"} onChange={() => updateSetting("gender", "male")} /> Male</label>
                    <label className="weight-tracker__radio"><input type="radio" checked={settings.gender === "female"} onChange={() => updateSetting("gender", "female")} /> Female</label>
                  </div>
                </div>
                <div className="weight-tracker__form-row">
                  <Input label="Feet" type="number" value={settings.feet} onChange={(event) => updateSetting("feet", Number(event.target.value))} />
                  <Input label="Inches" type="number" value={settings.inches} onChange={(event) => updateSetting("inches", Number(event.target.value))} />
                </div>
                <Input label="Weight" type="number" suffix="lb" value={settings.weight} onChange={(event) => updateSetting("weight", Number(event.target.value))} />
              </div> : null}
            </div>

            <div className="weight-tracker__calculator-group">
              {collapseHeading("live-calories", "Calorie Settings")}
              {!isCollapsed("live-calories") ? <div className="weight-tracker__form-grid">
                <Select label="Activity" value={settings.activity} onChange={(event) => updateSetting("activity", event.target.value)} options={activityOptions} />
                <Select
                  label="Formula"
                  value={settings.formula}
                  onChange={(event) => updateSetting("formula", event.target.value as Formula)}
                  options={[
                    { value: "mifflin", label: "Mifflin St Jeor" },
                    { value: "harris", label: "Revised Harris-Benedict" },
                    { value: "katch", label: "Katch-McArdle" },
                  ]}
                />
                <Input label="Body Fat" type="number" suffix="%" value={settings.bodyFat} onChange={(event) => updateSetting("bodyFat", Number(event.target.value))} />
                <Select
                  label="Result Unit"
                  value={settings.unit}
                  onChange={(event) => updateSetting("unit", event.target.value as ResultUnit)}
                  options={[
                    { value: "calories", label: "Calories" },
                    { value: "kilojoules", label: "Kilojoules" },
                  ]}
                />
              </div> : null}
            </div>

            <div className="weight-tracker__calculator-group">
              {collapseHeading("live-macros", "Macros")}
              {!isCollapsed("live-macros") ? <div className="weight-tracker__form-grid">
                <Select
                  label="Macro Plan"
                  value={settings.macroMode}
                  onChange={(event) => updateSetting("macroMode", event.target.value as MacroMode)}
                  options={Object.entries(macroPlans).map(([value, plan]) => ({ value, label: plan.label }))}
                />
                {settings.macroMode === "custom" ? (
                  <>
                    <Input label="Protein %" type="number" value={settings.customProteinPercent} onChange={(event) => updateSetting("customProteinPercent", Number(event.target.value))} />
                    <Input label="Carbs %" type="number" value={settings.customCarbPercent} onChange={(event) => updateSetting("customCarbPercent", Number(event.target.value))} />
                    <Input label="Fat %" type="number" value={settings.customFatPercent} onChange={(event) => updateSetting("customFatPercent", Number(event.target.value))} />
                  </>
                ) : null}
              </div> : null}
            </div>

            <div className="weight-tracker__calculator-group">
              {collapseHeading("live-length", "Length Conversion")}
              {!isCollapsed("live-length") ? <div className="weight-tracker__form-grid">
                <Input label="Length" type="number" value={settings.lengthAmount} onChange={(event) => updateSetting("lengthAmount", Number(event.target.value))} />
                <Select
                  label="Convert"
                  value={settings.lengthUnit}
                  onChange={(event) => updateSetting("lengthUnit", event.target.value as LengthUnit)}
                  options={[
                    { value: "in-to-ft", label: "Inches to feet" },
                    { value: "ft-to-in", label: "Feet to inches" },
                  ]}
                />
              </div> : null}
            </div>

            <div className="weight-tracker__calculator-group">
              {collapseHeading("live-water", "Water Intake")}
              {!isCollapsed("live-water") ? <div className="weight-tracker__form-grid">
                {/* Uses overall `weight` for water calculation */}
                <Select
                  label="Water Activity"
                  value={settings.waterActivity}
                  onChange={(event) => updateSetting("waterActivity", event.target.value as WaterActivity)}
                  options={waterActivityOptions.map((option) => ({ value: option.value, label: option.label }))}
                />
                <Select
                  label="Water Climate"
                  value={settings.waterClimate}
                  onChange={(event) => updateSetting("waterClimate", event.target.value as WaterClimate)}
                  options={waterClimateOptions.map((option) => ({ value: option.value, label: option.label }))}
                />
              </div> : null}
            </div>
          </div>
        </section>

        <section className="admin-panel weight-tracker__results">
          <div className="admin-panel__title-row">
            <Activity size={18} />
            <h2>Real-Time Results</h2>
          </div>
          <div className="weight-tracker__result-group">
            {collapseHeading("results-calories", "Calorie Targets")}
            {!isCollapsed("results-calories") ? calorieTargets.map((target, index) => (
              <div key={target.label} className={`weight-tracker__result-card ${index === 0 ? "is-maintain" : ""}`}>
                <div>
                  <strong>{Math.max(0, Math.round(target.value * resultMultiplier)).toLocaleString()}</strong>
                  <span> {resultLabel}</span>
                  <small>{target.note}</small>
                </div>
                <span>{target.label}</span>
              </div>
            )) : null}
          </div>
          <div className="weight-tracker__result-group">
            {collapseHeading("results-body", "Body Results")}
            {!isCollapsed("results-body") ? <div className="weight-tracker__macro-grid">
              <div className="weight-tracker__macro-card"><strong>{Math.round(bmr).toLocaleString()}</strong><span>BMR calories/day</span></div>
              <div className="weight-tracker__macro-card"><strong>{Math.round(weightKg)}</strong><span>kg body weight</span></div>
              <div className="weight-tracker__macro-card"><strong>{Math.round(heightCm)}</strong><span>cm height</span></div>
            </div> : null}
          </div>
          <div className="weight-tracker__result-group">
            {collapseHeading("results-bmi", "BMI & Ideal Weight")}
            {!isCollapsed("results-bmi") ? <div className="weight-tracker__body-grid">
              <div className="weight-tracker__bmi-card">
                <span>BMI</span>
                <strong>{bmi.toFixed(1)} kg/m²</strong>
                <em>{getBmiClassification(bmi)}</em>
                <div className="weight-tracker__bmi-meter" aria-hidden="true">
                  <span style={{ left: `${Math.min(Math.max((bmi / 45) * 100, 0), 100)}%` }} />
                </div>
                <p>Healthy BMI range: 18.5 - 25 kg/m²</p>
                <p>Healthy weight for this height: {formatPounds(healthyLow)} - {formatPounds(healthyHigh)}</p>
                <p>BMI Prime: {bmiPrime.toFixed(2)}</p>
                <p>Ponderal Index: {ponderalIndexMetric.toFixed(1)} kg/m³</p>
              </div>

              <div className="weight-tracker__ideal-card">
                <span>Ideal weight formulas</span>
                {idealWeights.map((entry) => (
                  <div key={entry.formula} className="weight-tracker__ideal-row">
                    <strong>{entry.formula}</strong>
                    <span>{formatPounds(entry.value)}</span>
                  </div>
                ))}
                <div className="weight-tracker__ideal-row is-range">
                  <strong>Healthy BMI Range</strong>
                  <span>{formatPounds(healthyLow)} - {formatPounds(healthyHigh)}</span>
                </div>
              </div>
            </div> : null}
          </div>
          <div className="weight-tracker__result-group">
            {collapseHeading("results-age", "Age Results")}
            {!isCollapsed("results-age") ? <div className="weight-tracker__age-answer">
              <div>
                <span>Age</span>
                <strong>{ageBreakdown.years} years {ageBreakdown.months} months {ageBreakdown.days} days</strong>
              </div>
              <p>Born on: {ageBreakdown.bornOn}</p>
              <p>Age on: {ageBreakdown.ageOn}</p>
              <hr />
              <p>{ageBreakdown.years + (ageBreakdown.months / 12).toFixed(3).slice(1)} years</p>
              <p>{ageBreakdown.years} years {ageBreakdown.months} months {ageBreakdown.days} days</p>
              <p>{ageBreakdown.totalMonths} months {ageBreakdown.days} days</p>
              <p>{ageBreakdown.weeks.toLocaleString()} weeks {ageBreakdown.weekDays} days</p>
              <p>{ageBreakdown.totalDays.toLocaleString()} days</p>
              <hr />
              <p>≈ {ageBreakdown.hours.toLocaleString()} hours</p>
              <p>≈ {ageBreakdown.minutes.toLocaleString()} minutes</p>
              <p>≈ {ageBreakdown.seconds.toLocaleString()} seconds</p>
              <hr />
              <strong>{ageBreakdown.daysUntilBirthday.toLocaleString()} days until next birthday or anniversary</strong>
              <p>{ageBreakdown.nextBirthday}</p>
            </div> : null}
          </div>
          <div className="weight-tracker__result-group">
            {collapseHeading("results-macros", "Macro Targets")}
            {!isCollapsed("results-macros") ? <div className="weight-tracker__macro-results">
              {macroTargets.map((target) => (
                <div key={target.label} className="weight-tracker__macro-result">
                  <span>{target.label}</span>
                  <strong>{target.value} <em>{target.unit}</em></strong>
                  <small>{target.range}</small>
                </div>
              ))}
            </div> : null}
          </div>
          <div className="weight-tracker__result-group">
            {collapseHeading("results-utility", "Utility Results")}
            {!isCollapsed("results-utility") ? <div className="weight-tracker__results-row">
              <div className="weight-tracker__conversion-answer">
                <span>Length Conversion</span>
                <strong>{formatFeet(settings.lengthAmount)} {lengthFromLabel} = {formatFeet(lengthConverted)} {lengthToLabel}</strong>
              </div>
              <div className="weight-tracker__water-result">
                <span>Daily Water Recommendation</span>
                <strong>At least {waterGlasses.toLocaleString()} glasses everyday.</strong>
                <p><b>{waterLiters.toFixed(1)} litres</b> [{waterOunces.toFixed(1)} ounces] of water.</p>
                <p>That is about <b>{waterBottles.toLocaleString()} bottles</b> if each bottle is 16.9 oz.</p>
              </div>
            </div> : null}
          </div>
        </section>
      </div>

      <section className="admin-panel weight-tracker__references">
        <div className="weight-tracker__panel-heading">
          <div className="admin-panel__title-row">
            <Utensils size={18} />
            <h2>Food Reference</h2>
          </div>
          <button type="button" className="weight-tracker__collapse-icon" aria-expanded={!isCollapsed("panel-food")} onClick={() => toggleCollapsed("panel-food")}>
            {isCollapsed("panel-food") ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
        {!isCollapsed("panel-food") ? (
          <>
            <div className="weight-tracker__reference-controls">
              <Input label="Search food" value={settings.foodSearch} onChange={(event) => updateSetting("foodSearch", event.target.value)} />
              <Select label="Category" value={settings.foodCategory} onChange={(event) => updateSetting("foodCategory", event.target.value)} options={foodCategories.map((category) => ({ value: category, label: category }))} />
            </div>
            <div className="weight-tracker__food-grid">
              {filteredFoods.map((food) => (
                <div key={`${food.category}-${food.name}`} className="weight-tracker__food-card">
                  <strong>{food.name}</strong>
                  <span>{food.serving}</span>
                  <div className="weight-tracker__food-meta">
                    <span className="weight-tracker__chip">{food.calories} cal</span>
                    <span className="weight-tracker__chip">{food.kj} kJ</span>
                    <span className="weight-tracker__chip">{food.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </section>

      <section className="admin-panel weight-tracker__meal-plan">
        <div className="weight-tracker__panel-heading">
          <div className="admin-panel__title-row">
            <Utensils size={18} />
            <h2>Meal Plan</h2>
          </div>
          <button type="button" className="weight-tracker__collapse-icon" aria-expanded={!isCollapsed("panel-meal-plan")} onClick={() => toggleCollapsed("panel-meal-plan")}>
            {isCollapsed("panel-meal-plan") ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
        {!isCollapsed("panel-meal-plan") ? (
          <>
            <div className="weight-tracker__meal-summary-grid">
              <div className="weight-tracker__meal-summary-card is-total">
                <strong>{mealPlanTotals.calories.toLocaleString()} kcal</strong>
                <span>Total selected calories</span>
              </div>
              <div className="weight-tracker__meal-summary-card">
                <strong>{mealPlanTotals.protein}g</strong>
                <span>Protein</span>
              </div>
              <div className="weight-tracker__meal-summary-card">
                <strong>{mealPlanTotals.carbs}g</strong>
                <span>Carbs</span>
              </div>
              <div className="weight-tracker__meal-summary-card">
                <strong>{mealPlanTotals.fats}g</strong>
                <span>Fats</span>
              </div>
            </div>

            <div className="weight-tracker__meal-grid">
              {mealPlan.map((meal) => {
                const activeOption = meal.options.find((option) => option.id === meal.selectedOptionId) ?? meal.options[0];
                const mealCollapsed = isMealPlanCollapsed(meal.id);
                const editorIsHere = mealOptionEditor?.mealId === meal.id;

                return (
                  <article key={meal.id} className={`weight-tracker__meal-card ${mealCollapsed ? "is-collapsed" : ""}`}>
                    <div className="weight-tracker__meal-card-top">
                      {collapseHeading(`meal-${meal.id}`, meal.title)}
                      <Select
                        label="Current pick"
                        value={meal.selectedOptionId}
                        onChange={(event) => selectMealOption(meal.id, event.target.value)}
                        options={meal.options.map((option) => ({ value: option.id, label: option.title }))}
                      />
                    </div>
                    <p className="weight-tracker__meal-card-subtitle">{meal.subtitle}</p>
                    {!mealCollapsed ? (
                      <>
                        <div className="weight-tracker__meal-active">
                          <strong>{activeOption.title}</strong>
                          <span>{activeOption.focus}</span>
                          <div className="weight-tracker__meal-active-meta">
                            <span>{activeOption.calories} kcal</span>
                            <span>{activeOption.protein}g protein</span>
                            <span>{activeOption.carbs}g carbs</span>
                            <span>{activeOption.fats}g fats</span>
                          </div>
                        </div>

                        <div className="weight-tracker__meal-options">
                          <div className="weight-tracker__meal-options-head">
                            <span>Option</span>
                            <span>Focus</span>
                            <span>Calories</span>
                            <span>Protein</span>
                            <span>Carbs</span>
                            <span>Fats</span>
                            <span>Actions</span>
                          </div>
                          {meal.options.map((option) => {
                            const optionKey = `${meal.id}:${option.id}`;
                            const isExpanded = !!expandedMealOptions[optionKey];
                            const isSelected = meal.selectedOptionId === option.id;

                            return (
                              <div key={option.id} className={`weight-tracker__meal-option ${isSelected ? "is-selected" : ""}`}>
                                <span className="weight-tracker__meal-option-title">{option.title}</span>
                                <span>{option.focus}</span>
                                <span>{option.calories} kcal</span>
                                <span>{option.protein}g</span>
                                <span>{option.carbs}g</span>
                                <span>{option.fats}g</span>
                                <div className="weight-tracker__meal-option-actions">
                                  <Button type="button" size="sm" variant="ghost" onClick={() => toggleMealOptionExpanded(meal.id, option.id)}>
                                    {isExpanded ? "Hide" : "View"}
                                  </Button>
                                  <Button type="button" size="sm" variant="ghost" onClick={() => startMealOptionEdit(meal.id, option)}>
                                    Edit
                                  </Button>
                                  <Button type="button" size="sm" variant="ghost" onClick={() => deleteMealOption(meal.id, option.id)}>
                                    Delete
                                  </Button>
                                </div>
                                {isExpanded ? (
                                  <div className="weight-tracker__meal-option-details">
                                    <p>{option.notes || "No notes added yet."}</p>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>

                        {editorIsHere ? (
                          <div className="weight-tracker__meal-editor">
                            <div className="weight-tracker__form-grid">
                              <Input label="Meal option" value={mealOptionEditor.draft.title} onChange={(event) => setMealOptionEditor((current) => current ? { ...current, draft: { ...current.draft, title: event.target.value } } : current)} />
                              <Input label="Focus" value={mealOptionEditor.draft.focus} onChange={(event) => setMealOptionEditor((current) => current ? { ...current, draft: { ...current.draft, focus: event.target.value } } : current)} />
                              <Input label="Calories" type="number" value={mealOptionEditor.draft.calories} onChange={(event) => setMealOptionEditor((current) => current ? { ...current, draft: { ...current.draft, calories: Number(event.target.value) } } : current)} />
                              <Input label="Protein (g)" type="number" value={mealOptionEditor.draft.protein} onChange={(event) => setMealOptionEditor((current) => current ? { ...current, draft: { ...current.draft, protein: Number(event.target.value) } } : current)} />
                              <Input label="Carbs (g)" type="number" value={mealOptionEditor.draft.carbs} onChange={(event) => setMealOptionEditor((current) => current ? { ...current, draft: { ...current.draft, carbs: Number(event.target.value) } } : current)} />
                              <Input label="Fats (g)" type="number" value={mealOptionEditor.draft.fats} onChange={(event) => setMealOptionEditor((current) => current ? { ...current, draft: { ...current.draft, fats: Number(event.target.value) } } : current)} />
                              <Textarea label="Notes" rows={4} value={mealOptionEditor.draft.notes ?? ""} onChange={(event) => setMealOptionEditor((current) => current ? { ...current, draft: { ...current.draft, notes: event.target.value } } : current)} />
                            </div>
                            <div className="weight-tracker__toggle-row">
                              <Button type="button" size="sm" icon={<Save size={15} />} onClick={saveMealOptionEdit}>Save option</Button>
                              <Button type="button" size="sm" variant="ghost" icon={<X size={15} />} onClick={cancelMealOptionEdit}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="weight-tracker__meal-actions">
                            <Button type="button" size="sm" variant="ghost" icon={<Pencil size={15} />} onClick={() => startMealOptionAdd(meal.id)}>
                              Add option
                            </Button>
                          </div>
                        )}
                      </>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </>
        ) : null}
      </section>

      <section className="admin-panel weight-tracker__references">
        <div className="weight-tracker__panel-heading">
          <div className="admin-panel__title-row">
            <Dumbbell size={18} />
            <h2>Exercise Burn Estimate</h2>
          </div>
          <button type="button" className="weight-tracker__collapse-icon" aria-expanded={!isCollapsed("panel-exercise-burn")} onClick={() => toggleCollapsed("panel-exercise-burn")}>
            {isCollapsed("panel-exercise-burn") ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
        {!isCollapsed("panel-exercise-burn") ? (
          <div className="weight-tracker__exercise-grid">
            {exercises.map((exercise) => (
              <div key={exercise.activity} className="weight-tracker__exercise-card">
                <strong>{exercise.activity}</strong>
                <span>1 hour estimate at your current weight</span>
                <div className="weight-tracker__exercise-meta">
                  <span className="weight-tracker__chip">{interpolateExerciseCalories(exercise, settings.weight).toLocaleString()} cal</span>
                  <span className="weight-tracker__chip">125 lb: {exercise.calories125}</span>
                  <span className="weight-tracker__chip">155 lb: {exercise.calories155}</span>
                  <span className="weight-tracker__chip">185 lb: {exercise.calories185}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="admin-panel weight-tracker__plan">
        <div className="weight-tracker__plan-head">
          <div className="admin-panel__title-row">
            <CalendarDays size={18} />
            <h2>Exercise Plan</h2>
          </div>
          <Select
            label="Plan"
            value={settings.workoutPlan}
            onChange={(event) => updateSetting("workoutPlan", event.target.value as WorkoutPlanMode)}
            options={[
              { value: "progression", label: "Original Dumbbell + Pushup Progression" },
              { value: "circuit", label: "Bodyweight Circuit Plan" },
            ]}
          />
          <Input label="Start Date" type="date" value={settings.startDate} onChange={(event) => updateSetting("startDate", event.target.value)} />
        </div>
        <div className="weight-tracker__batch-links">
          {collapseHeading("plan-workout-types", "Batch Edit Workout Types")}
          {!isCollapsed("plan-workout-types") ? (
            <div className="weight-tracker__batch-workout-grid">
              {workoutTypeGroups.map(([type, values]) => (
                <div key={type} className="weight-tracker__batch-workout-card">
                  <strong>{type}</strong>
                  <Input
                    label="Workout Link"
                    value={values.workoutLink}
                    onChange={(event) => updateWorkoutTypeGroup(type, "workoutLink", event.target.value)}
                  />
                  <Input
                    label="Workout Link 2"
                    value={values.workoutLink2}
                    onChange={(event) => updateWorkoutTypeGroup(type, "workoutLink2", event.target.value)}
                  />
                  <Textarea
                    label="Exercises"
                    rows={5}
                    value={values.exercises}
                    onChange={(event) => updateWorkoutTypeGroup(type, "exercises", event.target.value)}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="weight-tracker__batch-links">
          {collapseHeading("plan-pushup-links", "Batch Edit Pushup Links")}
          {!isCollapsed("plan-pushup-links") ? (
            <div className="weight-tracker__batch-link-grid">
              {pushupLinkGroups.map(([variation, pushupLink]) => (
                <Input
                  key={variation}
                  label={variation}
                  value={pushupLink}
                  onChange={(event) => updatePushupLinkForVariation(variation, event.target.value)}
                />
              ))}
            </div>
          ) : null}
        </div>
        <div className="weight-tracker__workout-list">
          {workoutWeeks.map(([weekNumber, workouts]) => {
            const collapsed = isWorkoutWeekCollapsed(weekNumber);

            return (
              <section
                key={weekNumber}
                className={`weight-tracker__workout-week ${weekNumber % 2 === 0 ? "is-even" : "is-odd"} ${weekNumber === currentWeekNumber ? "is-current" : ""} ${collapsed ? "is-collapsed" : ""}`}
              >
                <button
                  type="button"
                  className="weight-tracker__week-divider"
                  aria-expanded={!collapsed}
                  onClick={() => toggleCollapsed(`workout-week-${weekNumber}`)}
                >
                  <span>Week {weekNumber}</span>
                  <strong>{formatDate(workouts[0].date)} - {formatDate(workouts[workouts.length - 1].date)}</strong>
                  <span className="weight-tracker__week-divider-icon" aria-hidden="true">
                    {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>

                {!collapsed ? workouts.map((workout) => {
                  const isToday = workout.date === new Date().toISOString().slice(0, 10);
                  const workoutDone = !!completedWorkouts[workout.index];
                  const pushupsDone = !!completedPushups[workout.index];
                  const isEditing = editingWorkoutIndex === workout.index && workoutDraft;

                  return (
                    <article key={`${workout.offset}-${workout.variation}`} className={`weight-tracker__workout-card ${isToday ? "is-today" : ""}`}>
                      {isEditing ? (
                        <div className="weight-tracker__workout-edit">
                          <div className="weight-tracker__form-grid">
                            <Input label="Workout Type" value={workoutDraft.type ?? ""} onChange={(event) => setWorkoutDraft((draft) => draft ? { ...draft, type: event.target.value } : draft)} />
                            <Input label="Workout Link" value={workoutDraft.workoutLink ?? ""} onChange={(event) => setWorkoutDraft((draft) => draft ? { ...draft, workoutLink: event.target.value } : draft)} />
                            <Input label="Workout Link 2" value={workoutDraft.workoutLink2 ?? ""} onChange={(event) => setWorkoutDraft((draft) => draft ? { ...draft, workoutLink2: event.target.value } : draft)} />
                            <Textarea label="Exercises" rows={4} value={workoutDraft.exercises ?? ""} onChange={(event) => setWorkoutDraft((draft) => draft ? { ...draft, exercises: event.target.value } : draft)} />
                            <Input label="Pushup Variation" value={workoutDraft.variation ?? ""} onChange={(event) => setWorkoutDraft((draft) => draft ? { ...draft, variation: event.target.value } : draft)} />
                            <Input label="Pushup Link" value={workoutDraft.pushupLink ?? ""} onChange={(event) => setWorkoutDraft((draft) => draft ? { ...draft, pushupLink: event.target.value } : draft)} />
                            <Input label="Level" value={workoutDraft.level ?? ""} onChange={(event) => setWorkoutDraft((draft) => draft ? { ...draft, level: event.target.value } : draft)} />
                            <Textarea label="Pushups" rows={3} value={workoutDraft.pushups ?? ""} onChange={(event) => setWorkoutDraft((draft) => draft ? { ...draft, pushups: event.target.value } : draft)} />
                          </div>
                          <div className="weight-tracker__toggle-row">
                            <Button type="button" size="sm" icon={<Save size={15} />} onClick={saveWorkoutEdit}>Save</Button>
                            <Button type="button" size="sm" variant="ghost" icon={<X size={15} />} onClick={cancelWorkoutEdit}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="weight-tracker__workout-date">
                            <span>{formatWeekday(workout.date)}</span>
                            {isToday ? <em>Today</em> : null}
                          </div>
                          <div className={`weight-tracker__workout-block ${workoutDone ? "is-done" : ""}`}>
                            <div className="weight-tracker__workout-title-row">
                              <strong>{workout.type}</strong>
                              <span className="weight-tracker__workout-links">
                                {workout.workoutLink ? (
                                  <a href={workout.workoutLink} target="_blank" rel="noreferrer" aria-label={`${workout.type} link 1`}>
                                    <ExternalLink size={14} />
                                  </a>
                                ) : null}
                                {workout.workoutLink2 ? (
                                  <a href={workout.workoutLink2} target="_blank" rel="noreferrer" aria-label={`${workout.type} link 2`}>
                                    <ExternalLink size={14} />
                                  </a>
                                ) : null}
                              </span>
                            </div>
                            <p>{workout.exercises}</p>
                          </div>
                          <div className={`weight-tracker__workout-block ${pushupsDone ? "is-done" : ""}`}>
                            <div className="weight-tracker__workout-title-row">
                              <strong>{workout.variation}</strong>
                              {workout.pushupLink ? (
                                <a href={workout.pushupLink} target="_blank" rel="noreferrer" aria-label={`${workout.variation} link`}>
                                  <ExternalLink size={14} />
                                </a>
                              ) : null}
                            </div>
                            <div className="weight-tracker__level">{workout.level}</div>
                            <p>{workout.pushups}</p>
                          </div>
                          <div className="weight-tracker__toggle-row">
                            <Button type="button" size="sm" variant="ghost" icon={<Pencil size={15} />} onClick={() => startWorkoutEdit(workout)}>Edit</Button>
                            <Checkbox label="Workout done" checked={workoutDone} onChange={(event) => setCompletedWorkouts((current) => ({ ...current, [workout.index]: event.target.checked }))} />
                            <Checkbox label="Pushups done" checked={pushupsDone} onChange={(event) => setCompletedPushups((current) => ({ ...current, [workout.index]: event.target.checked }))} />
                          </div>
                        </>
                      )}
                    </article>
                  );
                }) : null}
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}
