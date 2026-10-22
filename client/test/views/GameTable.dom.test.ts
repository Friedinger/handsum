import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import { initialSnapshot } from "@/net/gameSession";
import GameTable from "@/views/GameTable.vue";

import {
  holding,
  makeCard,
  playingGame,
  startedGame,
} from "@test/support/gameFixtures";

const self = { playerId: "player-1", name: "Player 1" };

function mountTable(state: ReturnType<typeof startedGame>) {
  return mount(GameTable, {
    props: {
      snapshot: initialSnapshot("room", self),
      state,
      rejection: null,
    },
  });
}

function discardPile(wrapper: ReturnType<typeof mountTable>) {
  return wrapper.findAll(".table-center .pile")[1]?.find(".card");
}

async function clickOwnCard(
  wrapper: ReturnType<typeof mountTable>,
  index: number,
) {
  await wrapper.findAll(".seat-large .card")[index]?.trigger("click");
}

describe("GameTable discard pile", () => {
  it("does not let the discard pile confirm a selection in the starting view", async () => {
    const wrapper = mountTable(startedGame());

    await clickOwnCard(wrapper, 0);

    expect(discardPile(wrapper)?.classes()).not.toContain("card-ready");
  });

  it("lets the discard pile confirm a swap selection while holding a card", async () => {
    const wrapper = mountTable(holding(playingGame(), makeCard(3)));

    await clickOwnCard(wrapper, 0);

    expect(discardPile(wrapper)?.classes()).toContain("card-ready");
  });
});
