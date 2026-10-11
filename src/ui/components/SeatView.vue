<script setup lang="ts">
import type { Card } from "../../engine";
import PlayingCard from "./PlayingCard.vue";

export interface SlotView {
  readonly slotIndex: number;
  readonly card: Card;
  readonly faceUp: boolean;
  readonly selectable: boolean;
  readonly selected: boolean;
}

defineProps<{ title: string; slots: readonly SlotView[]; active: boolean }>();
const emit = defineEmits<{ select: [slotIndex: number] }>();
</script>

<template>
  <div class="seat" :class="{ 'seat-active': active }">
    <h3>{{ title }}</h3>
    <div class="layout">
      <PlayingCard
        v-for="slot in slots"
        :key="slot.slotIndex"
        :card="slot.card"
        :face-up="slot.faceUp"
        :selectable="slot.selectable"
        :selected="slot.selected"
        @select="emit('select', slot.slotIndex)"
      />
    </div>
  </div>
</template>
