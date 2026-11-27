import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import { flushSync } from "react-dom";
import { ArrowUpRight, AudioWaveform, LogOut, UserRound, X } from "lucide-react";
import { Dashboard } from "./components/Dashboard";
import { ApiError, changeLanguage, loadProfile, signIn } from "./lib/companion";
import type { Language, Profile } from "./lib/companion";
import { AppSidebar } from "./components/AppSidebar";
import { CompanionSelect } from "./components/CompanionSelect";
import { WorkspaceHeader } from "./components/WorkspaceHeader";
import { Button } from "./components/ui/button";
import { pageAt, pagePaths, readingArticleAt, readingPath, roomFor, type Page } from "./lib/navigation";
import { readingDiscussionPrompt, readingNames, type ReadingArticle } from "./lib/reading";
import { appendToDraft } from "./lib/conversationDraft";
import "./index.css";
import "./shell.css";

const tokenKey = "swara.companion.token";
const languageKey = "swara.practice.language";
const workspaceTitles = { dashboard: "Dashboard", reading: "Reading Desk", notes: "Notebook" };
const Reading = lazy(() => import("./components/Reading"));
const Notes = lazy(() => import("./components/Notes"));
const CompanionRoom = lazy(() => import("./components/CompanionRoom"));

function readDraft(room: string) {
  try { return sessionStorage.getItem(`swara.companion.draft:${room}`) ?? ""; }
  catch { return ""; }
}

function AccessDialog({ language, onClose, onAccess }: { language: Language; onClose: () => void; onAccess: (token: string, user: Profile) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (!dialog.current?.open) dialog.current?.showModal(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const session = await signIn(String(fields.get("email")), String(fields.get("password")), creating ? {
        displayName: String(fields.get("name")), currentLanguage: language,
      } : undefined);
      onAccess(session.token, session.user);
    } catch (error) {
      setError(error instanceof ApiError ? error.message : "Could not reach SWARA. Try again.");
    } finally { setBusy(false); }
  }

  return <dialog ref={dialog} className="access" aria-labelledby="access-title"
    onClose={onClose} onCancel={event => { if (busy) event.preventDefault(); }}>
    <button type="button" className="dialog-close" disabled={busy} aria-label="Close sign-in" onClick={() => dialog.current?.close()}><X size={21} /></button>
    <span className="brand-mark"><AudioWaveform size={20} aria-hidden="true" /></span>
    <h2 id="access-title">{creating ? "Create an account" : "Sign in to SWARA"}</h2>
    <p>{creating ? `Start practicing ${readingNames[language]} and save your progress.` : "Continue your practice and access your saved work."}</p>
    <form onSubmit={submit}>
      {creating && <label>Display name<input name="name" autoComplete="name" required minLength={2} maxLength={100} /></label>}
      <label>Email<input name="email" autoComplete="email" type="email" required /></label>
      <label>Password<input name="password" autoComplete={creating ? "new-password" : "current-password"} type="password" required minLength={creating ? 6 : undefined} /></label>
      {error && <p className="access-error" role="alert">{error}</p>}
      <button className="swara-action access-submit" disabled={busy}>{busy ? "Connecting…" : creating ? "Create account" : "Sign in"}<ArrowUpRight size={18} aria-hidden="true" /></button>
    </form>
    <button type="button" className="access-switch" disabled={busy} onClick={() => { setCreating(!creating); setError(""); }}>
      {creating ? "I already have an account" : "Create a SWARA account"}
    </button>
  </dialog>;
}

export function App() {
  const main = useRef<HTMLElement>(null);
  const [pathname, setPathname] = useState(() => location.pathname);
  const [sidebarArrival, setSidebarArrival] = useState(false);
  const page = pageAt(pathname);
  const workspaceTitle = page === "dashboard" || page === "reading" || page === "notes" ? workspaceTitles[page] : null;
  const articleId = readingArticleAt(pathname);
  const previousPath = useRef(pathname);
  const [token, setToken] = useState(() => sessionStorage.getItem(tokenKey));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [guestLanguage, setGuestLanguage] = useState<Language>(() => {
    try { return localStorage.getItem(languageKey) === "japanese" ? "japanese" : "spanish"; }
    catch { return "spanish"; }
  });
  const [access, setAccess] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [accountNotice, setAccountNotice] = useState("");
  const [profileRetry, setProfileRetry] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const language = profile?.currentLanguage ?? guestLanguage;
  const activeLanguage = roomFor(page) ?? language;
  const restoring = !!token && !profile && !accountNotice;
  const accountUnavailable = !!token && !profile && !restoring;
  const recovery = pathname.startsWith("/companion/") ? "companion" : "dashboard";

  useEffect(() => {
    function readRoute() {
      setSidebarArrival(false);
      setPathname(location.pathname);
    }
    window.addEventListener("popstate", readRoute);
    return () => window.removeEventListener("popstate", readRoute);
  }, []);

  useLayoutEffect(() => {
    const title = page === "dashboard" ? "Dashboard" : page === "reading" ? "Reading Desk" : page === "notes" ? "Notebook"
      : page === "companion" ? "Choose your companion" : page === "not-found" ? "Page unavailable" : "Companion Room";
    document.title = `${title} · SWARA`;
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
  }, [page, pathname]);

  function navigate(next: Page, nextArticle?: string, fromSidebar = false) {
    const nextPath = next === "reading" && nextArticle ? readingPath(nextArticle) : pagePaths[next];
    if (nextPath === pathname) {
      if (next === "notes" && location.hash) location.hash = "";
      return;
    }
    window.history.pushState({ from: page }, "", nextPath);
    const nextLanguage = roomFor(next);
    const update = () => {
      setSidebarArrival(fromSidebar && next !== page);
      setPathname(nextPath);
    };
    if (page === "companion" && nextLanguage && document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.startViewTransition(() => flushSync(update));
    } else update();
  }

  function follow(event: MouseEvent<HTMLAnchorElement>, next: Page, nextArticle?: string, fromSidebar = false) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    event.preventDefault();
    navigate(next, nextArticle, fromSidebar);
    return true;
  }

  const signOut = useCallback(() => {
    sessionStorage.removeItem(tokenKey);
    setToken(null);
    setProfile(null);
  }, []);

  const expired = useCallback(() => {
    signOut();
    setAccountNotice("Your session expired. Sign in to continue.");
    setAccess(true);
  }, [signOut]);

  const rememberLanguage = useCallback((next: Language) => {
    setGuestLanguage(next);
    try { localStorage.setItem(languageKey, next); } catch { /* The session keeps the preference. */ }
  }, []);

  useEffect(() => {
    if (!token || profile) return;
    const controller = new AbortController();
    loadProfile(token, controller.signal).then(({ user }) => {
      if (controller.signal.aborted) return;
      setProfile(user);
      rememberLanguage(user.currentLanguage);
    }).catch(error => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) expired();
      else setAccountNotice("Could not load your account.");
    });
    return () => controller.abort();
  }, [profile, token, expired, profileRetry, rememberLanguage]);

  async function chooseLanguage(next: Language, fromHeader = false) {
    if (next === language || switching || (token && !profile)) return;
    const source = location.href;
    function leaveLanguageDetail() {
      if (!fromHeader || source !== location.href) return;
      if (page === "reading" && articleId) navigate("reading");
      if (page === "notes" && location.hash) history.replaceState(null, "", pathname + location.search);
    }
    setAccountNotice("");
    if (!token) {
      leaveLanguageDetail();
      rememberLanguage(next);
      return;
    }
    setSwitching(true);
    try {
      const { user } = await changeLanguage(token, next);
      leaveLanguageDetail();
      setProfile(user);
      rememberLanguage(user.currentLanguage);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) expired();
      else setAccountNotice("Could not switch languages. Choose a language to try again.");
    } finally {
      setSwitching(false);
    }
  }

  const owner = profile?.id ?? "guest";
  const room = `${owner}:${activeLanguage}`;
  const draftFor = (key: string) => drafts[key] ?? readDraft(key);
  const draft = draftFor(room);
  function updateDraft(key: string, text: string) {
    setDrafts(current => ({ ...current, [key]: text }));
    try {
      if (text) sessionStorage.setItem(`swara.companion.draft:${key}`, text);
      else sessionStorage.removeItem(`swara.companion.draft:${key}`);
      return true;
    } catch { return false; }
  }
  function setDraft(text: string) { return updateDraft(room, text); }
  function openAccess() { setAccess(true); }

  function discussReading(article: ReadingArticle, addPrompt: boolean) {
    const target = article.language;
    if (target !== language) return false;
    const targetRoom = `${owner}:${target}`;
    if (addPrompt) {
      const current = draftFor(targetRoom);
      const prompt = readingDiscussionPrompt(article);
      if (!current.includes(prompt)) {
        const next = appendToDraft(current, prompt);
        if (next === null) return false;
        updateDraft(targetRoom, next);
      }
    }
    navigate(target);
    return true;
  }

  const header = workspaceTitle && <WorkspaceHeader title={workspaceTitle} language={language} busy={switching}
    disabled={!!token && !profile} onLanguage={articleId ? undefined : next => void chooseLanguage(next, true)} />;
  const notice = accountNotice && <p className="account-notice" role="status">{accountNotice} {token && !profile &&
    <button type="button" onClick={() => { setAccountNotice(""); setProfileRetry(count => count + 1); }}>Retry</button>}</p>;

  return (
    <div className="app-shell" data-page={page} data-language={activeLanguage} data-workspace={!!workspaceTitle || undefined}>
      <a className="skip-link" href="#main" onClick={event => {
        event.preventDefault();
        main.current?.focus();
        main.current?.scrollIntoView();
      }}>Skip to main content</a>
      {page !== "spanish" && page !== "japanese" && <AppSidebar page={page} follow={(event, next) => follow(event, next, undefined, true)} account={
        <button type="button" className="rail-action" aria-label={profile ? "Sign out" : "Sign in"} disabled={switching} onClick={() => {
          if (token) { signOut(); setAccountNotice(""); }
          if (!profile) openAccess();
        }}>{profile ? <LogOut size={20} aria-hidden="true" /> : <UserRound size={20} aria-hidden="true" />}<span className="rail-label" aria-hidden="true">{profile ? "Sign out" : "Sign in"}</span></button>
      } />}
      <main id="main" className={workspaceTitle ? "wrap workspace workspace-frame" : "wrap workspace"}
        ref={main} tabIndex={-1} data-sidebar-arrival={sidebarArrival || undefined} onAnimationEnd={event => {
          if (event.animationName === "sidebar-arrive" && event.target instanceof Element && event.target.parentElement === event.currentTarget) {
            setSidebarArrival(false);
          }
        }}>
        {header}{notice}
        {page === "dashboard" ? <Dashboard key={profile?.id ?? "guest"} token={profile ? token : null} language={language}
          displayName={profile?.displayName}
          restoring={restoring} accountUnavailable={accountUnavailable} hasDraft={!!draft.trim()} onSignIn={openAccess} onExpired={expired}
          onRead={(event, id) => follow(event, "reading", id)}
          onPractice={prompt => {
            if (prompt && !draft.trim()) setDraft(prompt);
            navigate(language);
          }} /> :
          page === "reading" ? <Suspense fallback={<p className="route-loading" role="status">Opening the Reading Desk…</p>}>
            <Reading articleId={articleId} key={`${room}:${articleId ?? "desk"}`}
              token={profile ? token : null} restoring={restoring} accountUnavailable={accountUnavailable} language={language}
              onSignIn={openAccess} onExpired={expired}
              onSwitchLanguage={chooseLanguage} switching={switching}
              onOpen={id => navigate("reading", id)} onFollow={(event, id) => follow(event, "reading", id)}
              hasDraft={target => !!draftFor(`${owner}:${target}`).trim()} onDiscuss={discussReading} />
          </Suspense> :
          page === "notes" ? <Suspense fallback={<p className="route-loading" role="status">Opening your notebook…</p>}>
            <Notes key={profile?.id ?? "guest"} accountId={profile?.id} token={profile ? token : null}
              language={language} restoring={restoring} accountUnavailable={accountUnavailable}
              onSignIn={openAccess} onExpired={expired}
              onRead={(event, id) => follow(event, "reading", id)} />
          </Suspense> :
          page === "companion" ? <CompanionSelect follow={follow} /> :
          page === "not-found" ? <section className="route-loading route-recovery">
            <h1>Page unavailable</h1>
            <p>This link may have changed.</p>
            <Button asChild className="swara-action"><a href={pagePaths[recovery]} onClick={event => follow(event, recovery)}>
              {recovery === "companion" ? "Choose a companion" : "Back to Dashboard"}
            </a></Button>
          </section> :
          <Suspense fallback={<p className="route-loading" role="status">Opening the Companion Room…</p>}>
            <CompanionRoom key={room} language={activeLanguage} token={profile ? token : null} restoring={restoring}
            draft={draft} setDraft={setDraft} accountUnavailable={accountUnavailable}
            guestDraft={profile ? draftFor(`guest:${activeLanguage}`) : ""}
            onGuestDraftUsed={() => updateDraft(`guest:${activeLanguage}`, "")}
            onBack={event => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              if (history.state?.from === "companion") history.back();
              else { history.replaceState(null, "", pagePaths.companion); setPathname(pagePaths.companion); }
            }}
            onSignIn={openAccess} onExpired={expired} />
          </Suspense>}
      </main>
      {access && <AccessDialog language={activeLanguage} onClose={() => setAccess(false)} onAccess={(next, user) => {
        sessionStorage.setItem(tokenKey, next);
        for (const id of ["spanish", "japanese"] as const) {
          const guest = `guest:${id}`;
          const target = `${user.id}:${id}`;
          const text = draftFor(guest);
          if (!text.trim() || draftFor(target).trim()) continue;
          if (updateDraft(target, text)) updateDraft(guest, "");
        }
        setToken(next);
        setProfile(user);
        rememberLanguage(user.currentLanguage);
        setAccountNotice("");
        setAccess(false);
        requestAnimationFrame(() => {
          if (document.activeElement === document.body) main.current?.focus({ preventScroll: true });
        });
      }} />}
    </div>
  );
}

export default App;
