<script setup lang="ts">
import { computed } from "vue";

import { useBotGame } from "@/composables/useBotGame";
import { devModeStrings } from "@/data/strings";
import type { Player } from "@/engine";
import GameTable from "@/views/GameTable.vue";

const props = defineProps<{
  players: readonly Player[];
  delayMs: number;
}>();
const emit = defineEmits<{ settings: [] }>();

const texts = devModeStrings();
const {
  snapshot,
  lastRejection,
  endRequested,
  submitMove,
  playAgain,
  requestEnd,
} = useBotGame({ players: props.players, delayMs: props.delayMs });

const game = computed(() => snapshot.value.log.state);
const endAlreadyCalled = computed(
  () => game.value.status !== "started" || game.value.endCallerId !== null,
);
</script>

<template>
  <div class="dev-toolbar">
    <button
      type="button"
      class="button-secondary"
      :disabled="endRequested || endAlreadyCalled"
      @click="requestEnd"
    >
      {{ texts.endRound }}
    </button>
    <span v-if="endRequested" class="muted">{{ texts.endRequested }}</span>
    <button type="button" class="button-quiet" @click="emit('settings')">
      {{ texts.settings }}
    </button>
  </div>
  <GameTable
    v-if="game.status === 'started'"
    :snapshot="snapshot"
    :state="game"
    :rejection="lastRejection"
    @move="submitMove"
    @play-again="playAgain"
  />
</template>

<style scoped>
.dev-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-2);
  gap: var(--space-3);
}
</style>
