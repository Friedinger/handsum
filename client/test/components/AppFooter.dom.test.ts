import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import AppFooter from "@/components/AppFooter.vue";
import { legalLinksFrom } from "@/data/legalLinks";
import { strings } from "@/data/strings";

describe("legalLinksFrom", () => {
  it("accepts web addresses and paths on the same host", () => {
    expect(
      legalLinksFrom({
        VITE_IMPRINT_URL: " https://example.com/imprint ",
        VITE_PRIVACY_URL: "/datenschutz",
      }),
    ).toEqual({
      imprintUrl: "https://example.com/imprint",
      privacyUrl: "/datenschutz",
    });
  });

  it("rejects everything else", () => {
    expect(
      legalLinksFrom({
        VITE_IMPRINT_URL: "//evil.example",
        VITE_PRIVACY_URL: "javascript:alert(1)",
      }),
    ).toEqual({ imprintUrl: null, privacyUrl: null });
    expect(legalLinksFrom({})).toEqual({ imprintUrl: null, privacyUrl: null });
  });
});

describe("AppFooter", () => {
  it("shows only the links that are set", () => {
    const wrapper = mount(AppFooter, {
      props: { links: { imprintUrl: null, privacyUrl: "/datenschutz" } },
    });
    const links = wrapper.findAll("a");
    expect(links.map((link) => link.text())).toEqual([strings.legal.privacy]);
    expect(links[0]?.attributes("href")).toBe("/datenschutz");
  });

  it("keeps the rules button even without links", () => {
    const wrapper = mount(AppFooter, {
      props: { links: { imprintUrl: null, privacyUrl: null } },
    });
    expect(wrapper.find("a").exists()).toBe(false);
    expect(wrapper.find(".rules-open").exists()).toBe(true);
  });
});
