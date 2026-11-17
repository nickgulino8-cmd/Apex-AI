export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "quadriceps",
  "hamstrings",
  "glutes",
  "calves",
  "abdominals",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const GROUP_LABEL: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  quadriceps: "Quadriceps",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  abdominals: "Abdominals",
};

export const EQUIPMENT = ["bodyweight", "dumbbell", "barbell", "kettlebell", "cable", "machine", "band", "bench", "pull-up bar"] as const;
export type Equipment = (typeof EQUIPMENT)[number];

/** Animation pattern used by the movement demonstration component. */
export type Pattern =
  | "bench-press"
  | "overhead-press"
  | "pushup"
  | "dip"
  | "fly"
  | "row"
  | "pull-vertical"
  | "squat"
  | "hinge"
  | "lunge"
  | "hip-thrust"
  | "leg-extension"
  | "leg-curl"
  | "calf-raise"
  | "curl"
  | "pushdown"
  | "overhead-extension"
  | "lateral-raise"
  | "crunch"
  | "leg-raise"
  | "plank"
  | "carry"
  | "wrist-curl";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type Exercise = {
  id: string;
  name: string;
  group: MuscleGroup;
  primary: string[];
  secondary: string[];
  equipment: Equipment[];
  difficulty: Difficulty;
  mechanics: "compound" | "isolation";
  pattern: Pattern;
  steps: string[];
  mistakes: string[];
  cues: string[];
  alternatives: string[];
  safety: string[];
};
