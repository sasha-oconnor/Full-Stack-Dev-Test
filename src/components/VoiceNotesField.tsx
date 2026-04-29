"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff } from "lucide-react";

interface VoiceNotesFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Minimal Web Speech API typings (the lib doesn't ship them)
interface MinimalSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((this: MinimalSpeechRecognition, ev: SpeechEventLike) => void) | null;
  onerror: ((this: MinimalSpeechRecognition, ev: Event) => void) | null;
  onend: ((this: MinimalSpeechRecognition, ev: Event) => void) | null;
}

interface SpeechEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

type SpeechRecognitionCtor = new () => MinimalSpeechRecognition;

const PUNCT_MAP: Array<[RegExp, string]> = [
  [/\s*(period)\s*/gi,                   ". "],
  [/\s*(comma)\s*/gi,                              ", "],
  [/\s*(question mark)\s*/gi,                      "? "],
  [/\s*(exclamation mark|exclamation point)\s*/gi, "! "],
  [/\s*(colon)\s*/gi,                              ": "],
  [/\s*(semicolon)\s*/gi,                          "; "],
  [/\s*(dash|hyphen)\s*/gi,                        " - "],
  [/\s*(ellipsis|dot dot dot)\s*/gi,               "... "],
  [/\s*(new line|newline|new paragraph)\s*/gi,     "\n"],
  [/\s*(open paren(?:thesis)?)\s*/gi,              " ("],
  [/\s*(close paren(?:thesis)?)\s*/gi,             ") "],
  [/\s*(open quote)\s*/gi,                         ' "'],
  [/\s*(close quote)\s*/gi,                        '" '],
];

function normalizePunctuation(text: string): string {
  let out = text;
  for (const [re, sub] of PUNCT_MAP) out = out.replace(re, sub);
  out = out.replace(/[ \t]+/g, " ");
  // Ensure a space AFTER all closing punctuation when followed directly by a non-space.
  // ' is intentionally excluded so contractions like don't / didn't are never broken.
  out = out.replace(/([.!?,;:)"])([^\s\n])/g, "$1 $2");
  // Ensure space before a native open double-quote that immediately follows a word character.
  // Handles the case where the speech engine outputs " directly instead of saying "open quote".
  out = out.replace(/(\w)("(?=\w))/g, "$1 $2");
  // Remove any space that appears BEFORE standard hugging punctuation.
  out = out.replace(/\s+([.!?,;:)'])/g, "$1");
  // Remove space before a closing double-quote (identified as " NOT followed by a word char).
  // Open double-quote keeps its preceding space because it IS followed by a word char.
  out = out.replace(/\s+("(?!\w))/g, "$1");
  return out.trim();
}

function applyCapitalization(text: string): string {
  return text
    .replace(/^([a-z])/, (c) => c.toUpperCase())
    .replace(/([.!?][ \t]+)([a-z])/g, (_, p, c) => p + c.toUpperCase());
}

function finalizeDictationText(text: string): string {
  // Normalize spacing/punctuation first, then apply sentence capitalization.
  return applyCapitalization(normalizePunctuation(text));
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (
    (w.SpeechRecognition as SpeechRecognitionCtor | undefined) ??
    (w.webkitSpeechRecognition as SpeechRecognitionCtor | undefined) ??
    null
  );
}

export function VoiceNotesField({
  value,
  onChange,
  placeholder,
}: VoiceNotesFieldProps) {
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const shouldContinueRef = useRef(false);
  // Finalized text accumulated across sessions.
  const committedTextRef = useRef("");
  // Last interim seen — shared ref so onend can carry it into the restart base.
  const lastInterimRef = useRef("");

  // Two-layer display state rendered while recording.
  // Updating these is cheap (no parent re-render) so we do it on every onresult.
  const [displayCommitted, setDisplayCommitted] = useState("");
  const [displayInterim, setDisplayInterim] = useState("");

  useEffect(() => {
    setRecognitionSupported(!!getSpeechRecognitionCtor());
    return () => {
      shouldContinueRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  function startSession(baseText: string) {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    const sessionBase = baseText.trim();
    let sessionFinal = "";
    let lastInterim = "";

    rec.onresult = (event: SpeechEventLike) => {
      let hasNewFinal = false;

      // Accumulate newly finalized results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          hasNewFinal = true;
          const chunk = normalizePunctuation(r[0].transcript);
          if (chunk) {
            if (sessionFinal && !sessionFinal.endsWith(" ")) sessionFinal += " ";
            sessionFinal += chunk;
          }
          lastInterim = "";
          const assembled = [sessionBase, sessionFinal]
            .map((s) => s.trim())
            .filter(Boolean)
            .join(" ");
          committedTextRef.current = finalizeDictationText(assembled);
        }
      }

      // Find the latest interim (last non-final result)
      lastInterim = "";
      for (let i = event.results.length - 1; i >= 0; i--) {
        if (!event.results[i].isFinal) {
          lastInterim = event.results[i][0].transcript;
          break;
        }
      }

      lastInterimRef.current = lastInterim;

      // Update the two display layers immediately — no throttle needed here
      // because these only update local state, not the parent component.
      setDisplayCommitted(committedTextRef.current);
      setDisplayInterim(applyCapitalization(normalizePunctuation(lastInterim)));

      // Only sync parent when finals arrive so the parent isn't thrashed on
      // every interim keystroke.
      if (hasNewFinal) {
        onChange(committedTextRef.current);
      }
    };

    rec.onerror = () => {
      shouldContinueRef.current = false;
      const full = [committedTextRef.current, lastInterimRef.current]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" ");
      if (full) onChange(finalizeDictationText(full));
      setDisplayInterim("");
      setRecording(false);
    };

    rec.onend = () => {
      if (shouldContinueRef.current) {
        // Carry interim into the restart base so nothing disappears on pause.
        const nextBase = [committedTextRef.current, lastInterimRef.current]
          .map((s) => s.trim())
          .filter(Boolean)
          .join(" ");
        const nextBaseFinal = finalizeDictationText(nextBase);
        committedTextRef.current = nextBaseFinal;
        lastInterimRef.current = "";
        setDisplayCommitted(nextBaseFinal);
        setDisplayInterim("");
        startSession(nextBaseFinal);
        return;
      }
      setDisplayInterim("");
      setRecording(false);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      shouldContinueRef.current = false;
      setRecording(false);
    }
  }

  function handleStartDictation() {
    const base = value.trim();
    const startText = finalizeDictationText(base);
    committedTextRef.current = startText;
    lastInterimRef.current = "";
    setDisplayCommitted(startText);
    setDisplayInterim("");
    shouldContinueRef.current = true;
    setRecording(true);
    startSession(startText);
  }

  function handleStopDictation() {
    shouldContinueRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    // Commit everything including any last interim to parent.
    const full = [committedTextRef.current, lastInterimRef.current]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");
    if (full) onChange(finalizeDictationText(full));
    else onChange(finalizeDictationText(value));
    setDisplayInterim("");
    setRecording(false);
  }

  function toggleDictation() {
    if (!recognitionSupported) return;
    if (recording) handleStopDictation();
    else handleStartDictation();
  }

  const micTitle = !recognitionSupported
    ? "Voice dictation not supported in this browser"
    : recording
      ? "Stop dictation"
      : "Start dictation";

  return (
    <div className="space-y-2">
      <div className="relative">
        {recording ? (
          /*
           * Two-layer dictation display.
           * Committed text = solid/normal — words the engine has confirmed.
           * Interim text   = muted italic — what's being recognized right now.
           * Styled to match the textarea so the swap is seamless.
           */
          <div
            className="min-h-[180px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base md:text-sm overflow-auto whitespace-pre-wrap wrap-break-word pr-14 pb-12"
            aria-live="polite"
            aria-label="Dictation in progress"
          >
            {displayCommitted || displayInterim ? (
              <>
                {displayCommitted && <span>{displayCommitted}</span>}
                {displayInterim && (
                  <span className="text-muted-foreground/60">
                    {displayCommitted ? " " : ""}
                    {displayInterim}
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground/50">{placeholder}</span>
            )}
          </div>
        ) : (
          <Textarea
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[180px] text-base resize-none pr-14 pb-12"
          />
        )}

        <button
          type="button"
          onClick={toggleDictation}
          disabled={!recognitionSupported}
          aria-label={micTitle}
          aria-pressed={recording}
          title={micTitle}
          className={`absolute bottom-2 right-2 h-10 w-10 rounded-full flex items-center justify-center transition-colors shadow-sm border
            ${
              !recognitionSupported
                ? "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-60"
                : recording
                  ? "bg-red-500 text-white border-red-500 hover:bg-red-600"
                  : "bg-background text-foreground border-border hover:bg-accent"
            }`}
        >
          {recording ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
          {recording && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
          )}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        {recording
          ? "Listening… speak naturally, then tap the mic again to stop."
          : recognitionSupported
            ? "Tap the mic to dictate."
            : "Voice dictation isn't supported in this browser."}
      </p>
    </div>
  );
}
