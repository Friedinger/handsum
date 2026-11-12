<script setup lang="ts">
import { computed } from "vue";

import { useBotGame } from "@/composables/useBotGame";
import { devModeStrings } from "@/data/strings";
import type { Player } from "@/engine";
import { HEADER_ACTIONS_ID } from "@/utils/headerActions";
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
  <Teleport defer :to="`#${HEADER_ACTIONS_ID}`">
    <button
      type="button"
      class="link-quiet end-round"
      :disabled="endRequested || endAlreadyCalled"
      @click="requestEnd"
    >
      {{ texts.endRound }}
    </button>
    <button type="button" class="link-quiet settings" @click="emit('settings')">
      {{ texts.settings }}
    </button>
  </Teleport>
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
/* They sit in the free columns beside the title, one on each side, and stay lower than it, so the
   header keeps its height. */
.end-round,
.settings {
  padding-block: var(--space-1);
}

.end-round {
  justify-self: start;
}

.settings {
  justify-self: end;
}
</style>
