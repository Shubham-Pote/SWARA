import { useEffect, useRef } from "react";
import { waapi } from "animejs/waapi";
import { motion, useReducedMotion } from "motion/react";
import type { Language } from "../lib/companion";
import { readingNames } from "../lib/reading";

const languages = ["spanish", "japanese"] as const;

export function WorkspaceHeader({ title, language, busy, disabled, onLanguage }: {
  title: string;
  language: Language;
  busy: boolean;
  disabled: boolean;
  onLanguage?: (language: Language) => void;
}) {
  const reduced = useReducedMotion();
  const selection = useRef<HTMLSpanElement>(null);
  const previous = useRef(language);

  useEffect(() => {
    const changed = previous.current !== language;
    previous.current = language;
    if (!changed || reduced || !selection.current) return;
    const animation = waapi.animate(selection.current, { scale: [.88, 1], duration: 200, ease: "out(2)" });
    return () => { animation.cancel(); };
  }, [language, reduced]);

  return <header className="workspace-header">
    <h1 id="workspace-title">{title}</h1>
    {onLanguage && <div className="language-switch" role="group" aria-label="Practice language" aria-busy={busy}>
      {languages.map(option => <button key={option} type="button" aria-pressed={language === option}
        aria-disabled={disabled || busy} onClick={() => onLanguage(option)}>
        {language === option && <motion.span aria-hidden="true" className="language-switch-selection" layoutId="practice-language"
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 440, damping: 38, mass: .72 }} />}
        <span ref={language === option ? selection : undefined} className="language-switch-glyph" aria-hidden="true">{option === "spanish" ? "Ñ" : "あ"}</span>
        {readingNames[option]}
      </button>)}
    </div>}
  </header>;
}
