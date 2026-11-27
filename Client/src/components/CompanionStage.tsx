import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { Acting } from "../lib/avatarBehavior";
import type { companions } from "../lib/companions";

const status = {
  idle: "",
  attentive: "",
  listening: "Listening",
  thinking: "Thinking",
  responding: "Replying",
  speaking: "Speaking",
};

export function CompanionStage({
  companion,
  children,
  ...acting
}: Acting & {
  companion: (typeof companions)[keyof typeof companions];
  children: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement>(null);
  const latest = useRef(acting);
  latest.current = acting;
  const [view, setView] = useState<"loading" | "model" | "portrait">("loading");
  useEffect(() => {
    const controller = new AbortController();
    const element = host.current!;
    import("../lib/avatarScene")
      .then(({ mountAvatar }) =>
        mountAvatar(
          element,
          companion.model,
          () => latest.current,
          controller.signal,
          setView,
        ),
      )
      .catch(() => {
        if (!controller.signal.aborted) setView("portrait");
      });
    return () => controller.abort();
  }, [companion]);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.timeline({ defaults: { duration: .26, ease: "power2.out", clearProps: "opacity,transform" } })
        .from(".identity", { opacity: .6, y: 7 })
        .from(".room-tools, .room-back", { opacity: .8, y: 3 }, "<0.06");
    });
    return () => media.revert();
  }, { scope: stage });

  const presence = view === "loading" ? "Joining you…" : status[acting.state];
  return (
    <section
      className="stage"
      ref={stage}
      data-mode={acting.mode}
      data-state={acting.state}
      data-view={view}
      aria-labelledby="room-title"
    >
      {view === "portrait" && (
        <img className="fallback" src={companion.image} alt="" />
      )}
      <div className="avatar-host" ref={host} aria-hidden="true" />
      <header className="identity">
        <h1 id="room-title"><span>Practice with </span>{companion.name}</h1>
        <p className="presence" role="status">
          {presence && <i aria-hidden="true" />}
          {presence}
        </p>
      </header>
      {children}
    </section>
  );
}
