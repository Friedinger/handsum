<script setup lang="ts">
import { ref } from "vue";

import { strings } from "@/data/strings";
import {
  claimPlayerId,
  hasJoinedRoom,
  loadPlayerName,
  rememberJoinedRoom,
  savePlayerName,
} from "@/net/identity";
import type { HelloMessage } from "@/net/protocol";
import SessionView from "@/views/SessionView.vue";

const PLAYER_NAME_MAX_LENGTH = 24;

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
  <p v-else-if="connecting" class="panel">{{ strings.nameForm.connecting }}</p>
  <form v-else class="panel stack" @submit.prevent="submitName">
    <label for="player-name">{{ strings.nameForm.label }}</label>
    <div class="inline-form">
      <input
        id="player-name"
        v-model="nameInput"
        :maxlength="PLAYER_NAME_MAX_LENGTH"
        autocomplete="nickname"
        required
      />
      <button type="submit" class="button-primary">
        {{ strings.nameForm.submit }}
      </button>
    </div>
  </form>
</template>
