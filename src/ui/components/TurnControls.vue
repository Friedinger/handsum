<script setup lang="ts">
import { computed } from "vue";
import { strings } from "../../data/strings";
import type { Card, Move, MoveType, PlayerId, StartedGame } from "../../engine";
import { legalMoves } from "../../engine";
import type { Selection, SelectionKind } from "../selection";

type StartableSelection = Exclude<SelectionKind, "idle" | "startingView">;

const props = defineProps<{
  state: StartedGame;
  selfId: PlayerId;
  selection: Selection;
  heldCard: Card | null;
}>();
const emit = defineEmits<{
  move: [move: Move];
  begin: [kind: StartableSelection];
  confirm: [];
  cancel: [];
}>();

const legalTypes = computed(
  () => new Set<MoveType>(legalMoves(props.state, props.selfId).map((move) => move.type)),
);

const actionSelection = computed((): StartableSelection | null => {
  switch (props.heldCard?.action) {
    case "viewOwn":
      return "viewOwnCard";
    case "viewOther":
      return "viewOtherCard";
    case "exchangeBlind":
      return "exchangeBlind";
    case null:
    case undefined:
      return null;
  }
});

const needsConfirm = computed(
  () =>
    props.selection.kind === "startingView" ||
    props.selection.kind === "swapDiscardCard" ||
    props.selection.kind === "swapDrawnCard",
);

const hint = computed(() => {
  const { kind } = props.selection;
  if (kind !== "idle") {
    return strings.controls.hints[kind];
  }
  return props.heldCard ? strings.controls.hints.holdingCard : strings.controls.hints.chooseAction;
});

function play(type: "drawFromDeck" | "discardDrawnCard" | "callEnd"): void {
  emit("move", { type, playerId: props.selfId });
}
</script>

<template>
  <div class="controls">
    <p>{{ hint }}</p>
    <div v-if="selection.kind !== 'idle'" class="buttons">
      <button v-if="needsConfirm" type="button" @click="emit('confirm')">
        {{
          selection.kind === "startingView"
            ? strings.controls.viewSelected
            : strings.controls.confirm
        }}
      </button>
      <button v-if="selection.kind !== 'startingView'" type="button" @click="emit('cancel')">
        {{ strings.controls.cancel }}
      </button>
    </div>
    <div v-else-if="heldCard" class="buttons">
      <button
        v-if="legalTypes.has('discardDrawnCard')"
        type="button"
        @click="play('discardDrawnCard')"
      >
        {{ strings.controls.discardDrawn }}
      </button>
      <button
        v-if="legalTypes.has('swapDrawnCard')"
        type="button"
        @click="emit('begin', 'swapDrawnCard')"
      >
        {{ strings.controls.swapDrawn }}
      </button>
      <button
        v-if="actionSelection && legalTypes.has(actionSelection)"
        type="button"
        @click="emit('begin', actionSelection)"
      >
        {{ strings.moveNames[actionSelection] }}
      </button>
    </div>
    <div v-else class="buttons">
      <button v-if="legalTypes.has('drawFromDeck')" type="button" @click="play('drawFromDeck')">
        {{ strings.moveNames.drawFromDeck }}
      </button>
      <button
        v-if="legalTypes.has('swapDiscardCard')"
        type="button"
        @click="emit('begin', 'swapDiscardCard')"
      >
        {{ strings.controls.takeDiscard }}
      </button>
      <button v-if="legalTypes.has('callEnd')" type="button" @click="play('callEnd')">
        {{ strings.moveNames.callEnd }}
      </button>
    </div>
  </div>
</template>
