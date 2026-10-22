<script setup lang="ts">
import { computed } from "vue";

import { useTutorial } from "@/composables/useTutorial";
import { strings } from "@/data/strings";
import { leaveRoom } from "@/utils/roomNavigation";
import GameTable from "@/views/GameTable.vue";

const {
  snapshot,
  round,
  guide,
  notice,
  lastRejection,
  start,
  restart,
  submitMove,
} = useTutorial();

const game = computed(() => snapshot.value.log.state);
const step = computed(() => guide.value?.step ?? null);
const coach = computed(() => {
  if (!step.value || !guide.value) {
    return null;
  }
  const { title, text } = strings.tutorial.steps[step.value];
  return {
    title,
    text: typeof text === "string" ? text : text(guide.value.position ?? 0),
  };
});
</script>

<template>
  <section v-if="game.status === 'notStarted'" class="panel stack">
    <h2>{{ strings.tutorial.intro.title }}</h2>
    <p>{{ strings.tutorial.intro.text }}</p>
    <button type="button" class="button-primary" @click="start">
      {{ strings.tutorial.start }}
    </button>
    <button type="button" class="button-quiet" @click="leaveRoom">
      {{ strings.tutorial.skip }}
    </button>
  </section>
  <GameTable
    v-else
    :key="round"
    :snapshot="snapshot"
    :state="game"
    :rejection="lastRejection"
    @move="submitMove"
    @play-again="restart"
  >
    <template v-if="coach" #coach>
      <span class="coach-title">{{ coach.title }}</span>
      <p>{{ coach.text }}</p>
      <p v-if="notice" class="error">{{ notice }}</p>
    </template>
  </GameTable>
</template>

<style scoped>
.coach-title {
  color: var(--color-accent);
  font-weight: 700;
}
</style>
