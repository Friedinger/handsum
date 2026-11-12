<script setup lang="ts">
import { computed } from "vue";

import { strings } from "@/data/strings";
import type { PlayerId, PlayerResult, StartedGame } from "@/engine";
import { displayName } from "@/utils/displayName";
import { roomStandings } from "@/utils/standings";

const props = defineProps<{
  state: StartedGame;
  results: readonly PlayerResult[];
  finishedRounds: readonly (readonly PlayerResult[])[];
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

/** The room standings decide the order; in the first round they are just the round results. */
const standings = computed(() => roomStandings(props.finishedRounds));
const ranked = computed(() =>
  standings.value.flatMap((standing) =>
    props.results.filter((result) => result.playerId === standing.playerId),
  ),
);
const standingOf = computed(
  () =>
    new Map(standings.value.map((standing) => [standing.playerId, standing])),
);

/** After the first round the room totals would only repeat the round results. */
const showsTotals = computed(() => props.finishedRounds.length > 1);
</script>

<template>
  <div class="results-panel surface">
    <h2>{{ headline }}</h2>
    <div class="results-scroll">
      <table class="results">
        <thead>
          <tr>
            <th></th>
            <th>{{ strings.table.cardSum }}</th>
            <th>{{ strings.table.score }}</th>
            <template v-if="showsTotals">
              <th>{{ strings.table.totalScore }}</th>
              <th>{{ strings.table.roundsWon }}</th>
            </template>
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
            <template v-if="showsTotals">
              <td>
                {{ standingOf.get(result.playerId)?.totalScore }}
              </td>
              <td>{{ standingOf.get(result.playerId)?.roundsWon }}</td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
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
  max-width: 100%;
  min-height: 0;
  max-height: 100%;
  gap: var(--space-4);
  text-align: center;
}

/* Only the list scrolls, so the headline, the buttons and the own cards below stay in view. */
.results-scroll {
  flex: 0 1 auto;
  min-height: 6rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  /* Counts the scrollbar into the panel's width, so it never covers the last column. */
  scrollbar-gutter: stable;
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
  padding: 0.4rem;
  text-align: left;
}

/* The numbers take only the width they need, which leaves the rest to the names. */
.results th:not(:first-child),
.results td:not(:first-child) {
  width: 1%;
  text-align: center;
  white-space: nowrap;
}

.results thead th {
  position: sticky;
  top: 0;
  background: var(--color-panel);
}

.result-winner td {
  color: var(--color-accent);
  font-weight: 700;
}

/* On phones the whole table scrolls, so the list gets a fixed share of the screen instead. */
@media (max-width: 40rem) {
  .results-panel {
    padding: var(--space-3);
  }

  .results-scroll {
    max-height: 40dvh;
  }

  /* Five columns only fit a phone when very long names may break. */
  .results {
    font-size: 0.875rem;
  }

  .results th,
  .results td {
    padding: 0.4rem 0.25rem;
  }

  .results td:first-child {
    overflow-wrap: anywhere;
  }
}
</style>
