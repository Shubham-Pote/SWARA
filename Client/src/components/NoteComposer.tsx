import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowLeft, Check, Pencil, Star, Trash2 } from "lucide-react";
import { noteLimits, noteTopics } from "../lib/notes";
import { pageTitle, type Draft } from "../lib/notebookDraft";
import { readingPath } from "../lib/navigation";
import type { Language } from "../lib/companion";
import type { NoteSaveStatus } from "../lib/useNotebook";

type Props = {
  readingId?: string;
  onRead: (event: MouseEvent<HTMLAnchorElement>, articleId: string) => void;
  draft: Draft;
  fresh: boolean;
  focusBody: boolean;
  language: Language;
  starred: boolean;
  status: NoteSaveStatus;
  error: string;
  busy: boolean;
  change: (draft: Draft) => void;
  back: () => void;
  retry: () => void;
  copy: () => void;
  star: () => void;
  remove: () => void;
};
export function NoteComposer({
  draft,
  fresh,
  focusBody,
  language,
  starred,
  status,
  error,
  busy,
  change,
  back,
  retry,
  copy,
  star,
  remove,
  readingId,
  onRead,
}: Props) {
  const body = useRef<HTMLTextAreaElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleButton = useRef<HTMLButtonElement>(null);
  const [titleText, setTitleText] = useState<string | null>(null);
  const originalTitle = useRef("");
  const title = pageTitle(draft);
  useEffect(() => {
    (focusBody ? body : heading).current?.focus({ preventScroll: true });
  }, [draft.id, focusBody]);
  return (
    <section className="swara-paper writing-sheet note-composer-sheet" aria-label="Note editor">
      <header className="sheet-tools">
        <button type="button" onClick={back}>
          <ArrowLeft aria-hidden="true" /> Notebook
        </button>
        <div className="sheet-save" data-attention={!!(error || status.retry || status.conflict) || undefined}>
          <div role="status" className="save-status">
            {status.text === "Saved" && <Check aria-hidden="true" />}
            {status.text}
          </div>
          {status.retry && <button type="button" onClick={retry}>Retry save</button>}
          {status.conflict && <button type="button" onClick={copy}>Save as a copy</button>}
          {error && <p role="alert">{error}</p>}
        </div>
        {!fresh && <button className="folio-star" type="button" disabled={busy} aria-label="Star note" aria-pressed={starred} onClick={star}>
          <Star fill={starred ? "currentColor" : "none"} aria-hidden="true" />
        </button>}
      </header>
      <div className="sheet-content">
        <div className="sheet-heading">
          {titleText !== null ? (
            <textarea
              className="sheet-title-input"
              aria-label="Note title"
              placeholder={pageTitle({ ...draft, title: "" })}
              rows={1}
              maxLength={noteLimits.title}
              dir="auto"
              autoFocus
              onFocus={(event) => event.currentTarget.select()}
              value={titleText}
              onChange={(event) => {
                const title = event.target.value.replace(/\r?\n/g, " ");
                setTitleText(title);
                change({ ...draft, title });
              }}
              onBlur={() => setTitleText(null)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing || !["Enter", "Escape"].includes(event.key)) return;
                event.preventDefault();
                if (event.key === "Escape" && draft.title !== originalTitle.current) {
                  change({ ...draft, title: originalTitle.current });
                }
                setTitleText(null);
                requestAnimationFrame(() => (event.key === "Enter" ? body.current : titleButton.current)?.focus());
              }}
            />
          ) : (
            <h2 ref={heading} tabIndex={-1}>
              <button
                ref={titleButton}
                className="sheet-title"
                aria-label={`Edit title: ${title}`}
                onClick={() => {
                  originalTitle.current = draft.title;
                  setTitleText(draft.title || (draft.content.trim() ? title : ""));
                }}
              >
                <span dir="auto">{title}</span><Pencil aria-hidden="true" />
              </button>
            </h2>
          )}
        </div>
        <textarea
          ref={body}
          className="sheet-body"
          key={draft.id}
          aria-label="Note text"
          lang={language === "spanish" ? "es" : "ja"}
          placeholder="Start writing…"
          value={draft.content}
          maxLength={noteLimits.content}
          onChange={(e) => change({ ...draft, content: e.target.value })}
        />
      </div>
      <footer className="sheet-footer">
        {readingId && <a href={readingPath(readingId)} onClick={event => onRead(event, readingId)}>Open original reading</a>}
        <details>
          <summary>Page details</summary>
          <div className="sheet-fields">
            <label>
              Topic
              <select
                value={draft.topic}
                onChange={(e) => change({ ...draft, topic: e.target.value as Draft["topic"] })}
              >
                <option value="">None</option>
                {noteTopics.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Tags (comma separated)
              <input
                key={draft.id}
                defaultValue={draft.tags.join(", ")}
                onChange={(e) =>
                  change({
                    ...draft,
                    tags: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
          </div>
        </details>
        <button className="sheet-remove" type="button" disabled={busy} onClick={remove}>
          <Trash2 aria-hidden="true" /> {fresh ? "Discard" : "Delete"}
        </button>
      </footer>
    </section>
  );
}
