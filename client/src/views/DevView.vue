<script setup lang="ts">
import { ref } from "vue";

import { useDevSettings } from "@/composables/useDevSettings";
import { devModeStrings } from "@/data/strings";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  type Player,
  PLAYER_NAME_MAX_LENGTH,
} from "@/engine";
import {
  BOT_DELAY_MS,
  BOT_SPEEDS,
  devPlayers,
  type DevSettings,
  hasValidNames,
} from "@/utils/devGame";
import DevGameView from "@/views/DevGameView.vue";

interface RunningGame {
  readonly players: readonly Player[];
  readonly delayMs: number;
}

const texts = devModeStrings();
const settings = useDevSettings();
const playerCounts = Array.from(
  { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
  (_, offset) => MIN_PLAYERS + offset,
);
const running = ref<RunningGame | null>(null);
const showInvalidNames = ref(false);

function update(changes: Partial<DevSettings>): void {
  settings.value = { ...settings.value, ...changes };
}

function rename(seatIndex: number, name: string): void {
  update({
    names: settings.value.names.map((existing, index) =>
      index === seatIndex ? name : existing,
    ),
  });
}

function start(): void {
  showInvalidNames.value = !hasValidNames(settings.value);
  if (showInvalidNames.value) {
    return;
  }
  running.value = {
    players: devPlayers(settings.value),
    delayMs: BOT_DELAY_MS[settings.value.botSpeed],
  };
}
</script>

<template>
  <DevGameView
    v-if="running"
    :players="running.players"
    :delay-ms="running.delayMs"
    @settings="running = null"
  />
  <form v-else class="panel stack dev-settings" @submit.prevent="start">
    <h2>{{ texts.title }}</h2>
    <p class="muted">{{ texts.intro }}</p>

    <div class="stack" role="group" aria-labelledby="dev-player-count">
      <span id="dev-player-count">{{ texts.playerCount }}</span>
      <div class="choices">
        <button
          v-for="count in playerCounts"
          :key="count"
          type="button"
          class="button-secondary"
          :aria-pressed="count === settings.playerCount"
          @click="update({ playerCount: count })"
        >
          {{ count }}
        </button>
      </div>
    </div>

    <div class="stack" role="group" aria-labelledby="dev-names">
      <span id="dev-names">{{ texts.names }}</span>
      <input
        v-for="(name, index) in settings.names.slice(0, settings.playerCount)"
        :key="index"
        :value="name"
        :aria-label="texts.nameOf(index + 1)"
        :placeholder="texts.nameOf(index + 1)"
        :maxlength="PLAYER_NAME_MAX_LENGTH"
        autocomplete="off"
        @input="rename(index, ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="stack" role="group" aria-labelledby="dev-bot-speed">
      <span id="dev-bot-speed">{{ texts.botSpeed }}</span>
      <div class="choices">
        <button
          v-for="speed in BOT_SPEEDS"
          :key="speed"
          type="button"
          class="button-secondary"
          :aria-pressed="speed === settings.botSpeed"
          @click="update({ botSpeed: speed })"
        >
          {{ texts.speeds[speed] }}
        </button>
      </div>
    </div>

    <div class="stack start">
      <p v-if="showInvalidNames" class="error">{{ texts.invalidNames }}</p>
      <button type="submit" class="button-primary">{{ texts.start }}</button>
    </div>
  </form>
</template>

<style scoped>
/* With eight names the form is taller than many screens, so it scrolls instead of covering the
   footer, while the start button stays pinned to its bottom edge. */
.dev-settings {
  min-height: 0;
  overflow-y: auto;
}

.start {
  position: sticky;
  bottom: calc(-1 * var(--space-5));
  margin-bottom: calc(-1 * var(--space-5));
  padding-bottom: var(--space-5);
  background: var(--color-panel);
}

.choices {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.choices button {
  min-width: var(--control-height);
}

.choices [aria-pressed="true"] {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>
