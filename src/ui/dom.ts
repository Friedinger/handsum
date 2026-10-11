type Child = Node | string | null | false;

interface ElementOptions {
  readonly className?: string;
  readonly attributes?: Readonly<Record<string, string>>;
  readonly onClick?: () => void;
}

export function element<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  options: ElementOptions = {},
  children: readonly Child[] = [],
): HTMLElementTagNameMap[Tag] {
  const created = document.createElement(tag);
  if (options.className) {
    created.className = options.className;
  }
  for (const [name, value] of Object.entries(options.attributes ?? {})) {
    created.setAttribute(name, value);
  }
  if (options.onClick) {
    created.addEventListener("click", options.onClick);
  }
  created.append(...children.filter((child) => child !== null && child !== false));
  return created;
}

export function button(label: string, onClick: () => void): HTMLButtonElement {
  return element("button", { attributes: { type: "button" }, onClick }, [label]);
}

export function checkbox(
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void,
): HTMLLabelElement {
  const input = element("input", { attributes: { type: "checkbox" } });
  input.checked = checked;
  input.addEventListener("change", () => {
    onChange(input.checked);
  });
  return element("label", {}, [input, ` ${label}`]);
}
