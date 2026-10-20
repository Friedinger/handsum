<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { FLIGHT_MS, type ActiveFlight } from "@/composables/useCardFlights";
import PlayingCard from "@/components/PlayingCard.vue";

const props = defineProps<{ active: ActiveFlight }>();
const emit = defineEmits<{ land: [] }>();

const LANDING_GRACE_MS = 100;
const FACE_DOWN_TURN = "rotateY(180deg)";
const FACE_UP_TURN = "rotateY(0deg)";
const FLIGHT_EASING = "cubic-bezier(0.2, 0.7, 0.3, 1)";

const wrapper = ref<HTMLElement | null>(null);
const flipper = ref<HTMLElement | null>(null);
let landingTimer: ReturnType<typeof setTimeout> | undefined;
let landed = false;

function land(): void {
  if (!landed) {
    landed = true;
    emit("land");
  }
}

function turnFor(faceUp: boolean): string {
  return faceUp ? FACE_UP_TURN : FACE_DOWN_TURN;
}

// The card sits at its target and is animated from the start position, so it lands exactly.
onMounted(() => {
  const { from, to, delayMs, flight } = props.active;
  const timing: KeyframeAnimationOptions = {
    duration: FLIGHT_MS,
    delay: delayMs,
    easing: FLIGHT_EASING,
    fill: "backwards",
  };
  const start = `translate(${String(from.left - to.left)}px, ${String(from.top - to.top)}px) scale(${String(from.width / to.width)})`;
  const movement = wrapper.value?.animate(
    [{ transform: start }, { transform: "none" }],
    timing,
  );
  flipper.value?.animate(
    [
      { transform: turnFor(flight.faceUpAtStart) },
      { transform: turnFor(flight.faceUpAtEnd) },
    ],
    timing,
  );
  void movement?.finished.then(land);
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
    <div
      ref="flipper"
      class="flipper"
      :style="{ transform: turnFor(active.flight.faceUpAtEnd) }"
    >
      <PlayingCard
        v-if="active.flight.card"
        class="flipper-front"
        :card="active.flight.card"
        face-up
      />
      <PlayingCard class="flipper-back" :card="null" :face-up="false" />
    </div>
  </div>
</template>
