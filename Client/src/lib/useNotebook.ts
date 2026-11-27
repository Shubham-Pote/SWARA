import { useEffect, useRef, useState } from "react";
import { ApiError, type Language } from "./companion";
import {
  draftPrefix,
  fromNote,
  newPageId,
  recoverDrafts,
  saveWriting,
  type Draft,
  type Pending,
  type Writing,
} from "./notebookDraft";
import { loadNotes, type Note } from "./notes";

export type NoteSaveStatus = { text: string; retry?: boolean; conflict?: boolean };

function sameWriting(left: Writing, right: Writing) {
  return left.content === right.content && left.title === right.title && left.topic === right.topic &&
    JSON.stringify(left.tags) === JSON.stringify(right.tags);
}

export function useNotebook(account: string, token: string, language: Language, expired: () => void) {
  const prefix = draftPrefix(account, language);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, reload] = useState(0);
  const [drafts, setDrafts] = useState(() => {
    try {
      return recoverDrafts(prefix);
    } catch {
      return [];
    }
  });
  const current = useRef(new Map(drafts.map((d) => [d.id, d])));
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const active = useRef(new Set<string>());
  const paused = useRef(new Set<string>());
  const retryDelay = useRef(new Map<string, number>());
  const lifetime = useRef(new AbortController());
  const detached = useRef(false);
  const [statuses, setStatuses] = useState<Record<string, NoteSaveStatus>>({});
  const status = (id: string, text: string, actions?: Omit<NoteSaveStatus, "text">) => {
    setStatuses((old) => ({ ...old, [id]: { text, ...actions } }));
  };
  function persist(id: string, draft?: Draft) {
    if (detached.current) {
      // A reopened editor may already own a newer recovery snapshot.
      try {
        if (localStorage.getItem(prefix + id) !== JSON.stringify(current.current.get(id))) return false;
      } catch { return false; }
    }
    if (draft) current.current.set(id, draft);
    else current.current.delete(id);
    setDrafts([...current.current.values()]);
    try {
      if (draft) localStorage.setItem(prefix + id, JSON.stringify(draft));
      else localStorage.removeItem(prefix + id);
      return true;
    } catch { return false; }
  }
  async function flush(id: string) {
    const signal = lifetime.current.signal;
    const draft = current.current.get(id);
    if (!draft || paused.current.has(id) || active.current.has(id) || signal.aborted) return;
    if (detached.current && !locallyStored(id)) return;
    if (!draft.pending && !draft.content.trim() && !draft.title.trim()) {
      status(id, draft.revision < 0 ? "Empty draft" : "Add a title or text to save");
      return;
    }
    const pending: Pending = draft.pending ?? {
      content: draft.content,
      title: draft.title,
      tags: draft.tags,
      topic: draft.topic,
      revision: draft.revision,
      writeId: crypto.randomUUID(),
    };
    active.current.add(id);
    const stored = persist(id, { ...draft, pending });
    status(id, stored ? "Saving…" : "Saving… Keep this page open.");
    try {
      const note = await saveWriting(token, language, id, pending, signal);
      if (signal.aborted) return;
      retryDelay.current.delete(id);
      setNotes((old) => [note, ...old.filter((n) => n._id !== id)]);
      const latest = current.current.get(id);
      if (!latest) return;
      if (sameWriting(latest, pending)) {
        persist(id);
        status(id, "Saved");
      } else {
        persist(id, { ...latest, revision: note.revision ?? 0, pending: undefined });
        schedule(id, 0);
      }
    } catch (e) {
      if (signal.aborted) return;
      if (detached.current) return;
      if (e instanceof ApiError && e.status === 401) expired();
      else if (e instanceof ApiError && (e.status === 409 || e.status === 404)) {
        const message = e.status === 409 ? "This page changed elsewhere." : "This page is no longer available online.";
        const local = locallyStored(id);
        status(id, `${message} ${local ? "Your edits are saved on this device." : "Keep this page open until you save a copy."}`, { conflict: true });
      } else if (e instanceof ApiError && [400, 413, 422].includes(e.status)) {
        const latest = current.current.get(id);
        if (!latest) return;
        const local = persist(id, { ...latest, pending: undefined });
        status(id, `${e.message} ${local ? "Your edits are saved on this device." : "Keep this page open until saved."}`);
        if (!sameWriting(latest, pending)) schedule(id, 0);
      } else {
        status(id, locallyStored(id) ? "Saved on this device" : "Couldn’t save. Keep this page open and retry.", { retry: true });
        const delay = Math.min(60000, (retryDelay.current.get(id) ?? 2500) * 2);
        retryDelay.current.set(id, delay);
        schedule(id, delay);
      }
    } finally {
      active.current.delete(id);
    }
  }
  function locallyStored(id: string) {
    try { return localStorage.getItem(prefix + id) === JSON.stringify(current.current.get(id)); }
    catch { return false; }
  }
  function schedule(id: string, delay = 650) {
    clearTimeout(timers.current.get(id));
    timers.current.set(
      id,
      setTimeout(() => {
        timers.current.delete(id);
        void flush(id);
      }, delay),
    );
  }
  function change(draft: Draft) {
    const latest = current.current.get(draft.id);
    const updated = {
      ...draft,
      pending: latest?.pending,
      revision: latest?.revision ?? draft.revision,
      updatedAt: new Date().toISOString(),
    };
    const stored = persist(draft.id, updated);
    status(draft.id, stored ? "Saving…" : "Device storage unavailable. Keep this page open until saved.");
    schedule(draft.id);
    return stored;
  }
  function discard(id: string) {
    clearTimeout(timers.current.get(id));
    persist(id);
    status(id, "");
  }
  function keepCopy(draft: Draft) {
    const copy = { ...draft, id: newPageId(), revision: -1, pending: undefined };
    if (change(copy)) discard(draft.id);
    reload((n) => n + 1);
    return copy.id;
  }
  function pauseSave(id: string) {
    if (active.current.has(id)) return null;
    paused.current.add(id);
    return () => {
      paused.current.delete(id);
      if (!detached.current && current.current.has(id)) schedule(id);
    };
  }
  useEffect(() => {
    detached.current = false;
    lifetime.current = new AbortController();
    const retry = () => current.current.forEach((d) => schedule(d.id, 0));
    const finish = () => current.current.forEach(d => void flush(d.id));
    retry();
    window.addEventListener("online", retry);
    window.addEventListener("pagehide", finish);
    return () => {
      detached.current = true;
      timers.current.forEach(clearTimeout);
      window.removeEventListener("online", retry);
      window.removeEventListener("pagehide", finish);
      if (sessionStorage.getItem("swara.companion.token") === token) finish();
      else lifetime.current.abort();
    };
  }, [prefix, token]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    loadNotes(token, language, controller.signal)
      .then(({ notes: loaded }) => {
        if (controller.signal.aborted) return;
        const legacy = `swara.notes.draft:${account}:${language}`;
        for (const key of Object.keys(sessionStorage).filter(
          (k) => k === legacy || k.startsWith(legacy + ":"),
        )) {
          try {
            const old = JSON.parse(sessionStorage.getItem(key) ?? "null");
            if (typeof old?.content !== "string" || typeof old?.title !== "string") continue;
            const existing = loaded.find((n) => key === legacy + ":" + n._id);
            const restored = {
              ...fromNote(existing),
              content: old.content,
              title: old.title,
              topic: old.topic ?? "",
              tags: String(old.tags ?? "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            };
            if (existing) {
              // Older drafts have no base revision. Recover a copy without overwriting later edits.
              restored.id = newPageId();
              restored.revision = -1;
            }
            localStorage.setItem(prefix + restored.id, JSON.stringify(restored));
            sessionStorage.removeItem(key);
            change(restored);
          } catch {
            /* Keep the original draft when device storage is unavailable. */
          }
        }
        if (!controller.signal.aborted)
          setNotes((old) => {
            const merged = new Map(loaded.map((n) => [n._id, n]));
            for (const n of old)
              if ((n.revision ?? 0) > (merged.get(n._id)?.revision ?? -1)) merged.set(n._id, n);
            return [...merged.values()];
          });
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        if (e instanceof ApiError && e.status === 401) expired();
        else setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt, token, language, expired]);
  return {
    notes,
    setNotes,
    loading,
    loadError,
    retryLoad: () => reload((n) => n + 1),
    drafts,
    statuses,
    change,
    flush,
    discard,
    keepCopy,
    pauseSave,
  };
}
