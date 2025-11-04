export const featureFlags = {
  auth_enabled: true,
  ready_score_v2: true,
  error_book: true,
  question_camera: true,
  ai_tutor: false,
  parent_dashboard: false,
};

export function getFlag(key: keyof typeof featureFlags): boolean {
  return featureFlags[key];
}
