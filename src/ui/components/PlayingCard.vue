<script setup lang="ts">
import { computed } from "vue";
import { strings } from "../../data/strings";
import type { Card } from "../../engine";
import { valueTier, type CardSize } from "../slotView";

const props = withDefaults(
  defineProps<{
    card: Card | null;
    faceUp: boolean;
    size?: CardSize;
    clickable?: boolean;
    marked?: boolean;
    inFlight?: boolean;
    peeked?: boolean;
  }>(),
  { size: "medium", clickable: false, marked: false, inFlight: false, peeked: false },
);
const emit = defineEmits<{ click: [] }>();

const visibleCard = computed(() => (props.faceUp ? props.card : null));
</script>

<template>
  <component
    :is="clickable ? 'button' : 'div'"
    :type="clickable ? 'button' : undefined"
    class="card"
    :class="[
      `card-${size}`,
      visibleCard ? `card-face tier-${valueTier(visibleCard)}` : 'card-back',
      {
        'card-clickable': clickable,
        'card-marked': marked,
        'card-placeholder': faceUp && !card,
        'card-in-flight': inFlight,
        'card-peeked': peeked,
      },
    ]"
    @click="clickable && emit('click')"
  >
    <template v-if="visibleCard">
      <span class="card-corner">{{ visibleCard.value }}</span>
      <span class="card-center">
        <span class="card-value">{{ visibleCard.value }}</span>
        <span class="card-symbol">{{ strings.cardSymbol }}</span>
      </span>
      <span v-if="visibleCard.action" class="card-action">
        {{ strings.cardActionNames[visibleCard.action] }}
      </span>
    </template>
  </component>
</template>
