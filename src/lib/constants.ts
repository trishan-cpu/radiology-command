export const MODALITIES = ["X-ray", "CT", "MRI", "Ultrasound"] as const;
export type Modality = (typeof MODALITIES)[number];

export const URGENCIES = ["Routine", "Urgent", "Stat"] as const;
export type Urgency = (typeof URGENCIES)[number];

export const STATUSES = ["pending", "assigned", "in_progress", "completed"] as const;
export type CaseStatus = (typeof STATUSES)[number];

export const STUDY_TYPES_BY_MODALITY: Record<Modality, string[]> = {
  "X-ray": ["Chest", "Abdomen", "Spine", "Knee", "Hand", "Foot", "Pelvis"],
  CT: ["Head", "Chest", "Abdomen", "Pelvis", "Spine", "Angiography"],
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
