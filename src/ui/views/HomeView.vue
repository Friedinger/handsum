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
  <section>
    <p>{{ strings.home.tagline }}</p>
    <button type="button" @click="createRoom">{{ strings.home.createRoom }}</button>
    <form class="inline-form" @submit.prevent="joinRoom">
      <label>
        {{ strings.home.roomCode }}
        <input v-model="codeInput" autocomplete="off" />
      </label>
      <button type="submit">{{ strings.home.joinRoom }}</button>
    </form>
    <p v-if="showInvalidCode" class="error">{{ strings.home.invalidRoomCode }}</p>
    <p class="disclaimer">{{ strings.home.disclaimer }}</p>
  </section>
</template>
