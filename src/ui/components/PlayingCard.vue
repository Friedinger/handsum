<script setup lang="ts">
import { strings } from "../../data/strings";
import type { Card } from "../../engine";

withDefaults(
  defineProps<{ card: Card | null; faceUp: boolean; selectable?: boolean; selected?: boolean }>(),
  { selectable: false, selected: false },
);
const emit = defineEmits<{ select: [] }>();
</script>

<template>
  <component
    :is="selectable ? 'button' : 'div'"
    :type="selectable ? 'button' : undefined"
    class="card"
    :class="{
      'card-hidden': !faceUp,
      'card-selectable': selectable,
      'card-selected': selected,
    }"
    @click="selectable && emit('select')"
  >
    <template v-if="card && faceUp">
      <span class="card-value">{{ card.value }}</span>
      <span class="card-symbol">{{ strings.cardSymbol }}</span>
      <span v-if="card.action" class="card-action">{{ strings.cardActionNames[card.action] }}</span>
    </template>
    <template v-else>{{ strings.hiddenCard }}</template>
  </component>
</template>
