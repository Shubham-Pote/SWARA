import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { ArrowLeft, BookmarkPlus, Check, Clock3, Languages, X } from "lucide-react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { Button } from "./ui/button";
import { ReadingQuiz } from "./ReadingQuiz";
import { ApiError, type Language } from "../lib/companion";
import { pagePaths, validReadingId } from "../lib/navigation";
import { createNote, readingWordNote } from "../lib/notes";
import {
  loadReading, readingFormats, readingLocales, readingNames, readingPassages, readingWordParts, startReading,
  type ReadingArticle, type ReadingProgress, type ReadingWord,
} from "../lib/reading";

type ReaderProps = {
  articleId: string;
  token: string | null;
  language: Language;
  onBack: (event: MouseEvent<HTMLAnchorElement>) => void;
  onExpired: () => void;
  hasDraft: (language: Language) => boolean;
  onDiscuss: (article: ReadingArticle, addPrompt: boolean) => boolean;
  onSwitchLanguage: (language: Language) => Promise<void>;
  switching: boolean;
};

export function ArticleReader({ articleId, token, language, onExpired, ...actions }: ReaderProps) {
  const [record, setRecord] = useState<{ article: ReadingArticle; progress: ReadingProgress | null } | null>(null);
  const [error, setError] = useState("");
  const [otherLanguage, setOtherLanguage] = useState<Language | null>(null);
  const [missing, setMissing] = useState(false);
  const [revision, retry] = useState(0);
  const valid = validReadingId(articleId);

  useEffect(() => {
    if (!valid || !token) return;
    const accessToken = token;
    const controller = new AbortController();
    const { signal } = controller;
    setError("");
    async function open() {
      const data = await loadReading(accessToken, articleId, signal);
      if (signal.aborted) return;
      if (data.article.language !== language) {
        setOtherLanguage(data.article.language);
        return;
      }
      if (data.progress?.status === "not_started") {
        const progress = await startReading(accessToken, articleId, signal);
        data.progress = { ...data.progress, ...progress };
      }
      if (signal.aborted) return;
      setRecord(data);
      document.title = `${data.article.title} · SWARA`;
    }
    open().catch(cause => {
      if (signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 401) onExpired();
      else if (cause instanceof ApiError && cause.status === 404) {
        setMissing(true);
        setError("This reading may have been removed.");
      } else setError("Could not open this reading.");
    });
    return () => controller.abort();
  }, [articleId, token, language, valid, onExpired, revision]);

  if (record && token) return <ReadingPassage {...record} token={token} onExpired={onExpired} {...actions} />;
  const loading = valid && !error && !otherLanguage;

  return <section className="reading-wrap" aria-labelledby="reader-status-title">
    <ReadingBack onBack={actions.onBack} />
    <section className="reading-message" aria-busy={loading}>
      <h2 id="reader-status-title">{loading ? "Opening your reading" : otherLanguage ? `A ${readingNames[otherLanguage]} reading` : "Reading unavailable"}</h2>
      {loading ? <p role="status">Loading the passage and its study notes…</p> : otherLanguage ?
        <p>Switch your practice language to open this passage.</p> :
        <p role="alert">{valid ? error : "This reading link is invalid."}</p>}
      {otherLanguage && <Button className="swara-action reading-button" aria-busy={actions.switching} aria-disabled={actions.switching} onClick={() => void actions.onSwitchLanguage(otherLanguage)}>
        {actions.switching ? "Switching…" : `Switch to ${readingNames[otherLanguage]} and open`}
      </Button>}
      {!!error && !missing && <Button className="swara-action reading-button" onClick={() => retry(value => value + 1)}>Try again</Button>}
    </section>
  </section>;
}

function ReadingPassage({ article, progress, token, onBack, onExpired, onDiscuss, hasDraft }: {
  article: ReadingArticle;
  progress: ReadingProgress | null;
  token: string;
  onBack: ReaderProps["onBack"];
  onExpired: ReaderProps["onExpired"];
  onDiscuss: ReaderProps["onDiscuss"];
  hasDraft: ReaderProps["hasDraft"];
}) {
  const [showEnglish, setShowEnglish] = useState(false);
  const [selectedWord, setSelectedWord] = useState<ReadingWord | null>(null);
  const [savedWords, setSavedWords] = useState<Set<ReadingWord>>(() => new Set());
  const [savingWord, setSavingWord] = useState(false);
  const [saveError, setSaveError] = useState("");
  const wordSave = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const indicator = useRef<HTMLProgressElement>(null);
  const toolbar = useRef<HTMLElement>(null);
  const translationAnchor = useRef<{ paragraph: Element; top: number } | null>(null);
  const reduced = useReducedMotion();
  const locale = readingLocales[article.language];
  const companion = article.language === "spanish" ? "María" : "Akira";
  const { passages, additionalEnglish } = useMemo(() => readingPassages(article), [article]);
  const vocabularyPassages = useMemo(() => {
    const highlighted = new Set<ReadingWord>();
    return passages.map(passage => ({
      ...passage,
      parts: readingWordParts(passage.text, article.vocabulary ?? [], article.language).map(part => {
        if (!part.entry) return part;
        if (highlighted.has(part.entry)) return { text: part.text };
        highlighted.add(part.entry);
        return part;
      }),
    }));
  }, [article, passages]);
  const hasEnglish = passages.some(passage => passage.translations.length) || additionalEnglish.length > 0;
  const hasNotes = !!(article.vocabulary?.length || article.grammarPoints?.length || readingContext(article).length);
  const hasHighlightedWords = vocabularyPassages.some(passage => passage.parts.some(part => part.entry));
  const { scrollYProgress } = useScroll({ target: text, offset: ["start 85%", "end 85%"] });
  useEffect(() => {
    if (document.activeElement === document.body || document.activeElement?.id === "main") {
      heading.current?.focus({ preventScroll: true });
    }
  }, []);
  useMotionValueEvent(scrollYProgress, "change", value => {
    if (indicator.current) indicator.current.value = Math.round(value * 100);
  });
  useEffect(() => {
    if (selectedWord && !dialog.current?.open) dialog.current?.showModal();
  }, [selectedWord]);
  useEffect(() => () => wordSave.current?.abort(), []);

  function toggleEnglish() {
    const boundary = toolbar.current?.getBoundingClientRect().bottom ?? 0;
    const readingLine = boundary + (window.innerHeight - boundary) * .25;
    for (const paragraph of Array.from(text.current?.querySelectorAll(".reading-paragraph") ?? [])) {
      const { top, bottom } = paragraph.getBoundingClientRect();
      if (bottom > readingLine && top < window.innerHeight) {
        translationAnchor.current = { paragraph, top };
        break;
      }
    }
    setShowEnglish(value => !value);
  }

  useLayoutEffect(() => {
    const anchor = translationAnchor.current;
    if (!anchor) return;
    translationAnchor.current = null;
    window.scrollBy({ top: anchor.paragraph.getBoundingClientRect().top - anchor.top, behavior: "instant" });
  }, [showEnglish]);

  async function saveWord(word: ReadingWord) {
    if (wordSave.current || savedWords.has(word)) return;
    const controller = new AbortController();
    wordSave.current = controller;
    setSavingWord(true);
    setSaveError("");
    try {
      await createNote(token, readingWordNote(article, word), controller.signal);
      if (!controller.signal.aborted) setSavedWords(words => new Set(words).add(word));
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 401) onExpired();
      else setSaveError("Could not save this word. Try again.");
    } finally {
      wordSave.current = null;
      if (!controller.signal.aborted) setSavingWord(false);
    }
  }

  return <motion.section className="reading-wrap reading-reader" data-reading-language={article.language} aria-labelledby="article-title"
    initial={reduced ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22 }}>
    <nav ref={toolbar} className="reading-reader-tools" aria-label="Reading tools">
      <ReadingBack onBack={onBack} />
      <div className="reading-tool-list">
        {hasEnglish && <button type="button" className="reading-tool reading-translate" aria-pressed={showEnglish}
          aria-controls="reading-passage" onClick={toggleEnglish}>
          <Languages size={16} aria-hidden="true" /> English
        </button>}
        {hasNotes && <a className="reading-tool" href="#reading-notes-title" aria-label="Study notes">Notes</a>}
        {progress && <a className="reading-tool" href="#reading-quiz-title">{article.comprehensionQuestions?.length ? "Exercise" : "Finish"}</a>}
      </div>
      <progress className="reading-position" ref={indicator} value={0} max={100} aria-label="Passage progress" />
    </nav>

    <div className="reading-spread">
      <article className="swara-paper reading-paper" aria-labelledby="article-title">
        <header className="reading-paper-head">
          <h2 id="article-title" ref={heading} lang="en" tabIndex={-1}>{article.title}</h2>
          <ReadingMetadata article={article} />
        </header>
        <div ref={text} id="reading-passage" className="reading-passage" tabIndex={-1}>
          {hasHighlightedWords && <p className="reading-word-hint">Underlined words open a definition.</p>}
          {vocabularyPassages.map(({ parts, translations }, index) => <div className="reading-paragraph" key={index}>
            <p lang={locale}>{parts.map(({ text: word, entry }, i) => entry
              ? <button key={i} type="button" className="reading-word" aria-haspopup="dialog" onClick={() => setSelectedWord(entry)}>{word}</button>
              : word)}</p>
            {showEnglish && translations.length > 0 && <p className="reading-english" lang="en">{translations.join(" ")}</p>}
          </div>)}
          {showEnglish && additionalEnglish.length > 0 && <section className="reading-extra-english" aria-label="Additional English translation">
            <h3>Additional English translation</h3>
            {additionalEnglish.map((sentence, index) => <p key={index}>{sentence}</p>)}
          </section>}
        </div>
      </article>

      {hasNotes && <StudyNotes article={article} onWord={setSelectedWord} />}

      {progress ? <ReadingQuiz article={article} progress={progress} token={token} onExpired={onExpired}
        onBack={onBack} onDiscuss={addPrompt => onDiscuss(article, addPrompt)} companion={companion} hasDraft={hasDraft(article.language)} /> :
        <section className="reading-quiz reading-follow-through" aria-label="Save your reading progress">
          <p>Open the reading assigned to you to save quiz progress.</p>
          <ReadingBack onBack={onBack} />
        </section>}
    </div>
    <dialog ref={dialog} className="access reading-word-dialog" aria-labelledby="reading-word-title"
      onClose={() => { setSelectedWord(null); setSaveError(""); }} onCancel={event => { if (savingWord) event.preventDefault(); }}
      onClick={event => { if (!savingWord && event.target === event.currentTarget) dialog.current?.close(); }}>
      {selectedWord && <>
        <button type="button" className="dialog-close" aria-label="Close word meaning" disabled={savingWord} onClick={() => dialog.current?.close()}>
          <X size={20} aria-hidden="true" />
        </button>
        <h2 id="reading-word-title" lang={locale}>{selectedWord.word}</h2>
        <p>{selectedWord.definition}</p>
        {selectedWord.pronunciation && <p className="reading-pronunciation">{selectedWord.pronunciation}</p>}
        {selectedWord.contextSentence && <blockquote lang={locale}>{selectedWord.contextSentence}</blockquote>}
        <Button className="swara-action reading-button reading-save-word" aria-busy={savingWord} aria-disabled={savingWord || savedWords.has(selectedWord)}
          onClick={() => void saveWord(selectedWord)}>
          {savedWords.has(selectedWord) ? <><Check aria-hidden="true" /> Saved to notebook</>
            : <><BookmarkPlus aria-hidden="true" /> {savingWord ? "Saving…" : "Save to notebook"}</>}
        </Button>
        <span className="sr-only" role="status">{savedWords.has(selectedWord) ? "Word saved to your notebook." : ""}</span>
        {saveError && <p className="access-error" role="alert">{saveError}</p>}
      </>}
    </dialog>
  </motion.section>;
}

function readingContext(article: ReadingArticle) {
  const context = article.culturalContext;
  return [context?.backgroundInfo, ...(context?.culturalTips ?? []), ...(context?.learningPoints ?? [])].filter(Boolean);
}

function StudyNotes({ article, onWord }: { article: ReadingArticle; onWord: (word: ReadingWord) => void }) {
  const glossary = article.vocabulary ?? [];
  const context = article.culturalContext;
  const grammar = article.grammarPoints ?? [];
  const contextNotes = readingContext(article);
  const locale = readingLocales[article.language];
  return <aside className="reading-notes" aria-labelledby="reading-notes-title">
    <h2 id="reading-notes-title" tabIndex={-1}>Study notes</h2>
    {glossary.length > 0 && <details name="article-study-notes" open>
      <summary>Vocabulary <span>{glossary.length}</span></summary>
      <ul className="reading-glossary">
        {glossary.map((word, index) => <li key={index}>
          <button type="button" aria-haspopup="dialog" onClick={() => onWord(word)}>
            <strong lang={locale}>{word.word}</strong><span>{word.definition}</span>
          </button>
        </li>)}
      </ul>
    </details>}
    {context && contextNotes.length > 0 && <details name="article-study-notes">
      <summary>Cultural context</summary>
      <div className="reading-note-body">
        {context.country && <h3>{context.country}</h3>}
        {contextNotes.map((note, index) => <p key={index}>{note}</p>)}
      </div>
    </details>}
    {grammar.length > 0 && <details name="article-study-notes">
      <summary>Grammar</summary>
      <div className="reading-note-body">{grammar.map(({ concept, explanation, examples }, index) => <div key={index}>
        <h3>{concept}</h3><p>{explanation}</p>
        {examples?.map((example, i) => <p key={i} lang={locale}>{example}</p>)}
      </div>)}</div>
    </details>}
  </aside>;
}

function ReadingMetadata({ article }: { article: ReadingArticle }) {
  return <ul className="reading-meta" aria-label="About this reading">
    <li>{readingFormats[article.contentType]}</li>
    <li>{article.difficulty}</li>
    <li><Clock3 size={14} aria-hidden="true" /> {article.estimatedReadTime} min</li>
  </ul>;
}

function ReadingBack({ onBack }: { onBack: ReaderProps["onBack"] }) {
  return <a href={pagePaths.reading} className="reading-back" aria-label="Back to Reading Desk" onClick={onBack}>
    <ArrowLeft size={16} aria-hidden="true" /> Desk
  </a>;
}
