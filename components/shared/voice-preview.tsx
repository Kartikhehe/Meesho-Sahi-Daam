"use client";

/**
 * A spoken version of a verdict or alert, for a seller who reads slowly or not
 * at all. Uses the browser's own speech engine (offline, no network) in Hindi
 * when one is installed; when it is not, the script is simply shown as text —
 * the control never errors and never pretends.
 */

import { useEffect, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function VoicePreview({ script, className }: { script: string; className?: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const play = () => {
    if (!supported) {
      setShowText(true);
      return;
    }
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(script);
    u.lang = "hi-IN";
    u.rate = 0.92;
    const hindi = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("hi"));
    if (hindi) u.voice = hindi;
    u.onend = () => setSpeaking(false);
    u.onerror = () => {
      setSpeaking(false);
      setShowText(true);
    };
    setSpeaking(true);
    setShowText(true);
    synth.speak(u);
  };

  return (
    <div className={cn("rounded-[var(--radius-input)] bg-[var(--surface-sunken)] p-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={play}
          aria-pressed={speaking}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--text)] shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-[var(--surface-hover)]"
        >
          {speaking ? <Square size={13} aria-hidden /> : <Volume2 size={15} aria-hidden />}
          <span className="hi">{speaking ? "रोकें" : "सुनें"}</span>
          <span className="text-[var(--text-subtle)]">· {speaking ? "Stop" : "Listen"}</span>
        </button>
        {!showText ? (
          <button type="button" onClick={() => setShowText(true)} className="text-[12px] text-[var(--text-muted)] underline-offset-2 hover:underline">
            Show the script
          </button>
        ) : null}
      </div>
      {showText ? (
        <p lang="hi" className="hi mt-2.5 text-[14px] leading-relaxed text-[var(--text)]">
          {script}
        </p>
      ) : null}
      {showText && !supported ? (
        <p className="mt-1 text-[11.5px] text-[var(--text-subtle)]">This browser has no speech voice installed, so the script is shown instead.</p>
      ) : null}
    </div>
  );
}
