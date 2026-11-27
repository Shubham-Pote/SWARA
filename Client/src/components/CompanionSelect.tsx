import { useRef, useState, type MouseEvent } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { ArrowUpRight, BookOpen, Disc3 } from "lucide-react";
import { companions } from "../lib/companions";
import { pagePaths } from "../lib/navigation";
import type { Language } from "../lib/companion";
import maria from "../assets/picker-maria.webp";
import akira from "../assets/picker-akira.webp";
import "./picker.css";

const guides = [
  { id: "spanish", language: "Spanish", portrait: maria, icon: Disc3, bio: "Bring a favorite record. I'll show you where to eat after the show." },
  { id: "japanese", language: "Japanese", portrait: akira, icon: BookOpen, bio: "Pick a page with me. There's always a story between the lines." },
] as const;

export function CompanionSelect({ follow }: { follow: (event: MouseEvent<HTMLAnchorElement>, next: Language) => boolean }) {
  const stage = useRef<HTMLElement>(null);
  const [active, setActive] = useState<Language | null>(null);
  const reduced = useReducedMotion();
  const x = useSpring(0, { stiffness: 115, damping: 22 });
  const y = useSpring(0, { stiffness: 115, damping: 22 });
  const backdropX = useTransform(x, value => -value * .55);
  const backdropY = useTransform(y, value => -value * .55);

  return <section className="picker" ref={stage} data-active={active ?? undefined} aria-labelledby="picker-title"
    onPointerMove={event => {
      if (reduced || event.pointerType !== "mouse") return;
      const bounds = event.currentTarget.getBoundingClientRect();
      x.set(((event.clientX - bounds.left) / bounds.width - .5) * 16);
      y.set(((event.clientY - bounds.top) / bounds.height - .5) * 10);
    }}
    onPointerLeave={() => { x.set(0); y.set(0); }}>
    <div className="picker-scenery" aria-hidden="true">
      <motion.div className="picker-scenery-image" style={{ x: reduced ? 0 : backdropX, y: reduced ? 0 : backdropY }} />
    </div>
    <header className="picker-heading"><h1 id="picker-title">Pick a practice <em>companion.</em></h1></header>
    <div className="picker-cast">
      {guides.map(({ id, language, portrait, icon: Icon, bio }) => {
        const guide = companions[id];
        return <a key={id} className="picker-guide" data-guide={id} href={pagePaths[id]}
          aria-label={`Enter ${guide.name}’s room to practice ${language}`} aria-describedby={`bio-${id}`}
          onPointerEnter={event => { if (event.pointerType === "mouse") setActive(id); }}
          onPointerLeave={() => setActive(null)} onFocus={() => setActive(id)} onBlur={() => setActive(null)}
          onClick={event => {
            if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && stage.current)
              stage.current.dataset.depart = id;
            follow(event, id);
          }}>
          <motion.div className="picker-portrait" style={{ x: reduced ? 0 : x, y: reduced ? 0 : y }}>
            <img src={portrait} alt="" draggable={false} />
          </motion.div>
          <div className="picker-caption">
            <span className="picker-location"><Icon size={17} aria-hidden="true" />{language} in {guide.city}</span>
            <p className="picker-name" aria-hidden="true"><span className="picker-first">{Array.from(guide.first).map((letter,i) =>
              <span key={i} style={{ transitionDelay: `${i * 19}ms` }}>{letter}</span>)}</span>
              <span className="picker-family">{guide.name.slice(guide.first.length + 1)} <ArrowUpRight size={19} aria-hidden="true"/></span>
            </p>
            <p id={`bio-${id}`} className="picker-bio">{bio}</p>
          </div>
        </a>;
      })}
    </div>
  </section>;
}
