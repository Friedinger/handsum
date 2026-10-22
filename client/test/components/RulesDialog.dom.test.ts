import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import RulesDialog from "@/components/RulesDialog.vue";
import { strings } from "@/data/strings";
import { deckOverview } from "@/data/strings/deckOverview";

import { buttonLabelled } from "@test/support/domQueries";

function mountDialog() {
  return mount(RulesDialog, { attachTo: document.body });
}

describe("RulesDialog", () => {
  it("is closed until the button is clicked", async () => {
    const wrapper = mountDialog();
    const dialog = wrapper.find("dialog").element;
    expect(dialog.open).toBe(false);

    await buttonLabelled(wrapper, strings.rules.open)?.trigger("click");

    expect(dialog.open).toBe(true);
    wrapper.unmount();
  });

  it("lists every rules section", () => {
    const wrapper = mountDialog();
    const headings = wrapper.findAll("h3").map((heading) => heading.text());
    expect(headings).toEqual(
      strings.rules.sections.map((section) => section.heading),
    );
    wrapper.unmount();
  });

  it("shows the card overview as a list of values and effects", () => {
    const wrapper = mountDialog();
    const terms = wrapper.findAll(".rules-facts dt");
    const details = wrapper.findAll(".rules-facts dd");
    const [firstFact] = deckOverview.facts;
    expect(terms).toHaveLength(deckOverview.facts.length);
    expect(details).toHaveLength(deckOverview.facts.length);
    expect(terms[0]?.text()).toBe(firstFact?.values);
    expect(details[0]?.text()).toBe(firstFact?.detail);
    wrapper.unmount();
  });

  it("closes with the close button", async () => {
    const wrapper = mountDialog();
    const dialog = wrapper.find("dialog").element;
    await buttonLabelled(wrapper, strings.rules.open)?.trigger("click");

    await wrapper.find(".rules-header button").trigger("click");

    expect(dialog.open).toBe(false);
    wrapper.unmount();
  });

  it("closes when the backdrop is clicked", async () => {
    const wrapper = mountDialog();
    const dialog = wrapper.find("dialog").element;
    await buttonLabelled(wrapper, strings.rules.open)?.trigger("click");

    await wrapper.find("dialog").trigger("click");

    expect(dialog.open).toBe(false);
    wrapper.unmount();
  });
});
