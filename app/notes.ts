import type { ComponentType } from "react";
import type { MDXProps } from "mdx/types";

export type NoteMetadata = {
  title: string;
  /** ISO date (YYYY-MM-DD), used to sort notes by most recent. */
  date?: string;
  description?: string;
};

type NoteModule = {
  default: ComponentType<MDXProps>;
  metadata?: NoteMetadata;
};

// Each note is its own chunk, so adding notes doesn't grow the bundle for every page.
const notes = import.meta.glob<NoteModule>("./notes/*.mdx");

export function loadNote(slug: string) {
  return notes[`./notes/${slug}.mdx`] as (() => Promise<NoteModule>) | undefined;
}

export async function listNotes() {
  const entries = await Promise.all(
    Object.entries(notes).map(async ([path, load]) => {
      const slug = path.slice("./notes/".length, -".mdx".length);
      const { metadata } = await load();
      return { slug, title: metadata?.title ?? slug, date: metadata?.date };
    }),
  );

  // Most recent first; undated notes go last.
  return entries.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}
