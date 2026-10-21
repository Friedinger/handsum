import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import LegalFooter from "@/components/LegalFooter.vue";
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

describe("LegalFooter", () => {
  it("shows only the links that are set", () => {
    const wrapper = mount(LegalFooter, {
      props: { links: { imprintUrl: null, privacyUrl: "/datenschutz" } },
    });
    const links = wrapper.findAll("a");
    expect(links.map((link) => link.text())).toEqual([strings.legal.privacy]);
    expect(links[0]?.attributes("href")).toBe("/datenschutz");
  });

  it("renders nothing without links", () => {
    const wrapper = mount(LegalFooter, {
      props: { links: { imprintUrl: null, privacyUrl: null } },
    });
    expect(wrapper.find("footer").exists()).toBe(false);
  });
});
