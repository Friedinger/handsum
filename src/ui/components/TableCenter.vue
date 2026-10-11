<script setup lang="ts">
import { strings } from "../../data/strings";
import type { Card } from "../../engine";
import PlayingCard from "./PlayingCard.vue";

defineProps<{
  drawPileCount: number;
  discardTop: Card | null;
  heldCard: Card | null;
  heldLabel: string | null;
  heldFaceUp: boolean;
  drawClickable: boolean;
  discardClickable: boolean;
  heldClickable: boolean;
  heldMarked: boolean;
}>();
const emit = defineEmits<{ draw: []; discard: []; held: [] }>();
</script>

<template>
  <div class="table-center">
    <div class="pile">
      <PlayingCard
        :card="null"
        :face-up="drawPileCount === 0"
        size="large"
        class="pile-stack"
        :clickable="drawClickable"
        @click="emit('draw')"
      />
      <span class="pile-label">{{ strings.table.drawPileCount(drawPileCount) }}</span>
    </div>
    <div class="pile">
      <PlayingCard
        :card="discardTop"
        face-up
        size="large"
        :clickable="discardClickable"
        @click="emit('discard')"
      />
    </div>
    <div v-if="heldCard" class="pile pile-held">
      <PlayingCard
        :card="heldCard"
        :face-up="heldFaceUp"
        size="large"
        :clickable="heldClickable"
        :marked="heldMarked"
        @click="emit('held')"
      />
      <span class="pile-label">{{ heldLabel }}</span>
    </div>
  </div>
</template>
