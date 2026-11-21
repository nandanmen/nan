import { useEffect } from "react";

// Dev-only: prose rendered from MDX is always editable in place. Blocks are tagged with their
// source range by the rehype plugin in vite/mdx-edit.ts, and edits are written back through its
// middleware. Vite's HMR then re-renders the page from the updated file.
//
// Saves are optimistic: the edited text stays on screen until that re-render arrives. React's own
// DOM is restored (and hidden) straight away so it can reconcile the update, with a copy of the
// edit shown in its place in the meantime.
//
// Each source block being edited forms a "group": the block itself plus any new blocks split off
// it with Enter. Changed groups are kept as drafts until "Save changes" (or ⌘S) in the toolbar at
// the bottom, which saves all of them at once: one request per file, so their offsets agree.

const ENDPOINT = "/__mdx-edit";
const SOURCE_BLOCK = "[data-src-start]";
const NEW_BLOCK = "[data-mdx-new]";
const EDITABLE = `${SOURCE_BLOCK}, ${NEW_BLOCK}`;

type Command = {
  label: string;
  /** The MDX to insert. Inside a Scroller, buttons dispatch to its figure. */
  mdx: (context: { inScroller: boolean }) => string;
};

// Offered by typing "/" in a paragraph or heading. Each one is inserted as its own block.
const COMMANDS: Command[] = [
  {
    label: "Button",
    mdx: ({ inScroller }) =>
      inScroller
        ? `<ScrollerButton onClick={{ type: "" }}>Button</ScrollerButton>`
        : `<Button>Button</Button>`,
  },
  {
    label: "Toolbar",
    mdx: ({ inScroller }) =>
      inScroller
        ? `<Toolbar>\n  <ScrollerButton onClick={{ type: "" }} render={<Toolbar.Button />}>\n    Button\n  </ScrollerButton>\n</Toolbar>`
        : `<Toolbar>\n  <Toolbar.Button>Button</Toolbar.Button>\n</Toolbar>`,
  },
  { label: "Code block", mdx: () => "```ts\n// code\n```" },
];

export function EditMode() {
  useEffect(enableEditing, []);
  return null;
}

type Group = {
  block: HTMLElement;
  snapshot: Snapshot;
  added: HTMLElement[];
  /** Set when the source block itself was deleted (Backspace or the × button). */
  removed: boolean;
};

function enableEditing() {
  const root = document.documentElement;
  root.dataset.mdxEditing = "";

  const makeEditable = () => {
    for (const el of document.querySelectorAll<HTMLElement>(SOURCE_BLOCK)) {
      if (el.contentEditable !== "true") el.contentEditable = "true";
    }
  };
  makeEditable();
  // Saves waiting on their HMR update, by the file and hash they were made against.
  const pending = new Set<{ file: string; hash: string; settle: () => void }>();
  const settleArrived = () => {
    for (const save of pending) {
      // Once React re-renders from the new source, no block carries the old hash any more.
      const selector = `[data-src-file="${CSS.escape(save.file)}"][data-src-hash="${CSS.escape(save.hash)}"]`;
      if (!document.querySelector(selector)) save.settle();
    }
  };

  // Pick up blocks that mount later (lazy notes, client navigation, HMR), and notice updates.
  const observer = new MutationObserver(() => {
    makeEditable();
    settleArrived();
    // Drop drafts whose blocks are gone, e.g. after navigating to another page.
    for (const group of groups.values()) {
      if (!group.block.isConnected) groups.delete(group.block);
    }
    refresh();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-src-hash"],
  });

  const groups = new Map<HTMLElement, Group>();
  const members = (group: Group) => [...(group.removed ? [] : [group.block]), ...group.added];
  const groupOf = (el: HTMLElement) =>
    [...groups.values()].find((group) => group.block === el || group.added.includes(el));
  const editableOf = (target: EventTarget | null) =>
    target instanceof Element ? target.closest<HTMLElement>(EDITABLE) : null;

  const isDirty = (group: Group) =>
    group.removed ||
    group.block.innerHTML !== group.snapshot.html ||
    group.added.some((el) => el.textContent);

  const discard = (group: Group) => {
    groups.delete(group.block);
    for (const el of group.added) el.remove();
    // Hand the DOM back to React exactly as it rendered it.
    restoreSnapshot(group.snapshot);
    group.block.hidden = false;
    refresh();
  };

  /** What the group's block becomes, in the shape the server's `applyEdit` takes. */
  const editOf = ({ block, snapshot, added, removed }: Group) => {
    // Unchanged blocks keep their original source rather than being re-serialized.
    const first = removed
      ? []
      : [block.innerHTML === snapshot.html ? null : serializeInline(block)];
    return {
      start: Number(block.dataset.srcStart),
      end: Number(block.dataset.srcEnd),
      blocks: [...first, ...added.map(serializeBlock)],
    };
  };

  const saveAll = () => {
    closeMenu();
    (document.activeElement as HTMLElement | null)?.blur();

    const byFile = new Map<string, Group[]>();
    for (const group of groups.values()) {
      if (!isDirty(group)) continue;
      const file = group.block.dataset.srcFile ?? "";
      byFile.set(file, [...(byFile.get(file) ?? []), group]);
    }

    for (const [file, drafts] of byFile) {
      // Every block in a file carries the same hash.
      const hash = drafts[0].block.dataset.srcHash ?? "";
      const edits = drafts.map(editOf);
      const showEdits = drafts.map((group) => {
        groups.delete(group.block);
        return showOptimistically(group);
      });

      const timeout = setTimeout(() => settle(), 10_000); // In case the update never comes.
      const save = {
        file,
        hash,
        settle: () => {
          clearTimeout(timeout);
          pending.delete(save);
          for (const showEdit of showEdits) showEdit();
        },
      };
      const { settle } = save;
      // Registered before saving: the update can arrive before the response does.
      pending.add(save);
      send({ file, hash, edits }).then(
        (changed) => !changed && settle(),
        (error) => {
          settle();
          alert(`Couldn't save ${file}: ${error instanceof Error ? error.message : error}`);
        },
      );
    }
    refresh();
  };

  const discardAll = () => {
    closeMenu();
    (document.activeElement as HTMLElement | null)?.blur();
    for (const group of groups.values()) discard(group);
  };

  /** Splits `el` at the caret, moving everything after it into a new block below. */
  const split = (el: HTMLElement, group: Group, focus = true) => {
    const selection = getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.setEnd(el, el.childNodes.length);
    const rest = range.extractContents();

    // List items continue the list; everything else is followed by a paragraph.
    const added = document.createElement(group.block.tagName === "LI" ? "li" : "p");
    added.dataset.mdxNew = "";
    added.contentEditable = "true";
    added.appendChild(rest);
    if (!added.textContent) added.replaceChildren(document.createElement("br"));
    group.added.splice(group.added.indexOf(el) + 1, 0, added);
    el.parentNode!.insertBefore(added, el.nextSibling);
    if (focus) focusAt(added, "start");
    return added;
  };

  /** Removes an empty block, moving the caret to the end of the block before it. */
  const remove = (el: HTMLElement, group: Group) => {
    const editables = [...document.querySelectorAll<HTMLElement>(EDITABLE)];
    const previous = editables[editables.indexOf(el) - 1];
    if (el === group.block) group.removed = true;
    else group.added.splice(group.added.indexOf(el), 1);

    if (previous) focusAt(previous, "end");
    else el.blur();
    if (el === group.block) el.hidden = true;
    else el.remove();
    refresh();
  };

  // The "/" command menu, anchored to the slash that opened it.
  let menu: {
    el: HTMLElement;
    group: Group;
    node: Text;
    offset: number;
    items: Command[];
    active: number;
    box: HTMLElement;
  } | null = null;

  const closeMenu = () => {
    menu?.box.remove();
    menu = null;
  };

  const openMenu = (el: HTMLElement, group: Group, node: Text, offset: number) => {
    closeMenu();
    const box = document.body.appendChild(document.createElement("div"));
    box.className =
      "fixed z-50 grid min-w-40 rounded bg-white p-1 text-sm shadow ring ring-black/10";
    box.setAttribute("role", "listbox");
    menu = { el, group, node, offset, items: COMMANDS, active: 0, box };
    updateMenu();
  };

  /** Re-filters and repositions the menu, closing it once the caret leaves the "/query". */
  const updateMenu = () => {
    if (!menu) return;
    const { node, offset, box } = menu;
    const selection = getSelection();
    const caret = selection?.focusOffset ?? 0;
    const query =
      selection?.isCollapsed &&
      selection.focusNode === node &&
      caret > offset &&
      node.data[offset] === "/"
        ? node.data.slice(offset + 1, caret)
        : null;
    const normalized = query?.toLowerCase().replace(/\s+/g, "");
    const items = COMMANDS.filter((command) =>
      command.label
        .toLowerCase()
        .replace(/\s+/g, "")
        .includes(normalized ?? ""),
    );
    if (query === null || /\s/.test(query) || !items.length) return closeMenu();

    if (items.length !== menu.items.length) menu.active = 0;
    menu.items = items;
    box.replaceChildren(
      ...items.map((command, index) => {
        const option = document.createElement("button");
        option.type = "button";
        option.tabIndex = -1;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", String(index === menu!.active));
        option.className = "rounded px-2 py-1 text-left text-gray-12 aria-selected:bg-gray-3";
        option.textContent = command.label;
        // Keep focus (and the caret) in the block.
        option.addEventListener("mousedown", (event) => event.preventDefault());
        option.addEventListener("click", () => runCommand(command));
        return option;
      }),
    );

    const range = document.createRange();
    range.setStart(node, offset);
    const rect = range.getBoundingClientRect();
    const anchor = rect.height ? rect : menu.el.getBoundingClientRect();
    box.style.top = `${anchor.bottom + 4}px`;
    box.style.left = `${anchor.left}px`;
  };

  /** Replaces the "/query" with the command's component, splitting the block around it. */
  const runCommand = (command: Command) => {
    if (!menu) return;
    const { el, group, node, offset } = menu;
    closeMenu();

    const selection = getSelection()!;
    const range = document.createRange();
    range.setStart(node, offset);
    range.setEnd(selection.focusNode!, selection.focusOffset);
    range.deleteContents();
    selection.removeAllRanges();
    selection.addRange(range);
    const after = split(el, group, false);
    if (!after) return;

    const component = document.createElement("div");
    component.dataset.mdxRaw = command.mdx({ inScroller: !!el.closest("[data-scroller]") });
    component.className = "rounded border border-dashed border-gray-7 px-3 py-2 text-gray-9";
    component.textContent = command.label;
    group.added.splice(group.added.indexOf(after), 0, component);
    el.parentNode!.insertBefore(component, after);
    if (!after.textContent) {
      group.added.splice(group.added.indexOf(after), 1);
      after.remove();
    }
    // If the command was all the block held, the component takes its place.
    if (!el.textContent) {
      if (el === group.block) {
        group.removed = true;
        el.hidden = true;
      } else {
        group.added.splice(group.added.indexOf(el), 1);
        el.remove();
      }
    }

    // The component shows up once the draft is saved and the update renders it.
    el.blur();
    refresh();
  };

  const onInput = (event: Event) => {
    const el = editableOf(event.target);
    const group = el && groupOf(el);
    if (!el || !group) return;
    const { inputType, data } = event as InputEvent;
    const selection = getSelection();
    const node = selection?.focusNode;

    if (inputType === "insertText" && data === "/" && el.tagName !== "LI" && node instanceof Text) {
      const offset = selection!.focusOffset - 1;
      // Only at the start of a word, so slashes in prose (and/or, URLs) don't open it.
      if (offset === 0 || /\s/.test(node.data[offset - 1]))
        return openMenu(el, group, node, offset);
    }
    updateMenu();
    refresh();
  };

  // The toolbar at the bottom, shown while there are unsaved drafts.
  const bar = document.body.appendChild(document.createElement("div"));
  bar.hidden = true;
  bar.className =
    "fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white p-1 pl-4 text-sm shadow ring ring-black/10";
  const barLabel = bar.appendChild(document.createElement("span"));
  barLabel.className = "mr-2 text-gray-11 tabular-nums";
  const discardButton = bar.appendChild(document.createElement("button"));
  discardButton.type = "button";
  discardButton.className =
    "rounded-full px-3 py-1 text-gray-11 hover:bg-gray-3 hover:text-gray-12";
  discardButton.textContent = "Discard";
  discardButton.addEventListener("click", discardAll);
  const saveButton = bar.appendChild(document.createElement("button"));
  saveButton.type = "button";
  saveButton.className = "rounded-full bg-green-9 px-3 py-1 text-white hover:bg-green-10";
  saveButton.textContent = "Save changes";
  saveButton.addEventListener("click", saveAll);

  const countDrafts = () => [...groups.values()].filter(isDirty).length;
  function refresh() {
    const count = countDrafts();
    const label = `${count} unsaved ${count === 1 ? "change" : "changes"}`;
    // Only touch the DOM on a real change: the MutationObserver calls this, and would otherwise
    // be retriggered by its own write forever.
    if (bar.hidden !== !count) bar.hidden = !count;
    if (barLabel.textContent !== label) barLabel.textContent = label;
  }

  // The × button shown beside whichever block is hovered, for deleting it.
  const deleteButton = document.body.appendChild(document.createElement("button"));
  deleteButton.type = "button";
  deleteButton.hidden = true;
  deleteButton.tabIndex = -1;
  deleteButton.setAttribute("aria-label", "Delete block");
  deleteButton.className =
    "fixed z-50 grid size-6 place-items-center rounded-full bg-white text-gray-11 shadow ring ring-black/10 hover:bg-red-3 hover:text-red-11";
  deleteButton.innerHTML =
    '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg>';
  let hovered: HTMLElement | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  const positionDeleteButton = () => {
    if (!hovered?.isConnected || hovered.hidden) return hideDeleteButton();
    const rect = hovered.getBoundingClientRect();
    deleteButton.style.top = `${rect.top}px`;
    deleteButton.style.left = `${Math.min(rect.right + 8, window.innerWidth - 28)}px`;
    deleteButton.hidden = false;
  };
  const hideDeleteButton = () => {
    hovered = null;
    deleteButton.hidden = true;
  };

  const onMouseOver = (event: MouseEvent) => {
    if (deleteButton.contains(event.target as Node)) return clearTimeout(hideTimer);
    const el = editableOf(event.target);
    if (el) {
      clearTimeout(hideTimer);
      hovered = el;
      return positionDeleteButton();
    }
    // A grace period, so the pointer can cross the gap between the block and the button.
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideDeleteButton, 200);
  };

  /** Deletes a block: new blocks just go away, source blocks are removed from the file. */
  const deleteBlock = (el: HTMLElement) => {
    if (menu?.el === el) closeMenu();
    const group = groupOf(el);
    if (group && el !== group.block) {
      group.added.splice(group.added.indexOf(el), 1);
      el.remove();
    } else {
      const target = group ?? { block: el, snapshot: takeSnapshot(el), added: [], removed: false };
      target.removed = true;
      groups.set(el, target);
      if (el.contains(document.activeElement)) el.blur();
      el.hidden = true;
    }
    refresh();
  };

  // Keep focus where it is; the block under the button might be the one being edited.
  deleteButton.addEventListener("mousedown", (event) => event.preventDefault());
  deleteButton.addEventListener("click", () => {
    const el = hovered;
    hideDeleteButton();
    if (el) deleteBlock(el);
  });

  const onFocusIn = (event: FocusEvent) => {
    const el = editableOf(event.target);
    if (el?.matches(SOURCE_BLOCK) && !groups.has(el)) {
      groups.set(el, { block: el, snapshot: takeSnapshot(el), added: [], removed: false });
    }
  };

  const onFocusOut = (event: FocusEvent) => {
    closeMenu();
    const el = editableOf(event.target);
    const group = el && groupOf(el);
    if (!group) return;
    const next = editableOf(event.relatedTarget);
    if (next && members(group).includes(next)) return;
    // Changed groups stay as drafts until they're saved.
    if (!isDirty(group)) discard(group);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "s" && countDrafts()) {
      event.preventDefault();
      return saveAll();
    }
    const el = editableOf(event.target);
    const group = el && groupOf(el);
    if (!el || !group || event.isComposing) return;

    if (menu) {
      const { items, active } = menu;
      if (event.key === "ArrowDown") menu.active = (active + 1) % items.length;
      else if (event.key === "ArrowUp") menu.active = (active - 1 + items.length) % items.length;
      else if (event.key === "Enter" || event.key === "Tab") runCommand(items[active]);
      // Escape only closes the menu here, rather than discarding the edit.
      else if (event.key === "Escape") closeMenu();
      else return;
      event.preventDefault();
      return updateMenu();
    }

    if (event.key === "Enter") {
      event.preventDefault();
      split(el, group);
    } else if (event.key === "Backspace" && !el.textContent) {
      event.preventDefault();
      remove(el, group);
    } else if (event.key === "Escape") {
      // Reverts this block's draft.
      event.preventDefault();
      discard(group);
      (document.activeElement as HTMLElement | null)?.blur();
    }
  };

  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (countDrafts()) event.preventDefault();
  };

  const onPaste = (event: ClipboardEvent) => {
    if (!editableOf(event.target)) return;
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain").replace(/\s*\n\s*/g, " ") ?? "";
    document.execCommand("insertText", false, text);
  };

  document.addEventListener("focusin", onFocusIn);
  document.addEventListener("focusout", onFocusOut);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("paste", onPaste);
  document.addEventListener("input", onInput);
  document.addEventListener("mouseover", onMouseOver);
  document.addEventListener("selectionchange", updateMenu);
  window.addEventListener("beforeunload", onBeforeUnload);
  const onScroll = () => {
    updateMenu();
    if (hovered) positionDeleteButton();
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  const style = document.head.appendChild(document.createElement("style"));
  style.textContent = `
    [data-mdx-editing] :is(${EDITABLE}) { outline: 1px dashed transparent; outline-offset: 4px; border-radius: 2px; }
    [data-mdx-editing] :is(${EDITABLE}):hover { outline-color: var(--color-gray-7, #bbb); }
    [data-mdx-editing] :is(${EDITABLE}):focus { outline: 2px solid var(--color-green-9, #30a46c); }
  `;

  return () => {
    delete root.dataset.mdxEditing;
    observer.disconnect();
    document.removeEventListener("focusin", onFocusIn);
    document.removeEventListener("focusout", onFocusOut);
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("paste", onPaste);
    document.removeEventListener("input", onInput);
    document.removeEventListener("mouseover", onMouseOver);
    clearTimeout(hideTimer);
    deleteButton.remove();
    document.removeEventListener("selectionchange", updateMenu);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("beforeunload", onBeforeUnload);
    bar.remove();
    closeMenu();
    style.remove();
    for (const group of groups.values()) discard(group);
    for (const save of pending) save.settle();
    for (const el of document.querySelectorAll<HTMLElement>(SOURCE_BLOCK)) {
      el.removeAttribute("contenteditable");
    }
  };
}

function focusAt(el: HTMLElement, edge: "start" | "end") {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(edge === "start");
  const selection = getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/**
 * Hands the group's DOM back to React (hidden) and shows a static copy of the edit in its place.
 * Returns a function that removes the copy and unhides React's DOM, for once the update arrives.
 */
function showOptimistically({ block, snapshot, added, removed }: Group) {
  const copies: HTMLElement[] = [];
  if (!removed) {
    const copy = block.cloneNode(true) as HTMLElement;
    for (const { name } of [...copy.attributes]) {
      if (name.startsWith("data-src-") || name === "contenteditable") copy.removeAttribute(name);
    }
    copies.push(copy);
  }
  // Added blocks were never React's, so they can stay where they are as copies themselves.
  for (const el of added) {
    if (!el.textContent) {
      el.remove();
      continue;
    }
    el.removeAttribute("contenteditable");
    delete el.dataset.mdxNew;
    copies.push(el);
  }

  restoreSnapshot(snapshot);
  block.hidden = true;
  if (!removed) block.parentNode!.insertBefore(copies[0], block.nextSibling);

  return () => {
    for (const copy of copies) copy.remove();
    block.hidden = false;
  };
}

type SaveRequest = {
  file: string;
  hash: string;
  edits: { start: number; end: number; blocks: (string | null)[] }[];
};

/** Saves a file's edits, resolving to whether it changed (and so whether an update is coming). */
async function send(request: SaveRequest) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string; changed?: boolean };
  if (!response.ok) throw new Error(body.error ?? response.statusText);
  return body.changed !== false;
}

// Snapshots record every node in a block's subtree (and each text node's contents), so the
// block can be restored using the *same* DOM nodes React is holding on to.
type Snapshot = {
  html: string;
  nodes: { node: Node; children: Node[]; data: string | null }[];
};

function takeSnapshot(block: HTMLElement): Snapshot {
  const nodes: Snapshot["nodes"] = [];
  const walk = (node: Node) => {
    nodes.push({
      node,
      children: Array.from(node.childNodes),
      data: node.nodeType === Node.TEXT_NODE ? (node as Text).data : null,
    });
    node.childNodes.forEach(walk);
  };
  walk(block);
  return { html: block.innerHTML, nodes };
}

function restoreSnapshot({ nodes }: Snapshot) {
  for (const { node, children, data } of nodes) {
    if (data !== null) (node as Text).data = data;
    else (node as Element).replaceChildren(...children);
  }
}

// DOM → markdown, for the inline subset the rehype plugin allows to be edited.

function escapeText(text: string) {
  return text.replace(/\u00a0/g, " ").replace(/[\\`*_[\]{}<]/g, "\\$&");
}

/** Wraps `inner` in `marker`, keeping surrounding whitespace outside so the markers still parse. */
function wrap(inner: string, marker: string) {
  const match = inner.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
  return match[2] ? `${match[1]}${marker}${match[2]}${marker}${match[3]}` : inner;
}

/** A block's markdown: raw MDX for inserted components, otherwise its inline content. */
function serializeBlock(el: HTMLElement) {
  return el.dataset.mdxRaw ?? serializeInline(el);
}

function serializeInline(node: Node): string {
  return Array.from(node.childNodes).map(serializeNode).join("").trim();
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeText((node as Text).data);
  if (!(node instanceof HTMLElement)) return "";

  switch (node.tagName.toLowerCase()) {
    case "strong":
    case "b":
      return wrap(serializeInlineRaw(node), "**");
    case "em":
    case "i":
      return wrap(serializeInlineRaw(node), "_");
    case "code": {
      const text = node.textContent ?? "";
      const fence = text.includes("`") ? "``" : "`";
      return text ? `${fence}${text}${fence}` : "";
    }
    case "a": {
      const inner = serializeInlineRaw(node);
      return inner ? `[${inner}](${node.getAttribute("href") ?? ""})` : "";
    }
    case "br":
      // Browsers leave a trailing <br> in edited blocks; a mid-block one becomes a space.
      return node.nextSibling ? " " : "";
    default:
      return serializeInlineRaw(node);
  }
}

/** Like `serializeInline`, but keeps edge whitespace (it matters between inline elements). */
function serializeInlineRaw(node: Node): string {
  return Array.from(node.childNodes).map(serializeNode).join("");
}
