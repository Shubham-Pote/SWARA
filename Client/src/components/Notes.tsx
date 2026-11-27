import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowLeft, ArrowRight, Feather, Search, Star, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { ApiError, type Language } from "../lib/companion";
import { deleteNote, matchesNote, noteExcerpt, starNote, type Note } from "../lib/notes";
import { fromNote, newPageId, pageTitle } from "../lib/notebookDraft";
import { useNotebook } from "../lib/useNotebook";
import { NoteComposer } from "./NoteComposer";
import "./notes.css";

type Props = {
  accountId?: string;
  token: string | null;
  language: Language;
  restoring: boolean;
  accountUnavailable: boolean;
  onSignIn: () => void;
  onExpired: () => void;
  onRead: (event: MouseEvent<HTMLAnchorElement>, articleId?: string) => void;
};

const noteFilters = ["All notes", "Starred", "Vocabulary"] as const;
type NoteFilter = typeof noteFilters[number];
type Review = { label: string; notes: Note[]; index: number };
const noteDate = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export default function Notes(props: Props) {
  if (props.accountId && props.token) {
    return (
      <div className="folio" data-language={props.language}>
        <Book
          key={props.accountId + props.language}
          {...props}
          token={props.token}
          accountId={props.accountId}
        />
      </div>
    );
  }
  if (props.accountUnavailable) return null;
  if (props.restoring) return <p role="status">Opening your notebook…</p>;
  return (
    <section className="folio folio-guest" aria-labelledby="workspace-title">
      <p>Sign in to save writing, vocabulary, and notes from your readings.</p>
      <button className="swara-action" onClick={props.onSignIn}>
        Sign in <ArrowRight aria-hidden="true" />
      </button>
    </section>
  );
}
function Book({
  accountId,
  token,
  language,
  onExpired,
  onRead,
}: Props & { accountId: string; token: string }) {
  const book = useNotebook(accountId, token, language, onExpired);
  const readId = () => /^#page-([a-f0-9]{24})$/.exec(location.hash)?.[1] ?? "";
  const [id, setId] = useState(readId);
  const [blank, setBlank] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NoteFilter>("All notes");
  const [review, setReview] = useState<Review | null>(null);
  const [revealed, reveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const confirm = useRef<HTMLDialogElement>(null);
  const openPage = useRef(id);
  const reviewIndex = review?.index;
  const returnTo = useRef("");
  const overviewScroll = useRef(0);
  const searchInput = useRef<HTMLInputElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const pathname = location.pathname;
    const read = () => {
      if (location.pathname !== pathname) return;
      const next = readId();
      if (openPage.current && !next) {
        returnTo.current = openPage.current;
        setBlank("");
      }
      openPage.current = next;
      setId(next);
      setReview(null);
      setError("");
    };
    window.addEventListener("popstate", read);
    window.addEventListener("hashchange", read);
    return () => {
      window.removeEventListener("popstate", read);
      window.removeEventListener("hashchange", read);
    };
  }, []);
  useEffect(() => {
    if (id || !returnTo.current) return;
    window.scrollTo(0, overviewScroll.current);
    (document.getElementById("entry-" + returnTo.current) ?? document.getElementById("write-note"))?.focus({ preventScroll: true });
    returnTo.current = "";
  }, [id]);
  useEffect(() => {
    if (reviewIndex !== undefined) reviewHeading.current?.focus();
  }, [reviewIndex]);
  function closeReview() {
    setReview(null);
    requestAnimationFrame(() => {
      window.scrollTo(0, overviewScroll.current);
      reviewButton.current?.focus({ preventScroll: true });
    });
  }
  function open(next: string) {
    if (!id && !review) overviewScroll.current = window.scrollY;
    if (id) history.replaceState(history.state, "", "#page-" + next);
    else history.pushState({ notebook: true }, "", "#page-" + next);
    openPage.current = next;
    setId(next);
    setReview(null);
    setError("");
    window.scrollTo(0, 0);
  }
  function back() {
    if (local && !saved && !local.pending && !local.content.trim() && !local.title.trim()) book.discard(id);
    if (history.state?.notebook) { history.back(); return; }
    history.replaceState(null, "", location.pathname + location.search);
    returnTo.current = id;
    openPage.current = "";
    setBlank("");
    setId("");
    setError("");
  }
  const saved = book.notes.find((n) => n._id === id);
  const local = book.drafts.find((d) => d.id === id);
  const draft = local ?? { ...fromNote(saved), id };
  const savedIds = new Set(book.notes.map(note => note._id));
  const drafts = new Map(book.drafts.map(draft => [draft.id, draft]));
  const entries = new Map(book.notes.map((n) => [n._id, n]));
  for (const d of book.drafts)
    entries.set(d.id, {
      ...entries.get(d.id),
      _id: d.id,
      title: pageTitle(d),
      content: d.content,
      language,
      topic: d.topic || undefined,
      tags: d.tags,
      updatedAt: d.updatedAt,
      derivedTitle: !d.title.trim(),
    });
  const sorted = [...entries.values()].sort((a, b) =>
    (b.updatedAt ?? b.createdAt ?? "").localeCompare(a.updatedAt ?? a.createdAt ?? ""),
  );
  const filtered = sorted.filter(note => filter === "All notes" ||
    (filter === "Starred" ? note.starred : note.topic === "Vocabulary"));
  const visible = filtered.filter(note => matchesNote(note, query));
  const reviewable = filter === "All notes" ? [] : visible.filter(note => noteExcerpt(note));
  const reviewLabel = filter === "Vocabulary" ? "Vocabulary review" : "Starred review";
  function create() {
    const next = newPageId();
    setFilter("All notes");
    setQuery("");
    setBlank(next);
    open(next);
  }
  async function action(target: string, remove: boolean) {
    if (busy) return;
    const resume = book.pauseSave(target);
    if (!resume) return;
    setBusy(true);
    setError("");
    try {
      if (remove) {
        if (savedIds.has(target)) await deleteNote(token, target, new AbortController().signal);
        book.discard(target);
        book.setNotes((old) => old.filter((n) => n._id !== target));
        if (confirm.current?.open && openPage.current === target) {
          confirm.current.close();
          back();
        }
      } else {
        const starControl = "star-" + target;
        const fromCollection = document.activeElement?.id === starControl;
        const { starred } = await starNote(token, target, new AbortController().signal);
        book.setNotes((old) => old.map((n) => (n._id === target ? { ...n, starred } : n)));
        if (fromCollection) requestAnimationFrame(() => {
          if (document.activeElement === document.body || document.activeElement?.id === starControl)
            (document.getElementById(starControl) ?? document.getElementById("starred-notes"))?.focus({ preventScroll: true });
        });
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onExpired();
      else setError(remove ? "Could not remove this note. Try again." : "Could not update the star. Try again.");
    } finally {
      resume();
      setBusy(false);
    }
  }
  const transition = {
    initial: reduced ? false : { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.16 },
  } as const;
  function row(n: Note) {
    const snippet = noteExcerpt(n);
    const local = drafts.get(n._id);
    const date = n.updatedAt ?? n.createdAt;
    return (
      <li key={n._id}>
        <a
          id={"entry-" + n._id}
          href={"#page-" + n._id}
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            open(n._id);
          }}
        >
          <div className="folio-note-text">
            <strong className="folio-note-title" dir="auto">{n.title}</strong>
            {snippet && <p dir="auto">{snippet.replace(/\s+/gu, " ")}</p>}
            <div className="folio-note-meta">
              {local ? <small>Draft</small> : n.topic && <small>{n.topic}</small>}
              {date && Number.isFinite(Date.parse(date)) && <time dateTime={date}>{noteDate.format(new Date(date))}</time>}
            </div>
          </div>
        </a>
        {savedIds.has(n._id) && <button id={"star-" + n._id} className="folio-star" type="button"
          aria-label={`Star note: ${n.title}`} aria-pressed={!!n.starred} disabled={busy || !!local?.pending}
          onClick={() => void action(n._id, false)}>
          <Star fill={n.starred ? "currentColor" : "none"} aria-hidden="true" />
        </button>}
      </li>
    );
  }
  if (id && (local || saved || id === blank))
    return (
      <motion.div key={id} className="folio-page" {...transition}>
        <NoteComposer
          draft={draft}
          fresh={!saved}
          focusBody={id === blank}
          language={language}
          readingId={saved?.readingId}
          onRead={onRead}
          starred={!!saved?.starred}
          busy={busy || !!local?.pending}
          status={book.statuses[id] ?? { text: local ? "Recovered on this device" : saved ? "Saved" : "" }}
          error={confirm.current?.open ? "" : error}
          change={book.change}
          back={() => {
            void book.flush(id);
            back();
          }}
          retry={() => void book.flush(id)}
          copy={() => open(book.keepCopy(draft))}
          star={() => void action(id, false)}
          remove={() => confirm.current?.showModal()}
        />
        <dialog ref={confirm} className="swara-paper folio-confirm" aria-labelledby="delete-page-title" onCancel={event => { if (busy) event.preventDefault(); }}>
          <h2 id="delete-page-title">{saved ? "Delete this note?" : "Discard this draft?"}</h2>
          <div className="folio-confirm-actions">
            <button className="swara-action swara-action--quiet" autoFocus disabled={busy} onClick={() => confirm.current?.close()}>
              Keep writing
            </button>
            <button className="swara-action swara-action--danger" disabled={busy || !!local?.pending} onClick={() => void action(id, true)}>
              {saved ? "Delete note" : "Discard draft"}
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
        </dialog>
      </motion.div>
    );
  if (id)
    return (
      <section className="swara-paper folio-welcome folio-page">
        <h2>{book.loading ? "Opening page…" : "Page unavailable"}</h2>
        {!book.loading && (book.loadError ? <p role="alert">Couldn’t load this page. <button onClick={book.retryLoad}>Try again</button></p> :
          <p>This note may have been removed or belong to another practice language.</p>)}
        <button onClick={back}>Back to notebook</button>
      </section>
    );
  const reviewing = review?.notes[review.index];
  if (review !== null)
    return (
      <motion.section className="swara-paper writing-sheet folio-page" {...transition}>
        <header className="sheet-tools">
          <button onClick={closeReview}>
            <ArrowLeft /> Notebook
          </button>
        </header>
        <div className="sheet-content review-content">
          <p className="folio-label">
            {review.label}{reviewing && ` · ${review.index + 1} of ${review.notes.length}`}
          </p>
          <h2 ref={reviewHeading} tabIndex={-1}>{reviewing?.title ?? "Review complete"}</h2>
          {reviewing ? (
            <>
              <button className="swara-action swara-action--quiet" aria-expanded={revealed} aria-controls="review-note" onClick={() => reveal(!revealed)}>
                {revealed ? "Hide note" : "Reveal note"}
              </button>
              <p id="review-note" className="review-body" hidden={!revealed}>
                {noteExcerpt(reviewing)}
              </p>
              <div className="review-actions">
                {review.index > 0 && <button onClick={() => { setReview({ ...review, index: review.index - 1 }); reveal(false); }}><ArrowLeft aria-hidden="true" /> Previous</button>}
                <button onClick={() => { setReview({ ...review, index: review.index + 1 }); reveal(false); }}>
                  {review.index + 1 === review.notes.length ? "Finish review" : "Next note"} <ArrowRight aria-hidden="true" />
                </button>
                <a href={"#page-" + reviewing._id} onClick={event => {
                  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  open(reviewing._id);
                }}>Open note</a>
              </div>
            </>
          ) : (
            <>
              <p>{review.notes.length} {review.notes.length === 1 ? "note" : "notes"} in this review.</p>
              <button className="swara-action" onClick={closeReview}>Return to notebook</button>
            </>
          )}
        </div>
      </motion.section>
    );
  return (
    <motion.section {...transition} className="folio-overview" aria-labelledby="workspace-title">
      {book.loadError && (
        <p role="alert">
          Couldn’t load saved notes. <button onClick={book.retryLoad}>Try again</button>
        </p>
      )}
      <div className="folio-controls">
        {!!sorted.length && (
          <div className="folio-search">
            <Search aria-hidden="true" />
            <input
              ref={searchInput}
              type="search"
              aria-label="Search notes"
              placeholder="Search notes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && query) setQuery("");
              }}
            />
            {query && (
              <button
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  searchInput.current?.focus();
                }}
              >
                <X aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        <button className="swara-action" id="write-note" onClick={create}>
          <Feather aria-hidden="true" /> New note
        </button>
      </div>
      {!!sorted.length && <div className="folio-filter-bar">
        <div className="folio-filters" role="group" aria-label="Filter notes">
          {noteFilters.map(option => <button key={option} id={option === "Starred" ? "starred-notes" : undefined}
            type="button" aria-pressed={option === filter} onClick={() => { setFilter(option); setError(""); }}>
            {option}
          </button>)}
        </div>
        {reviewable.length > 0 && <button ref={reviewButton} className="folio-review" type="button" onClick={() => {
          overviewScroll.current = window.scrollY;
          setReview({ label: reviewLabel, notes: reviewable, index: 0 });
          reveal(false);
          window.scrollTo(0, 0);
        }}>
          {filter === "Vocabulary" ? "Review vocabulary" : "Review starred"} <ArrowRight aria-hidden="true" />
        </button>}
      </div>}
      {error && <p className="folio-feedback" role="alert">{error}</p>}
      {book.loading && !sorted.length ? (
        <p role="status">Opening your pages…</p>
      ) : !sorted.length ? (
        !book.loadError && <div className="swara-paper folio-empty">
          <h2>Your first page</h2>
          <p>Write a phrase you want to use again, or collect a word from your next reading.</p>
          <a href="/reading" onClick={event => onRead(event)}>
            Open Reading Desk <ArrowRight />
          </a>
        </div>
      ) : !visible.length ? (
        <div className="swara-paper folio-empty folio-no-results" role="status">
          <h2>{query.trim() ? "No matching notes" : filter === "Starred" ? "No starred notes" : "No vocabulary notes"}</h2>
          <p>{query.trim() ? "Try another word or change the filter." : filter === "Starred"
            ? "Star a note to find it here and review it later."
            : "Save a word from Reading Desk or set a note’s topic to Vocabulary."}</p>
          {!query.trim() && filter === "Vocabulary" && <a href="/reading" onClick={event => onRead(event)}>Open Reading Desk <ArrowRight aria-hidden="true" /></a>}
        </div>
      ) : (
        <div className="swara-paper folio-pages">
          {query.trim() && (
            <p className="sr-only" role="status">
              {visible.length} matching notes
            </p>
          )}
          {filter === "All notes" && visible.some(note => note.starred) ? ([true, false] as const).map((pinned) => {
            const group = visible.filter((n) => !!n.starred === pinned);
            return (
              group.length > 0 && (
                <section className="folio-group" key={String(pinned)}>
                  <h2>{pinned ? "Starred" : "Recent"}</h2>
                  <ul>{group.map(row)}</ul>
                </section>
              )
            );
          }) : <section className="folio-group" aria-label={filter}><ul>{visible.map(row)}</ul></section>}
        </div>
      )}
    </motion.section>
  );
}
