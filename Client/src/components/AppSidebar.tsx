import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { AudioWaveform, BookOpen, Compass, Menu, MessagesSquare, NotebookPen, X } from "lucide-react";
import { pagePaths } from "../lib/navigation";

const destinations = [
  { id: "dashboard", label: "Dashboard", icon: Compass },
  { id: "reading", label: "Reading", icon: BookOpen },
  { id: "notes", label: "Notebook", icon: NotebookPen },
  { id: "companion", label: "Companion", icon: MessagesSquare },
] as const;
type Destination = typeof destinations[number]["id"];
const compactNavigation = "(max-width: 700px), (hover: none), (max-height: 360px)";

export function AppSidebar({ page, follow, account }: {
  page: Destination | "not-found";
  follow: (event: MouseEvent<HTMLAnchorElement>, next: Destination) => boolean;
  account: ReactNode;
}) {
  const rail = useRef<HTMLElement>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  const drawerClose = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [dismissExpansion, setDismissExpansion] = useState(false);
  useEffect(() => {
    const compact = matchMedia(compactNavigation);
    function resize(event: MediaQueryListEvent) {
      if (!event.matches) drawer.current?.close();
    }
    function dismiss(event: KeyboardEvent) {
      if (event.key === "Escape" && rail.current?.matches(":hover, :focus-within")) setDismissExpansion(true);
    }
    compact.addEventListener("change", resize);
    window.addEventListener("keydown", dismiss);
    return () => {
      compact.removeEventListener("change", resize);
      window.removeEventListener("keydown", dismiss);
    };
  }, []);

  const brand = <a className="rail-action rail-brand" href="/" aria-label="SWARA home" onClick={event => {
    if (follow(event, "dashboard")) drawer.current?.close();
  }}><AudioWaveform size={20} aria-hidden="true" /><span className="rail-label" aria-hidden="true">swara.</span></a>;
  const links = <nav aria-label="Main navigation">
    {destinations.map(({ id, label, icon: Icon }) => <a key={id} href={pagePaths[id]} className="rail-action"
      aria-label={label} aria-current={page === id ? "page" : undefined} onClick={event => { if (follow(event, id)) drawer.current?.close(); }}>
      <Icon size={20} aria-hidden="true" /><span className="rail-label" aria-hidden="true">{label}</span>
    </a>)}
  </nav>;

  return <>
    <aside ref={rail} className="app-rail" aria-label="SWARA sidebar" data-dismiss-expansion={dismissExpansion || undefined}
      onFocus={() => setDismissExpansion(false)} onPointerEnter={() => setDismissExpansion(false)}>
      {brand}{links}<div className="rail-footer">{account}</div>
    </aside>
    <button type="button" className="rail-toggle" aria-label="Open navigation" aria-haspopup="dialog" aria-expanded={open}
      aria-controls="mobile-navigation" onClick={() => {
        drawer.current?.showModal();
        drawerClose.current?.focus();
        setOpen(true);
      }}><Menu size={21} aria-hidden="true" /></button>
    <dialog id="mobile-navigation" className="rail-drawer" ref={drawer} aria-label="SWARA sidebar" onClose={() => setOpen(false)}
      onClick={event => { if (event.target === event.currentTarget) drawer.current?.close(); }}>
      <div className="rail-drawer-content">
        <div className="rail-drawer-header">{brand}<button ref={drawerClose} type="button" aria-label="Close navigation" onClick={() => drawer.current?.close()}><X size={20} aria-hidden="true" /></button></div>
        {links}
        <div className="rail-footer" onClick={event => {
          if (event.target instanceof Element && event.target.closest("button")) drawer.current?.close();
        }}>{account}</div>
      </div>
    </dialog>
  </>;
}
