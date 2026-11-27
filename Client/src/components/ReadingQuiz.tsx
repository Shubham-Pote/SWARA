import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { ArrowRight, MessageCircle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "./ui/button";
import { ApiError } from "../lib/companion";
import { pagePaths } from "../lib/navigation";
import { completeReading, readingDiscussionPrompt, type ReadingArticle, type ReadingProgress, type ReadingResult } from "../lib/reading";

export function ReadingQuiz({ article, progress, token, onExpired, onBack, onDiscuss, companion, hasDraft }: {
  article: ReadingArticle;
  progress: ReadingProgress;
  token: string;
  onExpired: () => void;
  onBack: (event: MouseEvent<HTMLAnchorElement>) => void;
  onDiscuss: (addPrompt: boolean) => boolean;
  companion: string;
  hasDraft: boolean;
}) {
  const questions = article.comprehensionQuestions ?? [];
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [attempt, setAttempt] = useState<{ result: ReadingResult; answers: number[] } | null>(null);
  const [handoffError, setHandoffError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLSpanElement>(null);
  const elapsed = useRef(0);
  const visibleSince = useRef<number | null>(null);
  const reduced = useReducedMotion();
  const result = attempt?.result;
  const completed = progress.status === "completed" || result?.passed;
  const answered = answers.filter(value => value >= 0).length;

  useEffect(() => {
    if (result) (result.passed ? heading : feedback).current?.focus();
  }, [result]);

  useEffect(() => {
    function pause() {
      if (visibleSince.current === null) return;
      elapsed.current += performance.now() - visibleSince.current;
      visibleSince.current = null;
    }
    function sync() {
      if (document.hidden) pause();
      else visibleSince.current ??= performance.now();
    }
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      pause();
      pending.current?.abort();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || completed || answered !== questions.length) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    const visible = visibleSince.current === null ? 0 : performance.now() - visibleSince.current;
    const timeSpent = (progress.timeSpent ?? 0) + Math.floor((elapsed.current + visible) / 1000);
    try {
      const value = await completeReading(token, article._id, answers, timeSpent, controller.signal);
      if (!controller.signal.aborted) setAttempt({ result: value, answers });
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 401) onExpired();
      else setError(cause instanceof ApiError ? cause.message : "Could not save your answers. Try again.");
    } finally {
      if (!controller.signal.aborted) {
        pending.current = null;
        setBusy(false);
      }
    }
  }

  return <section className="reading-quiz" aria-labelledby="reading-quiz-title">
    <div className="reading-quiz-heading">
      <h2 id="reading-quiz-title" ref={heading} tabIndex={-1}>{completed ? "Reading complete" : questions.length ? "Reading comprehension" : "Finish this reading"}</h2>
      <span ref={feedback} tabIndex={-1} role={result && !completed ? undefined : "status"}>{result
        ? result.totalQuestions ? `${result.score}% · ${result.correctAnswers} of ${result.totalQuestions} correct`
          : "Your progress is saved."
        : completed && typeof progress.quizScore === "number" && questions.length > 0 ? `${progress.quizScore}% saved score` : ""}</span>
    </div>
    {completed ? <motion.div className="reading-follow-through"
      initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22 }}>
      <p>Try using what you read in a conversation with {companion}.</p>
      <p className="reading-discussion-prompt">{readingDiscussionPrompt(article)}</p>
      <div className="reading-actions">
        <Button type="button" className="swara-action reading-button" onClick={() => setHandoffError(!onDiscuss(true))}>
          <MessageCircle aria-hidden="true" /> {hasDraft ? "Add prompt and open chat" : `Discuss with ${companion}`}
        </Button>
        {hasDraft && <button type="button" className="reading-tool" onClick={() => onDiscuss(false)}>Open my draft</button>}
        <a className="reading-tool" href={pagePaths.reading} onClick={onBack}>Reading Desk</a>
      </div>
      {handoffError && <p className="reading-error" role="alert">Your draft is full. Open it to make room for the reading prompt.</p>}
    </motion.div> : <form onSubmit={submit} aria-busy={busy}>
      <p className="reading-quiz-intro">{result ? <>Score at least 70% to finish. <a href="#reading-passage">Revisit the passage</a> or review your answers below.</>
        : questions.length ? "Answer each question. A score of 70% or higher saves this reading as complete."
          : "Mark the passage complete to add it to your reading history."}</p>
      {questions.map(({ question, options }, index) => <fieldset key={index} disabled={busy}>
        <legend>{index + 1}. {question}</legend>
        {options.map((option, choice) => <label key={choice} className="reading-answer">
          <input type="radio" name={`reading-question-${index}`} value={choice} checked={answers[index] === choice}
            onChange={() => setAnswers(values => values.map((value, i) => i === index ? choice : value))} />
          <span>{option}</span>
        </label>)}
      </fieldset>)}
      {error && <p className="reading-error" role="alert">{error}</p>}
      <div className="reading-actions">
        <Button type="submit" className="swara-action reading-button" disabled={busy || answered !== questions.length}>
          {busy ? "Saving answers…" : result ? "Try again" : questions.length ? "Check answers" : "Mark complete"}
          <ArrowRight aria-hidden="true" />
        </Button>
        {questions.length > 0 && <span>{answered} of {questions.length} answered</span>}
      </div>
    </form>}
    {(result || completed) && questions.length > 0 && <details className="reading-review">
      <summary>Review answers</summary>
      <ol>{questions.map(({ question, options, correctAnswer, explanation }, index) => <li key={index}>
        <strong>{question}</strong>
        {attempt && attempt.answers[index] !== correctAnswer && <p>Your answer: {options[attempt.answers[index] ?? -1]}</p>}
        <p className="reading-correct-answer">Correct answer: {options[correctAnswer]}</p>
        {explanation && <p>{explanation}</p>}
      </li>)}</ol>
    </details>}
  </section>;
}
