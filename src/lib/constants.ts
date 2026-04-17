export const MODALITIES = ["X-ray", "CT", "MRI", "Ultrasound"] as const;
export type Modality = (typeof MODALITIES)[number];

// DB enum values stay the same — we only relabel in the UI.
export const URGENCIES = ["Routine", "Urgent", "Stat"] as const;
export type Urgency = (typeof URGENCIES)[number];

// Display labels: Stat→High, Urgent→Medium, Routine→Low
export const URGENCY_LABEL: Record<Urgency, string> = {
  Stat: "High",
  Urgent: "Medium",
  Routine: "Low",
};

export const URGENCY_FROM_LABEL: Record<string, Urgency> = {
  High: "Stat",
  Medium: "Urgent",
  Low: "Routine",
};

export const URGENCY_DISPLAY_OPTIONS = ["High", "Medium", "Low"] as const;

export const STATUSES = ["pending", "assigned", "in_progress", "completed"] as const;
export type CaseStatus = (typeof STATUSES)[number];

export const STUDY_TYPES_BY_MODALITY: Record<Modality, string[]> = {
  "X-ray": ["Chest", "Abdomen", "Spine", "Knee", "Hand", "Foot", "Pelvis"],
  CT: ["Head", "Chest", "Abdomen", "Pelvis", "Spine", "Angiography", "Neuro"],
  MRI: ["Brain", "Spine", "Knee", "Shoulder", "Abdomen", "Pelvis"],
  Ultrasound: ["Abdomen", "Pelvis", "Thyroid", "Vascular", "OB/GYN"],
};

export const ALL_STUDY_TYPES = Array.from(
  new Set(Object.values(STUDY_TYPES_BY_MODALITY).flat()),
).sort();

export const URGENCY_TAT_MINUTES: Record<Urgency, number> = {
  Stat: 30,
  Urgent: 60,
  Routine: 240,
};

// ScanSync per-modality SLA windows (minutes) for seeding
export const MODALITY_SLA_MINUTES: Record<Modality, [number, number]> = {
  "X-ray": [3, 5],
  CT: [7, 10],
  MRI: [12, 15],
  Ultrasound: [10, 15],
};

// Subspecialty groupings for uneven eligibility distribution
export const SUBSPECIALTIES: Record<string, string[]> = {
  Neuro: ["Brain", "Head", "Neuro"],
  Chest: ["Chest"],
  Spine: ["Spine"],
  MSK: ["Knee", "Shoulder", "Hand", "Foot"],
  Body: ["Abdomen", "Angiography"],
  Pelvis: ["Pelvis", "OB/GYN"],
  Vascular: ["Vascular", "Thyroid"],
};
