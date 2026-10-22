<script setup lang="ts">
import { computed } from "vue";

import TutorialCoach from "@/components/TutorialCoach.vue";
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
const coach = computed(() => guide.value?.coach ?? null);
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
    :highlight="guide?.highlight"
    @move="submitMove"
    @play-again="restart"
  >
    <template v-if="coach" #coach>
      <TutorialCoach :title="coach.title" :text="coach.text" :notice="notice" />
    </template>
  </GameTable>
</template>
