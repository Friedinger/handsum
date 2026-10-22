<script setup lang="ts">
import { computed } from "vue";

import { strings } from "@/data/strings";
import type { PlayerId, PlayerResult, StartedGame } from "@/engine";
import { displayName } from "@/utils/displayName";

const props = defineProps<{
  state: StartedGame;
  results: readonly PlayerResult[];
  selfId: PlayerId;
}>();
const emit = defineEmits<{ playAgain: []; leave: [] }>();

const headline = computed(() => {
  const winners = props.results.filter((result) => result.isWinner);
  if (winners.some((winner) => winner.playerId === props.selfId)) {
    return strings.table.youWin;
  }
  return strings.table.playerWins(
    winners
      .map((winner) => displayName(props.state, winner.playerId))
      .join(strings.table.winnerSeparator),
  );
});

const ranked = computed(() =>
  [...props.results].sort((a, b) => a.score - b.score),
);
</script>

<template>
  <div class="results-panel surface">
    <h2>{{ headline }}</h2>
    <table class="results">
      <thead>
        <tr>
          <th></th>
          <th>{{ strings.table.cardSum }}</th>
          <th>{{ strings.table.score }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="result in ranked"
          :key="result.playerId"
          :class="{ 'result-winner': result.isWinner }"
        >
          <td>{{ displayName(state, result.playerId) }}</td>
          <td>{{ result.cardSum }}</td>
          <td>{{ result.score }}</td>
        </tr>
      </tbody>
    </table>
    <div class="results-actions">
      <button type="button" class="button-primary" @click="emit('playAgain')">
        {{ strings.table.playAgain }}
      </button>
      <button type="button" class="button-secondary" @click="emit('leave')">
        {{ strings.table.leave }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.results-panel {
  display: flex;
  flex-direction: column;
  min-width: min(22rem, 100%);
  gap: var(--space-4);
  text-align: center;
}

.results-actions {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
}

.results {
  width: 100%;
  border-collapse: collapse;
}

.results th,
.results td {
  padding: 0.4rem 0.6rem;
  text-align: left;
}

.results tbody tr + tr td {
  border-top: 1px solid var(--color-panel-edge);
}

.result-winner td {
  color: var(--color-accent);
  font-weight: 700;
}
</style>
