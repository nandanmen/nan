import { type ComponentType, Suspense, lazy } from "react";
import type { MDXProps } from "mdx/types";
import { data, useLoaderData } from "react-router";
import type { Route } from "./+types/note";
import { mdxComponents } from "../components/mdx-components";
import { loadNote } from "../notes";

const lazyNotes = new Map<string, ComponentType<MDXProps>>();

function getNoteComponent(slug: string) {
  let Note = lazyNotes.get(slug);
  if (!Note) {
    Note = lazy(loadNote(slug)!);
    lazyNotes.set(slug, Note);
  }
  return Note;
}

export async function loader({ params }: Route.LoaderArgs) {
  const load = loadNote(params.note);
  if (!load) throw data("Note not found", { status: 404 });

  const { metadata } = await load();
  return {
    slug: params.note,
    title: metadata?.title ?? params.note,
    description: metadata?.description,
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Note not found" }];

  return [
    { title: loaderData.title },
    ...(loaderData.description ? [{ name: "description", content: loaderData.description }] : []),
  ];
}

export default function Note() {
  const { slug, title } = useLoaderData<typeof loader>();
  const Content = getNoteComponent(slug);

  return (
    <main className="text-lg leading-relaxed pt-16 pb-32 px-5 lg:pt-1.5 lg:px-0">
      <article className="max-w-[60ch] mx-auto grid gap-y-6 [&_:not(pre)>code]:bg-white [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:rounded-sm [&_:not(pre)>code]:ring-1 [&_:not(pre)>code]:ring-black/15 [&_:not(pre)>code]:text-[0.875em]">
        <h1 className="text-4xl font-serif">{title}</h1>
        <Suspense>
          <Content components={mdxComponents} />
        </Suspense>
      </article>
    </main>
  );
}
