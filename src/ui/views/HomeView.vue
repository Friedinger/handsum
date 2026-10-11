<script setup lang="ts">
import { ref } from "vue";
import { strings } from "../../data/strings";
import { normalizeRoomCode, randomRoomCode } from "../../net/roomCode";
import { openRoom } from "../composables/useRoomCode";

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
      <button type="submit" class="button-secondary">
        {{ strings.home.joinRoom }}
      </button>
    </form>
    <p v-if="showInvalidCode" class="error">
      {{ strings.home.invalidRoomCode }}
    </p>
  </section>
  <p class="disclaimer">{{ strings.home.disclaimer }}</p>
</template>
