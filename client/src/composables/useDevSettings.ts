import { type Ref, ref, watch } from "vue";

import { devModeStrings } from "@/data/strings";
import {
  defaultDevSettings,
  type DevSettings,
  parseDevSettings,
} from "@/utils/devGame";

const STORAGE_KEY = "handsum.devSettings";

/** Settings are only a convenience, so unreadable or blocked storage simply means the defaults. */
function loadSettings(defaults: DevSettings): DevSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === null
      ? defaults
      : parseDevSettings(JSON.parse(saved), defaults);
  } catch {
    return defaults;
  }
}

function saveSettings(settings: DevSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    return;
  }
}

export function useDevSettings(): Ref<DevSettings> {
  const settings = ref<DevSettings>(
    loadSettings(defaultDevSettings(devModeStrings().defaultNames)),
  );
  watch(settings, saveSettings, { deep: true });
  return settings;
}
