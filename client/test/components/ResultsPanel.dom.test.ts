import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ResultsPanel from "@/components/ResultsPanel.vue";
import { strings } from "@/data/strings";
import type { PlayerResult } from "@/engine";

import { startedGame } from "@test/support/gameFixtures";

const state = startedGame(3);
const results: PlayerResult[] = [
  { playerId: "player-1", cardSum: 20, score: 20, isWinner: false },
  { playerId: "player-2", cardSum: 5, score: 0, isWinner: true },
  { playerId: "player-3", cardSum: 9, score: 9, isWinner: false },
];

function mountPanel(
  selfId: string,
  finishedRounds: readonly (readonly PlayerResult[])[] = [results],
) {
  return mount(ResultsPanel, {
    props: { state, results, finishedRounds, selfId },
  });
}

function tableRows(wrapper: ReturnType<typeof mountPanel>, tableIndex = 0) {
  return (wrapper.findAll("table")[tableIndex]?.findAll("tbody tr") ?? []).map(
    (row) => row.findAll("td").map((cell) => cell.text()),
  );
}

describe("ResultsPanel", () => {
  it("congratulates a winning player", () => {
    expect(mountPanel("player-2").find("h2").text()).toBe(strings.table.youWin);
  });

  it("names the winner to everyone else", () => {
    expect(mountPanel("player-1").find("h2").text()).toBe(
      strings.table.playerWins("Player 2"),
    );
  });

  it("joins several winners", () => {
    const tied = results.map((result) => ({ ...result, isWinner: true }));

    const wrapper = mount(ResultsPanel, {
      props: {
        state,
        results: tied,
        finishedRounds: [tied],
        selfId: "outsider",
      },
    });

    expect(wrapper.find("h2").text()).toBe(
      strings.table.playerWins("Player 1 & Player 2 & Player 3"),
    );
  });

  it("ranks the players by score", () => {
    expect(tableRows(mountPanel("player-1"))).toEqual([
      ["Player 2", "5", "0"],
      ["Player 3", "9", "9"],
      ["Player 1", "20", "20"],
    ]);
  });

  it("shows no room standings after the first round", () => {
    expect(mountPanel("player-1").find("h3").exists()).toBe(false);
  });

  it("shows the room standings once several rounds have finished", () => {
    const earlier: PlayerResult[] = [
      { playerId: "player-1", cardSum: 3, score: 0, isWinner: true },
      { playerId: "player-2", cardSum: 8, score: 8, isWinner: false },
      { playerId: "player-3", cardSum: 4, score: 4, isWinner: false },
    ];

    const wrapper = mountPanel("player-1", [earlier, results]);

    expect(wrapper.find("h3").text()).toBe(strings.table.standings(2));
    expect(tableRows(wrapper, 1)).toEqual([
      ["Player 2", "8", "1"],
      ["Player 3", "13", "0"],
      ["Player 1", "20", "1"],
    ]);
  });

  it("offers a rematch and leaving", async () => {
    const wrapper = mountPanel("player-1");
    const [playAgain, leave] = wrapper.findAll("button");

    await playAgain?.trigger("click");
    await leave?.trigger("click");

    expect(wrapper.emitted("playAgain")).toHaveLength(1);
    expect(wrapper.emitted("leave")).toHaveLength(1);
  });
});
