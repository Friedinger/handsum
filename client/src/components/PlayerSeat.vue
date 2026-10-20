<script setup lang="ts">
import PlayingCard from "@/components/PlayingCard.vue";
import type { CardSize, SlotView } from "@/utils/slotView";

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
  <div
    class="player-seat"
    :class="[
      `seat-${size}`,
      { 'seat-active': active, 'seat-compact': compact },
    ]"
  >
    <div class="seat-label">
      <span class="seat-name">{{ name }}</span>
      <span v-for="badge in badges" :key="badge" class="seat-badge">{{
        badge
      }}</span>
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
        :in-flight="slot.inFlight"
        :peeked="slot.peeked"
        :data-anchor="slot.anchor"
        @click="emit('select', slot.slotIndex)"
      />
    </div>
  </div>
</template>
