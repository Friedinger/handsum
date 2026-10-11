import { strings } from "@/data/strings";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/engine";
import { button, element } from "./dom";
import type { HotseatActions } from "./session";
import { randomSeed } from "@/ui/randomSeed";

const DEFAULT_PLAYER_COUNT = 3;

function playerCountSelect(): HTMLSelectElement {
  const select = element("select");
  for (let count = MIN_PLAYERS; count <= MAX_PLAYERS; count++) {
    select.append(
      element("option", { attributes: { value: String(count) } }, [
        String(count),
      ]),
    );
  }
  select.value = String(DEFAULT_PLAYER_COUNT);
  return select;
}

export function renderSetup(actions: HotseatActions): HTMLElement {
  const countSelect = playerCountSelect();
  const seedInput = element("input", {
    attributes: { type: "number", min: "0" },
  });
  seedInput.value = String(randomSeed());
  const start = () => {
    actions.startGame(Number(countSelect.value), Number(seedInput.value));
  };
  return element("section", {}, [
    element("label", {}, [`${strings.hotseat.playerCount} `, countSelect]),
    " ",
    element("label", {}, [`${strings.hotseat.seed} `, seedInput]),
    " ",
    button(strings.hotseat.start, start),
  ]);
}
