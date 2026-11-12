import type { en } from "@/data/strings/en";
import type { devMode } from "@/data/strings/en/devMode";

/** English is the reference: its texts are widened from literals to string, so other languages need the same keys, not the same words. */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer Args) => infer Result
    ? (...args: Args) => Widen<Result>
    : T extends object
      ? { readonly [Key in keyof T]: Widen<T[Key]> }
      : T;

export type Strings = Widen<typeof en>;

export type DevModeStrings = Widen<typeof devMode>;
