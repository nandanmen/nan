// Dev-only support for editing MDX prose directly in the browser.
//
// `rehypeSourceRanges` stamps each editable block (paragraphs, headings and simple list items)
// with the range of the MDX source its content came from, plus a hash of that source. The
// edit-mode UI (app/components/edit-mode.tsx) sends edited blocks back as markdown, and
// `mdxEditServer` splices them into the file at that range — refusing if the file has changed
// since the page was rendered, since the offsets would no longer line up.

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";

export const MDX_EDIT_ENDPOINT = "/__mdx-edit";

type Point = { offset?: number };
type Position = { start: Point; end: Point };
type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  position?: Position;
};
type VFileLike = { path?: string; value: unknown };

const BLOCKS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li"]);
// Inline elements the client knows how to turn back into markdown.
const INLINE = new Set(["strong", "em", "code", "a", "br"]);

function hashSource(source: string) {
  return createHash("sha1").update(source).digest("hex").slice(0, 12);
}

/** Whether every child can round-trip through the client's DOM → markdown serializer. */
function isSimpleInline(children: HastNode[]): boolean {
  return children.every((child) => {
    if (child.type === "text") return true;
    if (child.type === "element" && INLINE.has(child.tagName!)) {
      return isSimpleInline(child.children ?? []);
    }
    // JSX, expressions, images, nested blocks… can't be edited as plain prose.
    return false;
  });
}

function contentRange(children: HastNode[]) {
  const positioned = children.filter((child) => child.position?.start.offset !== undefined);
  // Anything without a source position must be insignificant whitespace (e.g. the newlines
  // remark-rehype inserts), otherwise it'd be lost when the range is replaced.
  const unpositioned = children.filter((child) => !positioned.includes(child));
  if (!positioned.length || unpositioned.some((c) => c.type !== "text" || c.value?.trim())) {
    return null;
  }
  return {
    start: positioned[0].position!.start.offset!,
    end: positioned.at(-1)!.position!.end.offset!,
  };
}

export function rehypeSourceRanges({ root }: { root: string }) {
  return (tree: HastNode, file: VFileLike) => {
    if (!file.path) return;
    const source = String(file.value);
    const hash = hashSource(source);
    const relative = path.relative(root, file.path);

    const visit = (node: HastNode) => {
      const children = node.children ?? [];
      if (node.type === "element" && BLOCKS.has(node.tagName!) && isSimpleInline(children)) {
        const range = contentRange(children);
        if (range) {
          node.properties = {
            ...node.properties,
            dataSrcFile: relative,
            dataSrcStart: range.start,
            dataSrcEnd: range.end,
            dataSrcHash: hash,
          };
        }
        return;
      }
      children.forEach(visit);
    };
    visit(tree);
  };
}

type Edit = {
  /** The range of the block's content in the source. */
  start: number;
  end: number;
  /**
   * What the block becomes: one entry per block, in order. `null` keeps the block's original
   * source, extra entries are new blocks inserted after it, and an empty list deletes the block.
   */
  blocks: (string | null)[];
};

type SaveRequest = {
  file: string;
  /** The hash of the source the edits' ranges refer to. */
  hash: string;
  edits: Edit[];
};

const LIST_ITEM = /^(\s*)(?:([-*+])|(\d+)([.)]))(\s+)$/;
const BLOCKQUOTE = /^\s*(?:>\s*)+/;
// Everything that may sit between the start of a line and a block's content.
const BLOCK_PREFIX = /^\s*(?:>\s*)*(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+)?$/;

/** Applies an edit to the block whose content spans `start`–`end` of `source`. */
export function applyEdit(source: string, { start, end, blocks }: Edit) {
  const lineStart = source.lastIndexOf("\n", start - 1) + 1;
  const prefix = source.slice(lineStart, start);
  const listItem = prefix.match(LIST_ITEM);
  // Multi-line blocks (inserted components, code blocks) keep the block's indentation throughout.
  // The original source (`null`) is already indented.
  const indent = listItem
    ? " ".repeat(prefix.length)
    : (prefix.match(BLOCKQUOTE)?.[0] ?? prefix.match(/^\s*/)![0]);
  const contents = blocks
    .map((block) =>
      block === null ? source.slice(start, end) : block.trim().replace(/\n/g, `\n${indent}`),
    )
    .filter(Boolean);

  if (!contents.length) {
    // Delete the block along with its marker and the line break(s) separating it from the next.
    const from = BLOCK_PREFIX.test(prefix) ? lineStart : start;
    const after = source.slice(end).match(listItem ? /^\n/ : /^\n([ \t]*\n)*/);
    const rest = source.slice(end + (after?.[0].length ?? 0));
    // When nothing follows, drop the blank lines that separated it from the block before.
    const before = rest ? source.slice(0, from) : source.slice(0, from).replace(/\n\s*$/, "\n");
    return before + rest;
  }

  // New blocks continue the list they're in, otherwise they're paragraphs at the same depth.
  const separator = (index: number) => {
    if (listItem) {
      const [, indent, bullet, number, delimiter, space] = listItem;
      const marker = bullet ?? `${Number(number) + index}${delimiter}`;
      return `\n${indent}${marker}${space}`;
    }
    const quote = prefix.match(BLOCKQUOTE)?.[0];
    if (quote) return `\n${quote.trimEnd()}\n${quote}`;
    return `\n\n${prefix.match(/^\s*/)![0]}`;
  };

  const markdown = contents.map((content, i) => (i ? separator(i) : "") + content).join("");
  return source.slice(0, start) + markdown + source.slice(end);
}

/**
 * Applies several edits to different blocks of `source`, all made against that same source.
 * They're applied back to front, so each edit's range is still accurate when it's applied.
 */
export function applyEdits(source: string, edits: Edit[]) {
  return [...edits].sort((a, b) => b.start - a.start).reduce(applyEdit, source);
}

function isValidEdits(edits: unknown, length: number): edits is Edit[] {
  if (!Array.isArray(edits)) return false;
  const sorted = [...edits].sort((a, b) => a.start - b.start);
  return sorted.every(
    ({ start, end, blocks }, i) =>
      Number.isInteger(start) &&
      Number.isInteger(end) &&
      0 <= start &&
      start <= end &&
      end <= length &&
      Array.isArray(blocks) &&
      // No two edits may touch the same block.
      (i === 0 || sorted[i - 1].end < start),
  );
}

export function mdxEditServer(): Plugin {
  return {
    name: "mdx-edit-server",
    apply: "serve",
    configureServer(server) {
      const root = server.config.root;

      server.middlewares.use(MDX_EDIT_ENDPOINT, async (req, res) => {
        const reply = (status: number, body: object) => {
          res.statusCode = status;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(body));
        };

        if (req.method !== "POST") return reply(405, { error: "Method not allowed" });

        try {
          let raw = "";
          for await (const chunk of req) raw += chunk;
          const { file, hash, edits } = JSON.parse(raw) as SaveRequest;

          const absolute = path.resolve(root, file);
          if (!absolute.startsWith(root + path.sep) || !absolute.endsWith(".mdx")) {
            return reply(400, { error: "Not an MDX file in this project" });
          }

          const source = await readFile(absolute, "utf8");
          if (hashSource(source) !== hash) {
            return reply(409, {
              error: "The file changed since this page loaded. Reload and try again.",
            });
          }
          if (!isValidEdits(edits, source.length)) {
            return reply(400, { error: "Invalid edits" });
          }

          const updated = applyEdits(source, edits);
          const changed = updated !== source;
          if (changed) await writeFile(absolute, updated);
          // Without a change there's no HMR update coming, which the client needs to know.
          reply(200, { ok: true, changed });
        } catch (error) {
          reply(500, { error: error instanceof Error ? error.message : String(error) });
        }
      });
    },
  };
}
