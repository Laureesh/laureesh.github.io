import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, Dumbbell, Flame, Scale, Utensils } from "lucide-react";
import { Checkbox, Input, Select } from "../../components/ui";
import "./AdminWeightTrackerPage.css";

type Gender = "male" | "female";
type Formula = "mifflin" | "harris" | "katch";
type ResultUnit = "calories" | "kilojoules";

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
  variation: string;
  level: string;
  pushups: string;
}

const storageKey = "admin:weight-tracker";
const completionStorageKey = "admin:weight-tracker:completion";

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
};

const activityOptions = [
  { value: "1.2", label: "Sedentary" },
  { value: "1.375", label: "Light: exercise 1-3 times/week" },
  { value: "1.55", label: "Moderate: exercise 4-5 times/week" },
  { value: "1.725", label: "Active: daily exercise or intense 3-4 times/week" },
  { value: "1.9", label: "Very active: intense exercise 6-7 times/week" },
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

const workoutTemplates: WorkoutTemplate[] = [
  { offset: 1, type: "Full-Body Dumbbell Strength", exercises: "20 Min Full Body\nPlank Hold (30 or more)", variation: "#1 Wall Pushups", level: "Level 1", pushups: "2 Sets of 30 Pushups" },
  { offset: 3, type: "Cardio + Core Conditioning", exercises: "60-90 min Ride (10-15 miles)\n10 Min Dumbbell Standing Abs\nRussian Twists (10 per side/30s rest)\nLeg Raises (15 reps/30s rest)\nFlutter Kicks (30s/30s rest)", variation: "#1 Wall Pushups", level: "Level 2", pushups: "2 Sets of 50 Pushups" },
  { offset: 5, type: "Dumbbell Upper + Yoga Mobility", exercises: "20 Min Upper Body Dumbbell Workout At Home\n20 Min Yoga Routine for Athletes", variation: "#1 Wall Pushups", level: "Level 3", pushups: "3 Sets of 50 Pushups" },
  { offset: 8, type: "Full-Body Dumbbell Strength", exercises: "20 Min Full Body\nPlank Hold (30 or more)", variation: "#2 Incline Pushups", level: "Level 1", pushups: "2 Sets of 20 Pushups" },
  { offset: 10, type: "Cardio + Core Conditioning", exercises: "60-90 min Ride (10-15 miles)\n10 Min Dumbbell Standing Abs\nRussian Twists (10 per side/30s rest)\nLeg Raises (15 reps/30s rest)\nFlutter Kicks (30s/30s rest)", variation: "#2 Incline Pushups", level: "Level 2", pushups: "2 Sets of 30 Pushups" },
  { offset: 12, type: "Dumbbell Upper + Yoga Mobility", exercises: "20 Min Upper Body Dumbbell Workout At Home\n20 Min Yoga Routine for Athletes", variation: "#2 Incline Pushups", level: "Level 3", pushups: "3 Sets of 40 Pushups" },
  { offset: 15, type: "Full-Body Dumbbell Strength", exercises: "20 Min Full Body\nPlank Hold (30 or more)", variation: "#3 Advanced Incline Pushups", level: "Level 2", pushups: "2 Sets of 30 Pushups" },
  { offset: 17, type: "Cardio + Core Conditioning", exercises: "60-90 min Ride (10-15 miles)\n10 Min Dumbbell Standing Abs\nRussian Twists (10 per side/30s rest)\nLeg Raises (15 reps/30s rest)\nFlutter Kicks (30s/30s rest)", variation: "#3 Advanced Incline Pushups", level: "Level 3", pushups: "3 Sets of 35 Pushups" },
  { offset: 19, type: "Dumbbell Upper + Yoga Mobility", exercises: "20 Min Upper Body Dumbbell Workout At Home\n20 Min Yoga Routine for Athletes", variation: "#4 Knee Pushups", level: "Level 1", pushups: "2 Sets of 10 Pushups" },
  { offset: 22, type: "Full-Body Dumbbell Strength", exercises: "20 Min Full Body\nPlank Hold (30 or more)", variation: "#4 Knee Pushups", level: "Level 2", pushups: "2 Sets of 20 Pushups" },
  { offset: 24, type: "Cardio + Core Conditioning", exercises: "60-90 min Ride (10-15 miles)\n10 Min Dumbbell Standing Abs\nRussian Twists (10 per side/30s rest)\nLeg Raises (15 reps/30s rest)\nFlutter Kicks (30s/30s rest)", variation: "#4 Knee Pushups", level: "Level 3", pushups: "3 Sets of 30 Pushups" },
  { offset: 26, type: "Dumbbell Upper + Yoga Mobility", exercises: "20 Min Upper Body Dumbbell Workout At Home\n20 Min Yoga Routine for Athletes", variation: "#5 Full Pushups", level: "Level 1", pushups: "2 Sets of 5 Pushups" },
  { offset: 29, type: "Full-Body Dumbbell Strength", exercises: "20 Min Full Body\nPlank Hold (30 or more)", variation: "#5 Full Pushups", level: "Level 2", pushups: "2 Sets of 15 Pushups" },
  { offset: 31, type: "Cardio + Core Conditioning", exercises: "60-90 min Ride (10-15 miles)\n10 Min Dumbbell Standing Abs\nRussian Twists (10 per side/30s rest)\nLeg Raises (15 reps/30s rest)\nFlutter Kicks (30s/30s rest)", variation: "#5 Full Pushups", level: "Level 3", pushups: "3 Sets of 25 Pushups" },
  { offset: 33, type: "Dumbbell Upper + Yoga Mobility", exercises: "20 Min Upper Body Dumbbell Workout At Home\n20 Min Yoga Routine for Athletes", variation: "#6 Narrow Pushups", level: "Level 1", pushups: "2 Sets of 5 Pushups" },
  { offset: 36, type: "Full-Body Dumbbell Strength", exercises: "20 Min Full Body\nPlank Hold (30 or more)", variation: "#6 Narrow Pushups", level: "Level 2", pushups: "2 Sets of 10 Pushups" },
  { offset: 38, type: "Cardio + Core Conditioning", exercises: "60-90 min Ride (10-15 miles)\n10 Min Dumbbell Standing Abs\nRussian Twists (10 per side/30s rest)\nLeg Raises (15 reps/30s rest)\nFlutter Kicks (30s/30s rest)", variation: "#6 Narrow Pushups", level: "Level 3", pushups: "3 Sets of 20 Pushups" },
  { offset: 40, type: "Dumbbell Upper + Yoga Mobility", exercises: "20 Min Upper Body Dumbbell Workout At Home\n20 Min Yoga Routine for Athletes", variation: "#7 Side Staggered Pushups", level: "Level 1", pushups: "2 Sets of 5 Pushups (Per Side)" },
  { offset: 43, type: "Full-Body Dumbbell Strength", exercises: "20 Min Full Body\nPlank Hold (30 or more)", variation: "#7 Side Staggered Pushups", level: "Level 2", pushups: "2 Sets of 10 Pushups (Per Side)" },
  { offset: 45, type: "Cardio + Core Conditioning", exercises: "60-90 min Ride (10-15 miles)\n10 Min Dumbbell Standing Abs\nRussian Twists (10 per side/30s rest)\nLeg Raises (15 reps/30s rest)\nFlutter Kicks (30s/30s rest)", variation: "#7 Side Staggered Pushups", level: "Level 3", pushups: "2 Sets of 20 Pushups (Per Side)" },
  { offset: 47, type: "Dumbbell Upper + Yoga Mobility", exercises: "20 Min Upper Body Dumbbell Workout At Home\n20 Min Yoga Routine for Athletes", variation: "#8 Archer Pushups", level: "Level 1", pushups: "2 Sets of 5 Pushups (Per Side)" },
  { offset: 50, type: "Full-Body Dumbbell Strength", exercises: "20 Min Full Body\nPlank Hold (30 or more)", variation: "#8 Archer Pushups", level: "Level 2", pushups: "2 Sets of 9 Pushups (Per Side)" },
  { offset: 52, type: "Cardio + Core Conditioning", exercises: "60-90 min Ride (10-15 miles)\n10 Min Dumbbell Standing Abs\nRussian Twists (10 per side/30s rest)\nLeg Raises (15 reps/30s rest)\nFlutter Kicks (30s/30s rest)", variation: "#8 Archer Pushups", level: "Level 3", pushups: "2 Sets of 12 Pushups (Per Side)" },
];

const foodCategories = ["All", ...Array.from(new Set(foods.map((food) => food.category)))];

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

function toKg(pounds: number) {
  return pounds * 0.45359237;
}

function toCm(feet: number, inches: number) {
  return ((feet * 12) + inches) * 2.54;
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(dateKey: string) {
  return new Intl.DateTimeFormat(undefined, { month: "numeric", day: "numeric", year: "numeric" }).format(new Date(`${dateKey}T00:00:00`));
}

function interpolateExerciseCalories(entry: ExerciseEntry, weight: number) {
  if (weight <= 125) return Math.round(entry.calories125 * (weight / 125));
  if (weight <= 155) return Math.round(entry.calories125 + ((entry.calories155 - entry.calories125) * (weight - 125)) / 30);
  if (weight <= 185) return Math.round(entry.calories155 + ((entry.calories185 - entry.calories155) * (weight - 155)) / 30);
  return Math.round(entry.calories185 * (weight / 185));
}

export default function AdminWeightTrackerPage() {
  const [settings, setSettings] = useState<WeightTrackerSettings>(loadSettings);
  const [completion] = useState(loadCompletion);
  const [completedWorkouts, setCompletedWorkouts] = useState<Record<number, boolean>>(completion.workouts ?? {});
  const [completedPushups, setCompletedPushups] = useState<Record<number, boolean>>(completion.pushups ?? {});

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    window.localStorage.setItem(
      completionStorageKey,
      JSON.stringify({ workouts: completedWorkouts, pushups: completedPushups }),
    );
  }, [completedWorkouts, completedPushups]);

  const weightKg = toKg(settings.weight);
  const heightCm = toCm(settings.feet, settings.inches);
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

  const scheduledWorkouts = workoutTemplates.map((workout, index) => ({
    ...workout,
    index,
    date: addDays(settings.startDate, workout.offset),
  }));

  const updateSetting = <K extends keyof WeightTrackerSettings>(key: K, value: WeightTrackerSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
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
          <div className="weight-tracker__form-grid">
            <Input label="Age" type="number" value={settings.age} onChange={(event) => updateSetting("age", Number(event.target.value))} />
            <Select label="Activity" value={settings.activity} onChange={(event) => updateSetting("activity", event.target.value)} options={activityOptions} />
            <div>
              <span className="ui-input-label">Gender</span>
              <div className="weight-tracker__radio-row">
                <label className="weight-tracker__radio"><input type="radio" checked={settings.gender === "male"} onChange={() => updateSetting("gender", "male")} /> Male</label>
                <label className="weight-tracker__radio"><input type="radio" checked={settings.gender === "female"} onChange={() => updateSetting("gender", "female")} /> Female</label>
              </div>
            </div>
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
            <div className="weight-tracker__form-row">
              <Input label="Feet" type="number" value={settings.feet} onChange={(event) => updateSetting("feet", Number(event.target.value))} />
              <Input label="Inches" type="number" value={settings.inches} onChange={(event) => updateSetting("inches", Number(event.target.value))} />
            </div>
            <Input label="Weight" type="number" suffix="lb" value={settings.weight} onChange={(event) => updateSetting("weight", Number(event.target.value))} />
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
          </div>
        </section>

        <section className="admin-panel weight-tracker__results">
          <div className="admin-panel__title-row">
            <Activity size={18} />
            <h2>Real-Time Results</h2>
          </div>
          {calorieTargets.map((target, index) => (
            <div key={target.label} className={`weight-tracker__result-card ${index === 0 ? "is-maintain" : ""}`}>
              <div>
                <strong>{Math.max(0, Math.round(target.value * resultMultiplier)).toLocaleString()}</strong>
                <span> {resultLabel}</span>
                <small>{target.note}</small>
              </div>
              <span>{target.label}</span>
            </div>
          ))}
          <div className="weight-tracker__macro-grid">
            <div className="weight-tracker__macro-card"><strong>{Math.round(bmr).toLocaleString()}</strong><span>BMR calories/day</span></div>
            <div className="weight-tracker__macro-card"><strong>{Math.round(weightKg)}</strong><span>kg body weight</span></div>
            <div className="weight-tracker__macro-card"><strong>{Math.round(heightCm)}</strong><span>cm height</span></div>
          </div>
        </section>
      </div>

      <section className="admin-panel weight-tracker__references">
        <div className="admin-panel__title-row">
          <Utensils size={18} />
          <h2>Food Reference</h2>
        </div>
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
      </section>

      <section className="admin-panel weight-tracker__references">
        <div className="admin-panel__title-row">
          <Dumbbell size={18} />
          <h2>Exercise Burn Estimate</h2>
        </div>
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
      </section>

      <section className="admin-panel weight-tracker__plan">
        <div className="weight-tracker__plan-head">
          <div className="admin-panel__title-row">
            <CalendarDays size={18} />
            <h2>Exercise Plan</h2>
          </div>
          <Input label="Start Date" type="date" value={settings.startDate} onChange={(event) => updateSetting("startDate", event.target.value)} />
        </div>
        <div className="weight-tracker__workout-list">
          {scheduledWorkouts.map((workout) => (
            <article key={`${workout.offset}-${workout.variation}`} className="weight-tracker__workout-card">
              <div className="weight-tracker__workout-date">{formatDate(workout.date)}</div>
              <div>
                <strong>{workout.type}</strong>
                <p>{workout.exercises}</p>
              </div>
              <div>
                <strong>{workout.variation}</strong>
                <div className="weight-tracker__level">{workout.level}</div>
                <p>{workout.pushups}</p>
              </div>
              <div className="weight-tracker__toggle-row">
                <Checkbox label="Workout done" checked={!!completedWorkouts[workout.index]} onChange={(event) => setCompletedWorkouts((current) => ({ ...current, [workout.index]: event.target.checked }))} />
                <Checkbox label="Pushups done" checked={!!completedPushups[workout.index]} onChange={(event) => setCompletedPushups((current) => ({ ...current, [workout.index]: event.target.checked }))} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
