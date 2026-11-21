import { NavLink, Outlet, useLoaderData } from "react-router";
import { listNotes } from "../notes";

export async function loader() {
  return { notes: await listNotes() };
}

export default function NotesLayout() {
  const { notes } = useLoaderData<typeof loader>();

  return (
    // From lg up, the list sits in the left gutter beside the note's 60ch column.
    <div className="mt-9 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,60ch)_minmax(0,1fr)] lg:text-lg">
      <nav aria-label="Notes" className="px-5 md:px-7 text-base lg:col-start-1 lg:row-start-1">
        <ul className="grid gap-y-1">
          {notes.map((note) => (
            <li key={note.slug}>
              <NavLink
                to={`/n/${note.slug}`}
                className="text-gray-11 hover:text-gray-12 aria-[current=page]:text-gray-12 aria-[current=page]:font-medium"
              >
                {note.title}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="lg:col-start-2 lg:row-start-1">
        <Outlet />
      </div>
    </div>
  );
}
