<script setup lang="ts">
import { ref } from "vue";
import { strings } from "../../data/strings";
import {
  claimPlayerId,
  hasJoinedRoom,
  loadPlayerName,
  rememberJoinedRoom,
  savePlayerName,
} from "../../net/identity";
import type { HelloMessage } from "../../net/protocol";
import SessionView from "./SessionView.vue";

const props = defineProps<{ roomCode: string }>();

const nameInput = ref(loadPlayerName());
const connecting = ref(false);
const self = ref<HelloMessage | null>(null);

async function join(name: string): Promise<void> {
  connecting.value = true;
  const playerId = await claimPlayerId();
  savePlayerName(name);
  rememberJoinedRoom(props.roomCode);
  self.value = { playerId, name };
}

function submitName(): void {
  const name = nameInput.value.trim();
  if (name.length > 0) {
    void join(name);
  }
}

if (hasJoinedRoom(props.roomCode) && nameInput.value.trim().length > 0) {
  void join(nameInput.value.trim());
}
</script>

<template>
  <SessionView v-if="self" :room-code="roomCode" :self="self" />
  <p v-else-if="connecting">{{ strings.nameForm.connecting }}</p>
  <form v-else class="inline-form" @submit.prevent="submitName">
    <label>
      {{ strings.nameForm.label }}
      <input v-model="nameInput" maxlength="24" autocomplete="nickname" required />
    </label>
    <button type="submit">{{ strings.nameForm.submit }}</button>
  </form>
</template>
