import { useEffect, useRef, useState, type MouseEvent } from "react";
import { readingPath, validReadingId } from "../lib/navigation";
import { waapi } from "animejs/waapi";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { ArrowRight, AudioWaveform, BookOpen, Check, Flame, GraduationCap, MapPin, MessageCircle, Star, Trophy } from "lucide-react";
import { ApiError, type Language } from "../lib/companion";
import { loadDashboard, nextPractice, practiceWeek, recentActivity, type DashboardData } from "../lib/dashboard";
import { companions } from "../lib/companions";
import mariaArt from "../assets/maria-record.webp";
import akiraArt from "../assets/akira-book.webp";
import lanternArt from "../assets/weekly-paper-lantern.webp";
import terraceArt from "../assets/weekly-terrace.jpg";
import "./dashboard.css";

const activity = {
  exchange: { icon: MessageCircle, label: "Conversation practice" },
  lesson: { icon: GraduationCap, label: "Lesson completed" },
  reading: { icon: BookOpen, label: "Reading completed" },
};
const dateFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });

function Statistic({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const number = useMotionValue(value);
  const text = useTransform(number, n => Math.round(n).toLocaleString());
  useEffect(() => {
    if (reduced) { number.set(value); return; }
    number.set(0);
    const controls = animate(number, value, { duration: .45, ease: "easeOut" });
    return () => controls.stop();
  }, [number, value, reduced]);
  return <><span className="sr-only">{value.toLocaleString()}</span><motion.span aria-hidden="true">{text}</motion.span></>;
}

export function Dashboard({ token, language, displayName, restoring, accountUnavailable, hasDraft, onSignIn, onExpired, onPractice, onRead }: {
  token: string | null;
  language: Language;
  displayName?: string;
  restoring: boolean;
  accountUnavailable: boolean;
  hasDraft: boolean;
  onSignIn: () => void;
  onExpired: () => void;
  onPractice: (prompt?: string) => void;
  onRead: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
}) {
  const scope = useRef<HTMLElement>(null);
  const [selectedDay, selectDay] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const [records, setRecords] = useState<Partial<Record<Language, DashboardData>>>({});
  const previous = records[language === "spanish" ? "japanese" : "spanish"];
  const [failedLanguage, setFailedLanguage] = useState<Language | null>(null);
  const failed = failedLanguage === language;
  const data = failed ? null : records[language] ?? null;
  const [retry, setRetry] = useState(0);
  const companion = companions[language];
  const recent = data ? recentActivity(data.recent) : [];
  const practice = nextPractice(language, data);
  const firstName = displayName?.trim().split(/\s+/)[0];
  const greeting = language === "spanish"
    ? firstName ? `¡Hola, ${firstName}!` : "¡Hola!"
    : firstName ? `こんにちは、${firstName}さん。` : "こんにちは！";

  useEffect(() => {
    setFailedLanguage(null);
    selectDay(null);
    if (!token) return;
    const controller = new AbortController();
    loadDashboard(token, language, controller.signal).then(result => {
      if (!controller.signal.aborted) setRecords(current => ({ ...current, [language]: result }));
    }).catch(error => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) onExpired();
      else setFailedLanguage(language);
    });
    return () => controller.abort();
  }, [token, language, onExpired, retry]);

  const week = data ? practiceWeek(data.today, data.activeDays) : [];
  const today = week.at(-1);
  const selected = week.find(day => day.key === selectedDay) ?? today;
  const practicedDays = week.filter(day => day.active).length;
  const remainingDays = Math.max(0, 3 - practicedDays);
  const level = Math.floor((data?.xp ?? 0) / 100) + 1;
  const badges = data ? [
    { name: "First exchange", unit: "exchange", icon: MessageCircle, count: data.exchanges, goal: 1 },
    { name: "Three in a row", unit: "consecutive days", icon: Flame, count: data.bestStreak, goal: 3 },
    { name: "Five lessons", unit: "lessons", icon: GraduationCap, count: data.lessons, goal: 5 },
  ] : [];
  const hasRecord = data && (data.exchanges || data.lessons || data.readings || data.xp || data.bestStreak);
  useEffect(() => {
    if (!data || reducedMotion || !scope.current) return;
    const ring = scope.current.querySelector<SVGCircleElement>(".journal-level-fill");
    const marks = scope.current.querySelectorAll(".journal-day[data-active=true] polyline, .journal-day[data-active=true] path");
    const ringDraw = ring && waapi.animate(ring, { strokeDashoffset: [100, 100 - data.xp % 100], duration: 600 });
    const checks = marks.length ? waapi.animate(marks, {
      strokeDashoffset: [24, 0], duration: 270, delay: (_, index) => index * 45,
    }) : null;
    return () => { ringDraw?.cancel(); checks?.cancel(); };
  }, [data, reducedMotion]);

  return <section className="journal" ref={scope} data-language={language} aria-labelledby="workspace-title">
    <section className="swara-paper journal-session" aria-labelledby="session-title">
      <motion.div key={language} className="journal-prompt" initial={reducedMotion ? false : { opacity: .78, y: 4 }}
        animate={{ opacity: 1, y: 0 }} transition={{ duration: .24, ease: "easeOut" }}>
        <p className="journal-label"><AudioWaveform size={17} aria-hidden="true" />{hasDraft ? "Conversation draft" : "Suggested conversation"}</p>
        <h2 id="session-title">{hasDraft ? "Pick up where you left off" : practice.title}</h2>
        <p className="journal-prompt-copy">
          <span className="journal-greeting" lang={companion.locale}>{greeting}</span>{" "}
          {hasDraft ? "Your unsent message is ready to continue." : practice.topic
            ? <>Share one idea from <cite>{practice.topic}</cite>.</>
            : practice.detail}
        </p>
        <button type="button" className="swara-action journal-cta" onClick={() => onPractice(hasDraft ? undefined : practice.prompt)}>{hasDraft ? `Resume with ${companion.first}` : `Practice with ${companion.first}`}<ArrowRight size={17} aria-hidden="true" /></button>
      </motion.div>
      <div className="journal-art">
        <motion.img key={language} src={language === "spanish" ? mariaArt : akiraArt} alt=""
          initial={reducedMotion ? false : { opacity: .72 }} animate={{ opacity: 1 }} transition={{ duration: .24 }} />
        <span className="journal-place"><MapPin size={13} aria-hidden="true" />{companion.city}</span>
      </div>
    </section>
    {data && selected ? <>
      <section className="journal-week" aria-labelledby="rhythm-title">
        <div className="journal-week-summary">
          <img className="journal-week-backdrop" src={terraceArt} alt="" />
          <div className="journal-week-copy">
            <h2 id="rhythm-title">This week</h2>
            <div className="journal-goal">
              <p><strong>{practicedDays > 3 ? practicedDays : `${practicedDays} of 3`} <span>practice days</span></strong></p>
              <p>{remainingDays === 0 ? "Weekly goal reached" : practicedDays === 0 ? "Each practice day counts once"
                : `${remainingDays} ${remainingDays === 1 ? "day" : "days"} to go`}</p>
            </div>
            <p className="journal-streak"><Flame size={15} aria-hidden="true" />{data.streak ? `${data.streak}-day streak` : data.bestStreak ? "No active streak" : "Your first practice day starts a streak"}</p>
          </div>
          <div className="journal-week-lanterns" aria-hidden="true">
            {[1, 2, 3].map(day => {
              const lit = practicedDays >= day;
              const delay = lit && !reducedMotion ? (day - 1) * .11 : 0;
              return <motion.div className="journal-week-lantern" data-lit={lit} key={day}
                initial={reducedMotion ? false : { rotate: 0 }}
                animate={{ rotate: lit && !reducedMotion ? [0, -3, 1.5, 0] : 0 }}
                transition={{ delay, duration: lit && !reducedMotion ? .85 : 0, ease: "easeInOut" }}>
                <img src={lanternArt} alt="" className="journal-lantern-paper" />
                <motion.div className="journal-lantern-light"
                  initial={reducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: lit ? 1 : 0 }}
                  transition={{ delay, duration: reducedMotion ? 0 : .55, ease: "easeOut" }}>
                  <img src={lanternArt} alt="" />
                </motion.div>
              </motion.div>;
            })}
          </div>
        </div>
        <div className="journal-calendar">
          <div className="journal-calendar-heading"><strong>Last seven days</strong><span>UTC</span></div>
          <div className="journal-days" role="group" aria-label="Inspect a practice day">
            {week.map(day => <button type="button" key={day.key} className="journal-day" data-active={day.active} aria-pressed={selected.key === day.key} aria-label={`${day.key === data.today ? "Today, " : ""}${day.label}, ${day.active ? "practice recorded" : "no practice recorded"}`} onClick={() => selectDay(day.key)}>
              <span className="journal-node">{day.active ? <Check size={16} /> : day.key.slice(-2)}
                {day.key === selected.key && <motion.span aria-hidden="true" className="journal-selection" layoutId="practice-day-selection"
                  transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 460, damping: 36 }} />}
              </span>
              <span>{day.key === data.today ? "Today" : day.name}</span>
            </button>)}
          </div>
          <p role="status"><time dateTime={selected.key}>{dateFormat.format(new Date(selected.key))}</time> · {selected.active
            ? "Practice recorded"
            : selected.key === data.today ? "No practice yet today" : "No practice recorded"}</p>
        </div>
      </section>
      <div className="journal-details">
        <section aria-labelledby="activity-title">
          <h2 id="activity-title">Recent activity</h2>
          {recent.length ? <ol className="journal-events">{recent.map((event, index) => {
            const { icon: Icon, label } = activity[event.kind];
            const { articleId } = event;
            return <li key={`${event.at}-${index}`}>
              <span className="journal-event-mark"><Icon size={16} aria-hidden="true" /></span>
              <div>
                {event.kind === "exchange" ? <strong>{event.count} {event.count === 1 ? "exchange" : "exchanges"} with {companion.first}</strong>
                  : <strong>{event.kind === "reading" && articleId && validReadingId(articleId)
                    ? <a href={readingPath(articleId)} onClick={click => onRead(click, articleId)}>{event.title || label}</a>
                    : event.title || label}</strong>}
                {event.kind !== "exchange" && event.title && <small>{label}</small>}
              </div>
              <time dateTime={event.date}>{dateFormat.format(new Date(event.date))}</time>
            </li>;
          })}</ol> : <p className="journal-empty">Your conversations, completed lessons, and finished readings will appear here.</p>}
        </section>
        <section aria-labelledby="record-title">
          <h2 id="record-title">Learning record</h2>
          {hasRecord ? <>
            <div className="journal-level">
              <div className="journal-ring" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28"/><circle className="journal-level-fill" cx="32" cy="32" r="28" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - data.xp % 100}/></svg><Star size={16}/></div>
              <div><strong>Level {level}</strong><p>{data.xp.toLocaleString()} lesson XP · {100 - data.xp % 100} XP to level {level + 1}</p></div>
            </div>
            <dl className="journal-totals">
              {([["Exchanges", data.exchanges], ["Lessons completed", data.lessons], ["Readings completed", data.readings], ["Best streak", data.bestStreak]] as const).map(([label, count]) =>
                <div key={label}>
                  <dt>{label}</dt>
                  <dd><Statistic value={count} />{label === "Best streak" && <small> {count === 1 ? "day" : "days"}</small>}</dd>
                </div>)}
            </dl>
          </> : <p className="journal-empty">Complete lessons to earn XP and level up.</p>}
          <h3>Milestones</h3>
          <ul className="journal-badges">{badges.map(({ name, unit, icon: Icon, count, goal }) => <li key={name} data-earned={count >= goal}>
            <Icon size={15} aria-hidden="true" />
            <strong>{name}</strong>
            <small>{count >= goal ? "Earned" : goal === 1 ? "Complete 1 exchange" : `${count} of ${goal} ${unit}`}</small>
          </li>)}</ul>
        </section>
      </div>
    </> : !accountUnavailable && <section className="journal-access" aria-busy={!!(restoring || (token && !failed))}>
      <span className="journal-seal"><Trophy size={25}/></span>
      <div><h2>Your learning record</h2><p role="status">{failed ? "Your learning activity is temporarily unavailable." : previous ? "Loading this language’s practice record…" : restoring ? "Restoring your account…" : token ? "Loading your learning activity…" : "Sign in to save your practice and track your progress."}</p></div>
      {failed ? <button className="swara-action swara-action--quiet" onClick={() => { setFailedLanguage(null); setRetry(v => v + 1); }}>Retry</button> : !restoring && !token && <button className="swara-action swara-action--quiet" onClick={onSignIn}>Sign in <ArrowRight size={15}/></button>}
    </section>}
  </section>;
}
