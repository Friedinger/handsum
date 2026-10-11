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
  heldInFlight: boolean;
  heldIsTakenDiscard: boolean;
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
        data-anchor="drawPile"
        :clickable="drawClickable"
        @click="emit('draw')"
      />
      <span class="pile-label">{{
        strings.table.drawPileCount(drawPileCount)
      }}</span>
    </div>
    <div class="pile">
      <PlayingCard
        :card="discardTop"
        face-up
        size="large"
        :data-anchor="heldIsTakenDiscard ? 'discardBelow' : 'discardPile'"
        :clickable="discardClickable"
        @click="emit('discard')"
      />
      <span class="pile-label">{{ strings.table.discardPile }}</span>
    </div>
    <!-- The slot for a held card is always there so the piles do not shift when someone draws. -->
    <div class="pile pile-held" :class="{ 'pile-vacant': !heldCard }">
      <div
        v-if="!heldCard"
        class="card card-large"
        data-anchor="held"
        aria-hidden="true"
      />
      <PlayingCard
        v-else
        :card="heldCard"
        :face-up="heldFaceUp"
        size="large"
        :clickable="heldClickable"
        :marked="heldMarked"
        :in-flight="heldInFlight"
        :data-anchor="heldIsTakenDiscard ? 'discardPile' : 'held'"
        @click="emit('held')"
      />
      <span class="pile-label">{{ heldLabel ?? "" }}</span>
    </div>
  </div>
</template>
