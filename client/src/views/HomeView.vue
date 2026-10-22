<script setup lang="ts">
import { ref } from "vue";

import { disclaimerUrl } from "@/data/buildInfo";
import { strings } from "@/data/strings";
import { normalizeRoomCode, randomRoomCode } from "@/net/roomCode";
import { openRoom, openTutorial } from "@/utils/roomNavigation";

const codeInput = ref("");
const showInvalidCode = ref(false);

function createRoom(): void {
  openRoom(randomRoomCode());
}

function joinRoom(): void {
  const roomCode = normalizeRoomCode(codeInput.value);
  showInvalidCode.value = roomCode === null;
  if (roomCode) {
    openRoom(roomCode);
  }
}
</script>

<template>
  <section class="panel stack">
    <p>{{ strings.home.tagline }}</p>
    <button type="button" class="button-primary" @click="createRoom">
      {{ strings.home.createRoom }}
    </button>
    <form class="inline-form" @submit.prevent="joinRoom">
      <input
        v-model="codeInput"
        :placeholder="strings.home.roomCode"
        :aria-label="strings.home.roomCode"
        autocomplete="off"
      />
      <button type="submit" class="button-accent-outline">
        {{ strings.home.joinRoom }}
      </button>
    </form>
    <p v-if="showInvalidCode" class="error">
      {{ strings.home.invalidRoomCode }}
    </p>
    <button type="button" class="button-secondary" @click="openTutorial">
      {{ strings.tutorial.open }}
    </button>
  </section>
  <p class="disclaimer">
    <a v-if="disclaimerUrl" :href="disclaimerUrl">{{
      strings.home.disclaimer
    }}</a>
    <template v-else>{{ strings.home.disclaimer }}</template>
  </p>
</template>

<style scoped>
.disclaimer {
  margin-top: var(--space-6);
  color: var(--color-ink-muted);
  font-size: 0.85rem;
  text-align: center;
}

.disclaimer a {
  color: inherit;
}
</style>
