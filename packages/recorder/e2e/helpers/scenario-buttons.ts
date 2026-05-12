export const SCENARIO_BUTTON = {
  UPDATE: "update-button",
  DOUBLE_LAYOUT_EFFECT: "double-update-layout-effect-button",
  DOUBLE_EFFECT: "double-update-effect-button",
  CUSTOM_HOOK: "custom-hook-button",
  DEBUG_VALUE: "debug-value-button",
  ELEMENT_ALPHA: "element-alpha-button",
  OBJECT_PARTIAL_UPDATE: "object-partial-update-button",
  OBJECT_SAME_VALUE: "object-same-value-button",
  OBJECT_FUNCTION_REF: "object-function-ref-button",
  PARENT_CASCADE: "parent-cascade-button",
  RENDER_BY_PARENT: "render-by-parent-button",
} as const;

export type ScenarioButtonId = (typeof SCENARIO_BUTTON)[keyof typeof SCENARIO_BUTTON];
