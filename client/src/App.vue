<script setup lang="ts">
import { useRoomCode } from "@/composables/useRoomCode";
import { strings } from "@/data/strings";
import HomeView from "@/views/HomeView.vue";
import RoomView from "@/views/RoomView.vue";

const roomCode = useRoomCode();
</script>

<template>
  <main class="app">
    <h1 class="app-title">{{ strings.appTitle }}</h1>
    <RoomView v-if="roomCode" :key="roomCode" :room-code="roomCode" />
    <HomeView v-else />
  </main>
</template>
