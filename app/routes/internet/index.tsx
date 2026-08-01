import InternetContent from "./page.mdx";

export function meta() {
  return [
    { title: "The Internet" },
    {
      name: "description",
      content: "An introduction to how the internet connects the world.",
    },
  ];
}

export default function Internet() {
  return (
    <main className="content-page">
      <article>
        <InternetContent />
      </article>
    </main>
  );
}
