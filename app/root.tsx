import { Links, Meta, Outlet, Scripts, useMatch } from "react-router";
import { EditMode } from "./components/edit-mode";
import { NotesLabel } from "./components/notes-label";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-olive-2">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const isNote = useMatch("/n/*");

  return (
    <>
      <header className="sticky top-0 z-10 w-full p-0 md:p-2">
        <div className="flex items-center h-16 px-5 bg-olive-2 md:bg-transparent">
          <div className="flex items-baseline gap-2">
            <h1 className="font-serif text-2xl translate-y-0.5 text-gray-11 hover:text-green-9 transition-colors">
              <a href="/">NaN</a>
            </h1>
            {/* The handwriting's baseline sits ~3px above the SVG's bottom edge, plus the h1's 2px nudge. */}
            {isNote && <NotesLabel className="h-5 w-auto translate-y-[5px] text-gray-9" />}
          </div>
        </div>
      </header>
      <Outlet />
      {import.meta.env.DEV && <EditMode />}
    </>
  );
}
