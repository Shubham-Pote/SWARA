import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, MouseEvent, RefObject } from "react";
import { waapi } from "animejs/waapi";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowUp, AudioLines, Coffee, MessageCircle, MessageSquarePlus, Mic, History, X, Square } from "lucide-react";
import { CompanionStage } from "./CompanionStage";
import { companions } from "../lib/companions";
import { conversationIdleMs } from "../lib/avatarBehavior";
import type { StageState } from "../lib/avatarBehavior";
import { ApiError, loadHistory, startConversation, streamTurn } from "../lib/companion";
import type { AudioChunk, Language, Performance, Turn } from "../lib/companion";
import { createPlayback, speechRecognition } from "../lib/companionAudio";
import { appendToDraft, messageLimit } from "../lib/conversationDraft";
import { pagePaths } from "../lib/navigation";
import { replyLines } from "../lib/replyWords";

const topics = [
  { label: "Coffee", icon: Coffee, prompt: "Let's role-play ordering a coffee. You be the barista and help me order in the language I'm learning." },
  { label: "Repeat a phrase", icon: AudioLines, prompt: "Teach me one useful everyday phrase. Say it slowly so I can repeat it." },
  { label: "My day", icon: MessageCircle, prompt: "Ask me a simple question about my day and help me answer naturally." },
];
const voiceKey = "swara.companion.voice";

function SpokenText({ lines, visible = Infinity }: { lines: ReturnType<typeof replyLines>; visible?: number }) {
  let remaining = visible;
  return lines.map((line, index) => {
    if (!line?.words.length || remaining <= 0) return null;
    const words = line.words.slice(0, remaining);
    remaining -= words.length;
    return <span key={index} lang={line.lang} className={line.pronunciation ? "pronunciation-hint" : undefined}>
      {line.pronunciation ? <span className="sr-only">Pronunciation: </span> : index > 0 && !lines[index - 1]?.pronunciation && " "}
      {visible === Infinity ? words.join("").trimEnd()
        : words.map((word, i) => <span key={i} className="reply-word">{word}</span>)}
    </span>;
  });
}

function LiveReply({ lines, transcript, follow, reduced }: {
  lines: ReturnType<typeof replyLines>; transcript: RefObject<HTMLElement | null>;
  follow: RefObject<boolean>; reduced: boolean | null;
}) {
  const growth = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLParagraphElement>(null);
  const [shown, setShown] = useState(1);
  const available = lines.reduce((count, line) => count + (line?.words.length ?? 0), 0);
  const remaining = available - shown;
  const revealing = remaining > 0;
  const catchingUp = remaining > 32;
  const immediate = reduced ? available : 0;

  useEffect(() => {
    if (immediate) { setShown(immediate); return; }
    if (!revealing) return;
    const timer = window.setTimeout(() => setShown(count => count + 1), catchingUp ? 16 : 30);
    return () => window.clearTimeout(timer);
  }, [shown, revealing, catchingUp, immediate]);

  useLayoutEffect(() => {
    const box = growth.current!;
    const content = copy.current!;
    const measure = () => box.style.setProperty("--reply-height", `${Math.ceil(content.getBoundingClientRect().height)}px`);
    measure();
    const observer = new ResizeObserver(entries => {
      if (entries.some(entry => entry.target === content)) measure();
      const log = transcript.current;
      if (log && follow.current) log.scrollTop = log.scrollHeight;
    });
    observer.observe(content);
    observer.observe(box);
    return () => observer.disconnect();
  }, [transcript, follow]);

  return <div className="reply-growth" ref={growth}>
    <p ref={copy} className="reply live-reply"><SpokenText lines={lines} visible={reduced ? Infinity : shown} /></p>
  </div>;
}

function Reply({ text, locale }: { text: string; locale: string }) {
  if (/^English:/i.test(text)) return <p className="reply"><SpokenText lines={replyLines(text, locale, true)} /></p>;
  return <div className="reply">{text.split(/\r?\n/).filter(Boolean).map((line, index) => {
    const translation = /^English:\s*(.*)$/i.exec(line);
    const pronunciation = /^Pronunciation:\s*(.*)$/i.exec(line);
    const spoken = /^(Spanish|Japanese):\s*(.*)$/i.exec(line);
    if (translation) return <p className="translation" key={index}>{translation[1]}</p>;
    if (pronunciation) return <p className="pronunciation" key={index}><span className="sr-only">Pronunciation: </span>{pronunciation[1]}</p>;
    if (spoken) return <p className="target-line" lang={locale} key={index}>{spoken[2]}</p>;
    return <p key={index}>{line}</p>;
  })}</div>;
}

export default function CompanionRoom({ language, token, draft, setDraft, guestDraft, onGuestDraftUsed, restoring, accountUnavailable, onBack, onSignIn, onExpired }: {
  language: Language; token: string | null; draft: string; setDraft: (text: string) => boolean;
  guestDraft: string; onGuestDraftUsed: () => void; restoring: boolean; accountUnavailable: boolean;
  onBack: (event: MouseEvent<HTMLAnchorElement>) => void;
  onSignIn: () => void; onExpired: () => void;
}) {
  const companion = companions[language];
  const [turns, setTurns] = useState<(Turn & { streamed?: true })[]>([]);
  const [archivedTurns, setArchivedTurns] = useState<Turn[]>([]);
  const [resetting, setResetting] = useState(false);
  const [conversation, setConversation] = useState(0);
  const [active, setActive] = useState<{ question: string; reply: string; textEnded: boolean } | null>(null);
  const [performance, setPerformance] = useState<Performance>({ phase: "idle", cue: "rest" });
  const [engaged, setEngaged] = useState(false);
  const [started, setStarted] = useState(false);
  const [voice, setVoice] = useState(() => {
    try { return localStorage.getItem(voiceKey) !== "off"; }
    catch { return true; }
  });
  const [listening, setListening] = useState(false);
  const [playbackState, setPlaybackState] = useState<"silent" | "queued" | "speaking">("silent");
  const [notice, setNotice] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [history, setHistory] = useState<"loading" | "ready" | "error">(token ? "loading" : "ready");
  const [historyRetry, setHistoryRetry] = useState(0);
  const input = useRef<HTMLTextAreaElement>(null);
  const transcript = useRef<HTMLElement>(null);
  const archive = useRef<HTMLDialogElement>(null);
  const voiceWaves = useRef<SVGGElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const run = useRef<AbortController | null>(null);
  const reset = useRef<AbortController | null>(null);
  const audio = useRef<ReturnType<typeof createPlayback> | null>(null);
  const audioFrame = useRef(0);
  const recognition = useRef<ReturnType<typeof speechRecognition>>(null);
  const loading = restoring || history === "loading";
  const reduced = useReducedMotion();
  const busy = !!active;
  const canSend = !busy && !loading && !accountUnavailable && !resetting && !listening && !!draft.trim();
  const visibleDraft = busy ? "" : draft;
  const sendArrow = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!canSend || reduced || !sendArrow.current) return;
    const rise = waapi.animate(sendArrow.current, { translateY: [3, 0], duration: 180 });
    return () => { rise.cancel(); };
  }, [canSend, reduced]);
  const atWork = busy || listening || playbackState !== "silent";
  const mode = engaged ? "interaction" : "default";
  const state: StageState = !engaged ? "idle"
    : listening ? "listening"
    : playbackState === "speaking" ? "speaking"
    : busy ? performance.phase
    : "attentive";

  useEffect(() => {
    if (!engaged || atWork) return;
    const timeout = window.setTimeout(() => setEngaged(false), conversationIdleMs);
    return () => window.clearTimeout(timeout);
  }, [engaged, atWork, draft]);

  useLayoutEffect(() => {
    const field = input.current!;
    const sizing = measure.current!;
    const observer = new ResizeObserver(() => {
      field.style.setProperty("--draft-height", sizing.offsetHeight + "px");
    });
    observer.observe(sizing);
    return () => observer.disconnect();
  }, []);

  function editDraft(value: string) {
    setEngaged(true);
    return setDraft(value);
  }

  function insertDraft(text: string, fromGuest = false) {
    const combined = appendToDraft(draft, text);
    if (combined === null) {
      setNotice("Your draft is full. Shorten it before adding more text.");
    } else {
      const stored = editDraft(combined);
      if (fromGuest && stored) onGuestDraftUsed();
      setNotice(fromGuest && !stored ? "Device storage is unavailable. The guest draft remains saved separately." : "");
    }
    input.current?.focus();
  }

  function retryHistory() {
    setHistory("loading");
    setHistoryRetry(count => count + 1);
  }

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setHistory("loading");
    loadHistory(token, language, controller.signal).then(({ turns, archive }) => {
      if (!controller.signal.aborted) {
        setTurns(turns);
        setArchivedTurns(archive ?? turns);
        setHistory("ready");
      }
    }).catch(error => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) onExpired();
      else setHistory("error");
    });
    return () => controller.abort();
  }, [token, language, onExpired, historyRetry]);

  useEffect(() => () => {
    run.current?.abort();
    reset.current?.abort();
    const mic = recognition.current;
    recognition.current = null;
    if (mic) { mic.onresult = mic.onerror = mic.onend = null; mic.abort(); }
    cancelAnimationFrame(audioFrame.current);
    audio.current?.close();
  }, []);

  useLayoutEffect(() => {
    const log = transcript.current;
    if (log && follow.current && (turns.length || active)) log.scrollTop = log.scrollHeight;
  }, [turns, active, history]);

  function stopAudio() {
    cancelAnimationFrame(audioFrame.current);
    audioFrame.current = 0;
    audio.current?.close();
    audio.current = null;
    setPlaybackState("silent");
  }

  function watchAudio() {
    const playback = audio.current;
    if (audioFrame.current || !playback) return;
    const tick = () => {
      if (audio.current !== playback) return;
      const queued = playback.active();
      setPlaybackState(playback.playing() ? "speaking" : queued ? "queued" : "silent");
      audioFrame.current = queued ? requestAnimationFrame(tick) : 0;
      if (!audioFrame.current && !run.current) stopAudio();
    };
    audioFrame.current = requestAnimationFrame(tick);
  }

  function toggleVoice() {
    if (voice) stopAudio();
    setVoice(!voice);
    try { localStorage.setItem(voiceKey, voice ? "off" : "on"); } catch { /* Keep the current room preference. */ }
  }

  useEffect(() => {
    if (!voice || reduced || !voiceWaves.current) return;
    const wave = waapi.animate(voiceWaves.current.querySelectorAll("path"), {
      opacity: [0, 1], translateX: [-2, 0], delay: (_, index) => index * 70, duration: 240,
    });
    return () => { wave.cancel(); };
  }, [voice, reduced]);

  async function newConversation() {
    if (loading || accountUnavailable || reset.current) return;
    run.current?.abort();
    run.current = null;
    stopAudio();
    const mic = recognition.current;
    recognition.current = null;
    if (mic) { mic.onresult = mic.onerror = mic.onend = null; mic.abort(); }
    setListening(false);
    setActive(null);
    setPerformance({ phase: "idle", cue: "rest" });
    setEngaged(false);
    setNotice("");
    const controller = new AbortController();
    reset.current = controller;
    setResetting(true);
    try {
      if (token) await startConversation(token, language, controller.signal);
      if (controller.signal.aborted) return;
      follow.current = true;
      setStarted(false);
      setTurns([]);
      setConversation(value => value + 1);
      setAnnouncement("New conversation started.");
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) onExpired();
      else setNotice("Could not start a new conversation. Try again.");
    } finally {
      reset.current = null;
      if (!controller.signal.aborted) setResetting(false);
    }
  }

  function dictate() {
    if (recognition.current) { recognition.current.stop(); return; }
    if (!token) { onSignIn(); return; }
    if (run.current || reset.current) return;
    setNotice("");
    const mic = speechRecognition();
    if (!mic) { setNotice("Dictation is unavailable in this browser. You can type your reply."); return; }
    stopAudio();
    const prefix = draft.trim() ? `${draft.trim()} ` : "";
    mic.lang = companion.locale;
    mic.interimResults = true;
    mic.continuous = true;
    mic.onresult = event => setDraft((prefix + Array.from(event.results, result => result[0]?.transcript ?? "").join("")).slice(0, messageLimit));
    mic.onerror = event => {
      if (event.error !== "aborted") setNotice(event.error === "not-allowed"
        ? "Microphone access was denied. Allow it in your browser or type your reply."
        : "Dictation ended early. Try the microphone again or type your reply.");
    };
    mic.onend = () => {
      if (recognition.current !== mic) return;
      recognition.current = null;
      setListening(false);
      input.current?.focus();
    };
    try { mic.start(); recognition.current = mic; setEngaged(true); setListening(true); }
    catch { setNotice("The microphone could not start. You can type your reply."); }
  }

  function stopReply() {
    run.current?.abort();
    run.current = null;
    stopAudio();
    setActive(null);
    setPerformance({ phase: "idle", cue: "rest" });
    setNotice("Reply stopped. Your message is ready to resend.");
    input.current?.focus();
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!canSend || run.current || reset.current || recognition.current) return;
    if (!token) { onSignIn(); return; }
    stopAudio();
    const controller = new AbortController();
    run.current = controller;
    setNotice("");
    if (voice) {
      try {
        const playback = createPlayback();
        audio.current = playback;
        void playback.ready.catch(() => {
          if (audio.current !== playback) return;
          stopAudio();
          setNotice("Audio playback is unavailable. The reply will appear in the conversation.");
        });
      } catch { setNotice("Audio playback is unavailable. The reply will appear in the conversation."); }
    }
    const playback = audio.current;
    follow.current = true;
    setActive({ question, reply: "", textEnded: false });
    setEngaged(true);
    setStarted(true);
    setPerformance({ phase: "thinking", cue: "consider" });
    input.current?.focus();
    let reply = "";
    try {
      const events = await streamTurn(token, language, question, !!playback, controller.signal);
      for await (const { name, value } of events) {
        if (controller.signal.aborted) return;
        if (name === "performance" && ["thinking", "responding"].includes(value?.phase)) {
          setPerformance(value as Performance);
        }
        if (name === "text" && typeof value === "string") {
          reply += value;
          setPerformance(current => current.phase === "responding" ? current : { ...current, phase: "responding", cue: "explain" });
          setActive({ question, reply, textEnded: false });
        }
        if (name === "text_end") setActive({ question, reply, textEnded: true });
        if (name === "audio" && playback && playback === audio.current) {
          try { playback.enqueue(value as AudioChunk); setPlaybackState(playback.playing() ? "speaking" : "queued"); watchAudio(); }
          catch { stopAudio(); setNotice("The audio was interrupted. You can still read the reply."); }
        }
        if (name === "voice_error" && playback === audio.current) setNotice("Voice is unavailable for this reply. You can still read it.");
        if (name === "error") throw new Error(value === "provider_quota"
          ? "The companion has reached its usage limit. Try again later."
          : "The reply was interrupted. Your message is ready to resend.");
      }
      if (!controller.signal.aborted) {
        if (!reply.trim()) throw new Error("No reply arrived. Your message is ready to resend.");
        const turn = { question, reply, streamed: true as const };
        setTurns(previous => [...previous, turn]);
        setArchivedTurns(previous => [...previous, turn].slice(-12));
        setAnnouncement(`${companion.first}: ${reply.replace(/^(English|Spanish|Japanese):\s*/gim, "").replace(/\r?\n/g, " ")}`);
        setDraft("");
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      stopAudio();
      if (error instanceof ApiError && error.status === 401) onExpired();
      else setNotice(error instanceof TypeError ? "Could not reach the companion. Try sending your message again." :
        error instanceof Error ? error.message : "The room is temporarily unavailable. Try again.");
    } finally {
      if (run.current === controller) {
        run.current = null;
        if (!audio.current?.active()) stopAudio();
        setActive(null);
      }
    }
  }

  const last = turns.at(-1);
  const turnIndex = active ? turns.length : turns.length - 1;
  const replyText = active?.reply ?? (last?.streamed ? last.reply : "");
  const textEnded = active?.textEnded ?? true;
  const lines = useMemo(() => replyLines(replyText, companion.locale, textEnded), [replyText, companion.locale, textEnded]);
  const hasReply = active ? lines.some(line => line?.words.length) : !!last;
  const question = active?.question ?? last?.question;
  const cards = [];
  const introDismissed = started || !!last;
  if (active && !hasReply && last) cards.push({ key: `reply-${turnIndex - 1}`, who: companion.first, content: <Reply text={last.reply} locale={companion.locale} />, past: true });
  if (question) cards.push({ key: `question-${turnIndex}`, who: "You", content: <p>{question}</p>, past: hasReply });
  if (hasReply) cards.push({ key: `reply-${turnIndex}`, who: companion.first, past: false,
    content: active || last?.streamed ? <LiveReply lines={lines} transcript={transcript} follow={follow} reduced={reduced} />
      : <Reply text={last!.reply} locale={companion.locale} /> });
  const cafe = last && /coffee|barista|caf[eé]|コーヒー/i.test(last.question + last.reply);
  const suggestions = last ? [
    { label: "Say it slowly", icon: AudioLines, prompt: "Repeat the last phrase slowly and help me pronounce it." },
    cafe ? { label: "Ask the price", icon: Coffee, prompt: "Help me ask how much my order costs, then play the barista." }
      : { label: "Keep going", icon: MessageCircle, prompt: "Continue our conversation with a follow-up question." },
  ] : [];

  return (
    <CompanionStage companion={companion} mode={mode} state={state} cue={performance.cue} mood={performance.mood ?? "neutral"}
      level={() => audio.current?.level() ?? 0}
      letter={() => audio.current?.letter() ?? ""}>
      <a href={pagePaths.companion} className="room-back" aria-label="Back to companion selection" onClick={onBack}>
        <ArrowLeft size={21} aria-hidden="true" />
      </a>
      <section className="conversation" aria-label="Conversation">
        <div className="room-tools" role="group" aria-label="Conversation controls">
          <button type="button" title="New conversation" aria-label="New conversation" disabled={loading || accountUnavailable || resetting} onClick={newConversation}>
            <motion.span aria-hidden="true" whileTap={reduced ? undefined : { y: 2 }}><MessageSquarePlus size={21} /></motion.span>
          </button>
          <button type="button" title="Conversation history" aria-label="Conversation history" aria-haspopup="dialog" onClick={() => archive.current?.showModal()}><History size={21} /></button>
          <button type="button" title={voice ? "Mute companion" : "Enable companion voice"} aria-pressed={voice} aria-label="Companion voice" onClick={toggleVoice}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 5 6 9H3v6h3l5 4z"/>
              {voice ? <g ref={voiceWaves} className="voice-waves"><path d="M15 9a4 4 0 0 1 0 6"/><path d="M18 5.5a9 9 0 0 1 0 13"/></g>
                : <motion.path d="m16 10 5 5m0-5-5 5" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} />}
            </svg>
          </button>
        </div>
        <dialog className="access archive" ref={archive} aria-labelledby="history-heading">
          <header className="archive-heading">
            <small>{companion.name} <span aria-hidden="true">·</span> {language}</small>
            <h2 id="history-heading">Conversation history</h2>
            <button type="button" className="dialog-close" aria-label="Close history" onClick={() => archive.current?.close()}><X size={19} /></button>
          </header>
          <div className="archive-body">
            {(loading || accountUnavailable || history === "error" || !archivedTurns.length) && <div className="archive-empty">
              <MessageCircle size={25} aria-hidden="true" />
              <p role="status">{loading ? "Loading conversation…" : history === "error" || accountUnavailable ? "History unavailable." : token ? "Your completed exchanges will appear here." : "Sign in to view your saved conversations."}</p>
              {history === "error" && <button type="button" className="access-switch" disabled={resetting || busy || listening} onClick={() => { retryHistory(); archive.current?.querySelector<HTMLElement>(".dialog-close")?.focus(); }}>Retry history</button>}
            </div>}
            {archivedTurns.map((turn, i) => <article key={i}>
              <div className="archive-question"><small>You</small><p>{turn.question}</p></div>
              <div className="archive-answer"><small>{companion.first}</small><Reply text={turn.reply} locale={companion.locale} /></div>
            </article>)}
          </div>
        </dialog>
        <div className="room-floor">
          <div className="cards">
            {!loading && <motion.article key={conversation} className="message greeting" data-dismissed={introDismissed} inert={introDismissed}
              initial={conversation && !reduced ? { opacity: 0, clipPath: "inset(0 0 18% round 14px)" } : false}
              animate={{ opacity: 1, clipPath: "inset(0 0 0% round 14px)" }} transition={{ duration: reduced ? 0 : .28 }}>
              <span className="speaker">{companion.first}</span>
              <p>{companion.introduction}</p>
              <div className="greeting-language">
                <span lang={companion.locale}>{companion.greeting}</span>
                <span className="pronunciation"><span className="sr-only">Pronunciation: </span>{companion.pronunciation}</span>
              </div>
            </motion.article>}
            {cards.map(card => <article key={card.key} className={`message ${card.past ? "past" : "current"}`} ref={card.past ? undefined : transcript}
              aria-hidden={card.past || undefined} tabIndex={card.past ? -1 : 0} onScroll={e => { if (!card.past) follow.current = e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight < 48; }}>
              <span className="speaker">{card.who}</span>{card.content}</article>)}
          </div>
          <aside className="topics intro-topics" aria-label="Start a conversation" data-dismissed={introDismissed || loading}
            inert={introDismissed || loading}>
            <span className="topic-label">Start a conversation</span>
            {topics.map(({ label, icon: Icon, prompt }) => <button type="button" key={label} disabled={busy || listening || resetting || accountUnavailable}
              onClick={() => insertDraft(prompt)}><Icon size={15} />{label}</button>)}
          </aside>
          {!busy && !!last && <aside className="topics follow-up" aria-label="Follow-up prompts">
            {suggestions.map(({ label, icon: Icon, prompt }) => <button type="button" key={label} disabled={listening || resetting}
              onClick={() => insertDraft(prompt)}><Icon size={15} />{label}</button>)}
          </aside>}
          <span className="sr-only" role="status">{announcement}</span>
          <form className="compose" onSubmit={send}>
            {notice && <p className="notice" role="status">{notice}</p>}
            {history === "error" && <p className="notice" role="status">Past messages are unavailable. <button type="button" onClick={() => archive.current?.showModal()}>Open history</button></p>}
            {guestDraft.trim() && <p className="notice">You have a guest draft. <button type="button" disabled={busy || listening || resetting} onClick={() => insertDraft(guestDraft, true)}>Add guest draft</button></p>}
            <label className="compose-label" htmlFor="companion-message">Your message</label>
            <div className="compose-controls">
              <button type="button" className="mic-button" disabled={busy || loading || accountUnavailable || resetting} aria-pressed={listening}
                aria-label={listening ? "Stop dictation" : "Dictate a message"} title={listening ? "Stop dictation" : "Dictate a message"} onClick={dictate}>
                {listening ? <Square size={17} /> : <Mic size={19} />}
              </button>
              <div className="compose-size">
                <div className="compose-measure" ref={measure} aria-hidden="true">{visibleDraft}{"\u200b"}</div>
              <textarea id="companion-message" ref={input} rows={1} maxLength={messageLimit} placeholder={listening ? "Listening…" : "Type or use the mic…"}
                readOnly={busy || listening || resetting || restoring || accountUnavailable} value={visibleDraft} onChange={event => editDraft(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault(); event.currentTarget.form?.requestSubmit();
                  }
                }} />
              </div>
              <motion.button key={busy ? "stop" : "send"} type={busy ? "button" : "submit"}
                className="send-button" disabled={!busy && !canSend} onClick={busy ? stopReply : undefined}
                aria-label={busy ? "Stop reply" : "Send message"} title={busy ? "Stop reply" : "Send message"}
                whileTap={reduced || (!busy && !canSend) ? undefined : { scale: 0.94 }}>
                {busy ? <Square size={15} fill="currentColor" /> : <ArrowUp ref={sendArrow} size={21} />}
              </motion.button>
            </div>
          </form>
        </div>
      </section>
    </CompanionStage>
  );
}
