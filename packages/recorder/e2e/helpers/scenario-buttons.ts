export const SCENARIO_BUTTON = {
  UPDATE: "update-button",
  DOUBLE_LAYOUT_EFFECT: "double-update-layout-effect-button",
  DOUBLE_EFFECT: "double-update-effect-button",
  CUSTOM_HOOK: "custom-hook-button",
  DEBUG_VALUE: "debug-value-button",
  ELEMENT_ALPHA: "element-alpha-button",
} as const;

export type ScenarioButtonId = (typeof SCENARIO_BUTTON)[keyof typeof SCENARIO_BUTTON];
