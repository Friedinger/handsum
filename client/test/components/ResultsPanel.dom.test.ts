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

function tableRows(wrapper: ReturnType<typeof mountPanel>) {
  return wrapper
    .findAll("tbody tr")
    .map((row) => row.findAll("td").map((cell) => cell.text()));
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

  it("shows no room totals after the first round", () => {
    expect(mountPanel("player-1").findAll("thead th")).toHaveLength(3);
  });

  it("adds the room totals from the second round on and ranks by them", () => {
    const earlier: PlayerResult[] = [
      { playerId: "player-1", cardSum: 3, score: 0, isWinner: true },
      { playerId: "player-2", cardSum: 30, score: 30, isWinner: false },
      { playerId: "player-3", cardSum: 4, score: 4, isWinner: false },
    ];

    const wrapper = mountPanel("player-1", [earlier, results]);

    expect(wrapper.findAll("table")).toHaveLength(1);
    expect(tableRows(wrapper)).toEqual([
      ["Player 3", "9", "9", "13", "0"],
      ["Player 1", "20", "20", "20", "1"],
      ["Player 2", "5", "0", "30", "1"],
    ]);
  });

  it("marks who announced the end", () => {
    const wrapper = mount(ResultsPanel, {
      props: {
        state: { ...state, endCallerId: "player-3" },
        results,
        finishedRounds: [results],
        selfId: "player-1",
      },
    });

    const badges = wrapper.findAll("tbody .badge");
    expect(badges.map((badge) => badge.text())).toEqual([
      strings.table.calledEndShort,
    ]);
    expect(badges[0]?.attributes("title")).toBe(strings.table.calledEnd);
    expect(badges[0]?.element.closest("tr")?.textContent).toContain("Player 3");
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
