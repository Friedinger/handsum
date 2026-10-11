<script setup lang="ts">
import type { CardSize, SlotView } from "../slotView";
import PlayingCard from "./PlayingCard.vue";

withDefaults(
  defineProps<{
    name: string;
    badges: readonly string[];
    slots: readonly SlotView[];
    active: boolean;
    size: CardSize;
    compact?: boolean;
  }>(),
  { compact: false },
);
const emit = defineEmits<{ select: [slotIndex: number] }>();
</script>

<template>
  <div class="player-seat" :class="{ 'seat-active': active, 'seat-compact': compact }">
    <div class="seat-label">
      <span class="seat-name">{{ name }}</span>
      <span v-for="badge in badges" :key="badge" class="seat-badge">{{ badge }}</span>
    </div>
    <div class="seat-cards">
      <PlayingCard
        v-for="slot in slots"
        :key="slot.slotIndex"
        :card="slot.card"
        :face-up="slot.faceUp"
        :size="size"
        :clickable="slot.clickable"
        :marked="slot.marked"
        @click="emit('select', slot.slotIndex)"
      />
    </div>
  </div>
</template>
