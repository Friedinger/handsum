<script setup lang="ts">
import { strings } from "../../data/strings";
import type { Slot } from "../../engine";

defineProps<{ cardSlot: Slot; faceUp: boolean }>();
</script>

<template>
  <div v-if="!cardSlot" class="card card-empty">{{ strings.emptySlot }}</div>
  <div v-else-if="!faceUp" class="card card-hidden">{{ strings.hiddenCard }}</div>
  <div v-else class="card">
    <span class="card-value">{{ cardSlot.value }}</span>
    <span class="card-symbol">{{ strings.cardSymbol }}</span>
    <span v-if="cardSlot.action" class="card-action">{{
      strings.cardActionNames[cardSlot.action]
    }}</span>
  </div>
</template>
