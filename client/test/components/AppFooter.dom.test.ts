import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import AppFooter from "@/components/AppFooter.vue";
import { buildInfoFrom, disclaimerUrlFrom } from "@/data/buildInfo";
import { legalLinksFrom } from "@/data/legalLinks";
import { strings } from "@/data/strings";

import { buttonLabelled } from "@test/support/domQueries";

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
    expect(buttonLabelled(wrapper, strings.rules.open)).toBeDefined();
  });
});

describe("AppFooter language switch", () => {
  const links = { imprintUrl: null, privacyUrl: null };

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("offers only the other language, named in that language", () => {
    const wrapper = mount(AppFooter, { props: { links } });

    expect(buttonLabelled(wrapper, "Deutsch")?.attributes("lang")).toBe("de");
    expect(buttonLabelled(wrapper, "English")).toBeUndefined();
  });

  it("saves the choice and reloads the page", async () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { reload });
    const wrapper = mount(AppFooter, { props: { links } });

    await buttonLabelled(wrapper, "Deutsch")?.trigger("click");

    expect(localStorage.getItem("handsum.language")).toBe("de");
    expect(reload).toHaveBeenCalledOnce();
  });
});

describe("buildInfoFrom", () => {
  const HASH = "0123456789abcdef0123456789abcdef01234567";

  it("shortens the hash and links to the commit", () => {
    expect(
      buildInfoFrom({
        VITE_COMMIT_HASH: HASH,
        VITE_REPOSITORY_URL: "https://github.com/Friedinger/handsum/",
      }),
    ).toEqual({
      shortHash: "0123456",
      commitUrl: `https://github.com/Friedinger/handsum/commit/${HASH}`,
    });
  });

  it("shows the hash without a link when the repository address is missing or not https", () => {
    expect(buildInfoFrom({ VITE_COMMIT_HASH: HASH })?.commitUrl).toBeNull();
    expect(
      buildInfoFrom({
        VITE_COMMIT_HASH: HASH,
        VITE_REPOSITORY_URL: "javascript:alert(1)",
      })?.commitUrl,
    ).toBeNull();
  });

  it("shows nothing for a value that is no commit hash", () => {
    expect(buildInfoFrom({})).toBeNull();
    expect(buildInfoFrom({ VITE_COMMIT_HASH: "main" })).toBeNull();
    expect(buildInfoFrom({ VITE_COMMIT_HASH: "<b>0123456</b>" })).toBeNull();
  });
});

describe("AppFooter build info", () => {
  const build = { shortHash: "0123456", commitUrl: "https://example.com/c/1" };
  const links = { imprintUrl: null, privacyUrl: null };

  it("links the short hash to the commit", () => {
    const wrapper = mount(AppFooter, { props: { links, build } });

    const link = wrapper.find("a");
    expect(link.text()).toBe("0123456");
    expect(link.attributes("href")).toBe("https://example.com/c/1");
    expect(link.attributes("title")).toBe(strings.build.commitTitle);
  });

  it("shows the hash as plain text without an address", () => {
    const wrapper = mount(AppFooter, {
      props: { links, build: { shortHash: "0123456", commitUrl: null } },
    });

    expect(wrapper.find("a").exists()).toBe(false);
    expect(wrapper.find(".commit-hash").text()).toBe("0123456");
  });

  it("shows no hash when the build did not provide one", () => {
    const wrapper = mount(AppFooter, { props: { links } });

    expect(wrapper.text()).not.toMatch(/[0-9a-f]{7}/);
  });
});

describe("disclaimerUrlFrom", () => {
  it("links to the disclaimer in the README of the repository", () => {
    expect(
      disclaimerUrlFrom({
        VITE_REPOSITORY_URL: "https://github.com/Friedinger/handsum/",
      }),
    ).toBe("https://github.com/Friedinger/handsum#-disclaimer");
  });

  it("gives no link without a valid https repository address", () => {
    expect(disclaimerUrlFrom({})).toBeNull();
    expect(
      disclaimerUrlFrom({ VITE_REPOSITORY_URL: "javascript:alert(1)" }),
    ).toBeNull();
  });
});
