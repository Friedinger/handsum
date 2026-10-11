<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { FLIGHT_MS, type ActiveFlight } from "../composables/useCardFlights";
import PlayingCard from "./PlayingCard.vue";

const props = defineProps<{ active: ActiveFlight }>();
const emit = defineEmits<{ land: [] }>();

const LANDING_GRACE_MS = 100;

const wrapper = ref<HTMLElement | null>(null);
let landingTimer: ReturnType<typeof setTimeout> | undefined;
let landed = false;

function land(): void {
  if (!landed) {
    landed = true;
    emit("land");
  }
}

// The card sits at its target and is animated from the start position, so it lands exactly.
onMounted(() => {
  const { from, to, delayMs } = props.active;
  const start = `translate(${String(from.left - to.left)}px, ${String(from.top - to.top)}px) scale(${String(from.width / to.width)})`;
  const animation = wrapper.value?.animate([{ transform: start }, { transform: "none" }], {
    duration: FLIGHT_MS,
    delay: delayMs,
    easing: "cubic-bezier(0.2, 0.7, 0.3, 1)",
    fill: "backwards",
  });
  void animation?.finished.then(land);
  // A stalled animation must never leave a card hidden for good.
  landingTimer = setTimeout(land, FLIGHT_MS + delayMs + LANDING_GRACE_MS);
});

onUnmounted(() => {
  clearTimeout(landingTimer);
});
</script>

<template>
  <div
    ref="wrapper"
    class="flying-card"
    :style="{
      left: `${String(active.to.left)}px`,
      top: `${String(active.to.top)}px`,
      '--card-width': `${String(active.to.width)}px`,
    }"
  >
    <PlayingCard :card="active.flight.card" :face-up="active.flight.faceUp" />
  </div>
</template>
