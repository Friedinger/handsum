<script setup lang="ts">
import LegalFooter from "@/components/LegalFooter.vue";
import RulesDialog from "@/components/RulesDialog.vue";
import { useRoomCode } from "@/composables/useRoomCode";
import { strings } from "@/data/strings";
import HomeView from "@/views/HomeView.vue";
import RoomView from "@/views/RoomView.vue";

const roomCode = useRoomCode();
</script>

<template>
  <div class="app" :class="{ 'app-home': !roomCode }">
    <header>
      <h1>{{ strings.appTitle }}</h1>
      <RulesDialog />
    </header>
    <main>
      <RoomView v-if="roomCode" :key="roomCode" :room-code="roomCode" />
      <HomeView v-else />
    </main>
    <LegalFooter />
  </div>
</template>
