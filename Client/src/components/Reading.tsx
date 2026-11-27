import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { ArrowRight, BookOpen, Clock3 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "./ui/button";
import { ArticleReader } from "./ArticleReader";
import { ApiError, type Language } from "../lib/companion";
import {
  assignReading, loadReadingShelf,
  type ReadingArticle, type ReadingShelf,
} from "../lib/reading";
import { readingPath, validReadingId } from "../lib/navigation";
import "./reading.css";

type ReadingProps = {
  articleId: string | null;
  token: string | null;
  restoring: boolean;
  accountUnavailable: boolean;
  language: Language;
  onSignIn: () => void;
  onExpired: () => void;
  onSwitchLanguage: (language: Language) => Promise<void>;
  switching: boolean;
  onOpen: (id: string) => void;
  onFollow: (event: MouseEvent<HTMLAnchorElement>, id?: string) => boolean;
  hasDraft: (language: Language) => boolean;
  onDiscuss: (article: ReadingArticle, addPrompt: boolean) => boolean;
};

const completedDate = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export default function Reading(props: ReadingProps) {
  const { articleId, token, restoring, accountUnavailable, language, onSignIn, onFollow } = props;
  if (articleId && (token || !validReadingId(articleId))) {
    return <ArticleReader articleId={articleId} token={token} language={language} onBack={onFollow}
      onExpired={props.onExpired} hasDraft={props.hasDraft} onDiscuss={props.onDiscuss}
      onSwitchLanguage={props.onSwitchLanguage} switching={props.switching} />;
  }
  if (articleId) return <section className="reading-wrap" aria-labelledby="reading-link-title">
    <section className="reading-message" aria-busy={restoring}>
      <h2 id="reading-link-title">Open this reading</h2>
      {restoring ? <p role="status">Restoring your account…</p> : !accountUnavailable && <>
        <p>Sign in to view the passage and its study notes.</p>
        <Button className="swara-action reading-button" onClick={onSignIn}>Sign in to open this reading <ArrowRight aria-hidden="true" /></Button>
      </>}
    </section>
  </section>;

  return <section className="reading-wrap reading-desk" aria-labelledby="workspace-title">
      {token ? <ReadingShelfView {...props} token={token} /> : !accountUnavailable &&
        <ReadingStart>
          {restoring ? <p role="status">Restoring your account…</p> : <>
            <p>Read at your own pace, with English available when you need it.</p>
            <Button className="swara-action reading-button" onClick={onSignIn}>Sign in to read <ArrowRight aria-hidden="true" /></Button>
          </>}
        </ReadingStart>}
  </section>;
}

function ReadingStart({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return <motion.div className="reading-start"
    initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22 }}>
    {children}
  </motion.div>;
}

function ReadingShelfView({ token, language, onExpired, onOpen, onFollow }: ReadingProps & { token: string }) {
  const [shelf, setShelf] = useState<ReadingShelf | null>(null);
  const [loadError, setLoadError] = useState("");
  const [assignError, setAssignError] = useState("");
  const [loadingReading, setLoadingReading] = useState(false);
  const [revision, refresh] = useState(0);
  const assignment = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setLoadError("");
    loadReadingShelf(token, language, signal).then(value => {
      if (signal.aborted) return;
      setShelf(value);
      if (value.currentArticle) setAssignError("");
    }).catch(error => {
      if (signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) onExpired();
      else setLoadError("Could not load your readings.");
    });
    return () => controller.abort();
  }, [token, language, revision, onExpired]);

  useEffect(() => () => assignment.current?.abort(), []);

  async function openNext() {
    if (!shelf || assignment.current) return;
    const controller = new AbortController();
    assignment.current = controller;
    setAssignError("");
    setLoadingReading(true);
    try {
      const { article } = await assignReading(token, language, shelf.totalCompleted > 0, controller.signal);
      if (!controller.signal.aborted) onOpen(article._id);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) onExpired();
      else {
        setAssignError(error instanceof ApiError ? error.message : "Could not prepare your reading. Try again.");
        if (error instanceof ApiError && (error.status === 400 || error.status === 409)) refresh(value => value + 1);
      }
    } finally {
      if (!controller.signal.aborted) {
        assignment.current = null;
        setLoadingReading(false);
      }
    }
  }

  if (loadError) return <section className="reading-message">
    <h2>Readings unavailable</h2><p role="alert">{loadError}</p>
    <Button className="swara-action reading-button" onClick={() => refresh(value => value + 1)}>Try again</Button>
  </section>;
  if (!shelf) return <ReadingStart><p role="status">Loading your readings…</p></ReadingStart>;

  const current = shelf.currentArticle;
  const first = shelf.totalCompleted === 0;
  const history = [...shelf.completedArticles].sort((a, b) =>
    (Date.parse(b.progress.completedAt ?? "") || 0) - (Date.parse(a.progress.completedAt ?? "") || 0));
  return <>
    {current ? <ReadingStart>
      <h2 lang="en">{current.article.title}</h2>
      {current.article.preview && <p>{current.article.preview}</p>}
      <div className="reading-start-actions">
        <Button asChild className="swara-action reading-button"><a href={readingPath(current.article._id)} onClick={event => onFollow(event, current.article._id)}>
          {current.progress.status === "reading" ? "Continue reading" : "Start reading"} <ArrowRight aria-hidden="true" />
        </a></Button>
        <span className="reading-duration"><Clock3 size={15} aria-hidden="true" /> {current.article.estimatedReadTime} min</span>
      </div>
    </ReadingStart> : <ReadingStart>
      <p>{first ? "Start with a short passage at your level." : "You’re ready for another passage."}</p>
      <div className="reading-start-actions">
        <Button className="swara-action reading-button" onClick={openNext} aria-busy={loadingReading} aria-disabled={loadingReading}>
          {assignError ? "Try again" : first ? "Start first passage" : "Get next passage"}
          {loadingReading ? <span className="reading-page-turn" aria-hidden="true"><BookOpen /></span> : <ArrowRight aria-hidden="true" />}
        </Button>
        <span className="reading-status" role="status">{loadingReading ? "Preparing your reading…" : ""}</span>
      </div>
      {assignError && <p className="reading-error" role="alert">{assignError}</p>}
    </ReadingStart>}

    <section className="reading-history" aria-labelledby="reading-history-title">
      <header className="reading-history-head">
        <h2 id="reading-history-title">Completed readings</h2>
        {shelf.totalCompleted > 0 && <p>{shelf.totalCompleted} finished</p>}
      </header>
      {history.length ? <ul className="reading-history-list">
        {history.map(({ article, progress }) => <li key={article._id}>
          <a href={readingPath(article._id)} onClick={event => onFollow(event, article._id)}>
            <BookOpen size={18} aria-hidden="true" />
            <span><strong lang="en">{article.title}</strong>{progress.completedAt && Number.isFinite(Date.parse(progress.completedAt)) &&
              <time dateTime={progress.completedAt}>{completedDate.format(new Date(progress.completedAt))}</time>}</span>
            {typeof progress.quizScore === "number" && !!article.comprehensionQuestions?.length &&
              <span className="reading-score"><span className="sr-only">Quiz score </span>{progress.quizScore}%</span>}
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        </li>)}
      </ul> : <p className="reading-history-empty">Finished passages and quiz scores will appear here.</p>}
    </section>
  </>;
}
