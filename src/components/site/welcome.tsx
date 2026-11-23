"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, AlertTriangle, Check, Phone } from "lucide-react";
import { GREETINGS, LANGUAGES, languageByCode } from "@/lib/languages";
import { STRUGGLES } from "@/lib/struggles";
import { checkName } from "@/lib/name-guard";
import {
  clearProfile,
  getProfile,
  markWelcomeSkipped,
  saveProfile,
  welcomeWasSkipped,
  WELCOME_OPEN_EVENT,
} from "@/lib/profile";
import { SPLASH_DONE_EVENT, splashIsDone } from "@/lib/splash";
import { EASE } from "@/lib/motion";
import { CRISIS_LINE, CRISIS_TEL_HREF } from "@/lib/numbers";
import { useToast } from "@/hooks/use-toast";

/**
 * The welcome flow: three quiet questions between the splash and the hero.
 *
 * 1. Language — one of South Africa's eleven official languages, so the
 *    hero opens with that language's greeting ("Sawubona, Thandi").
 * 2. A name — compulsory and checked for appropriateness (see
 *    src/lib/name-guard.ts); surname and nickname optional.
 * 3. What the visitor is going through — a dignified multi-select that
 *    stays on the device and is never rendered on screen.
 *
 * Crisis-first rules the flow must never break:
 * - "Skip for now" and Escape always work, and the crisis line is
 *   pinned on every step, so onboarding can never trap someone in danger.
 * - The overlay only opens after the splash lifts, and only when no
 *   profile exists and none was skipped before.
 */
const STEPS = 3;
const inputClass =
  "mt-1.5 min-h-12 w-full rounded-xl border-2 border-taupe bg-ink/70 px-4 text-base font-semibold text-foreground transition-colors placeholder:font-medium placeholder:text-faint focus:border-brand focus:outline-none";

export function Welcome() {
  const { toast } = useToast();
  const reduce = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  // True when the flow opened over an existing profile (footer
  // "Personalise your greeting"): the header then offers the one action
  // a personal-data flow must always provide — deletion.
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [lang, setLang] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [nickname, setNickname] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const openFlow = useCallback(() => {
    const p = getProfile();
    if (p) {
      setLang(p.lang);
      setName(p.name);
      setSurname(p.surname);
      setNickname(p.nickname);
      setPicked(p.struggles);
    } else {
      setLang(null);
      setName("");
      setSurname("");
      setNickname("");
      setPicked([]);
    }
    setDir(1);
    setStep(0);
    setEditing(!!p);
    setConfirmRemove(false);
    setOpen(true);
  }, []);

  useEffect(() => {
    // First visit of a browser without a profile: open shortly after the
    // splash curtain lifts, a beat before the hero finishes landing.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onSplashDone = () => {
      timer = setTimeout(() => {
        if (!getProfile() && !welcomeWasSkipped()) openFlow();
      }, 500);
    };
    const onReopen = () => openFlow();
    window.addEventListener(SPLASH_DONE_EVENT, onSplashDone);
    window.addEventListener(WELCOME_OPEN_EVENT, onReopen);
    // Belt and braces: if the splash finished before this component
    // hydrated, the event is already gone, so check the module flag.
    if (splashIsDone()) {
      timer = setTimeout(() => {
        if (!getProfile() && !welcomeWasSkipped()) openFlow();
      }, 400);
    }
    return () => {
      window.removeEventListener(SPLASH_DONE_EVENT, onSplashDone);
      window.removeEventListener(WELCOME_OPEN_EVENT, onReopen);
      if (timer) clearTimeout(timer);
    };
  }, [openFlow]);

  // Scroll lock while the flow is up, released on close, exactly like the
  // splash does it.
  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = "hidden";
    dialogRef.current?.focus({ preventScroll: true });
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const skip = useCallback(() => {
    markWelcomeSkipped();
    setOpen(false);
  }, []);

  // Deletion is destructive, so it needs two deliberate taps: the first
  // arms the button, the second wipes. Four seconds alone disarms it, and
  // closing the flow always disarms it.
  useEffect(() => {
    if (!confirmRemove) return;
    const timer = setTimeout(() => setConfirmRemove(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmRemove]);

  const removeGreeting = useCallback(() => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    clearProfile();
    markWelcomeSkipped();
    setOpen(false);
    toast({
      title: "Greeting removed.",
      description:
        "The language, names and struggles were deleted from this device. There was never a copy anywhere else.",
    });
  }, [confirmRemove, toast]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmRemove) setConfirmRemove(false);
        skip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, skip, confirmRemove]);

  // Focus the step heading whenever the panel changes so keyboard and
  // screen-reader users always know where they are.
  useEffect(() => {
    if (open) headingRef.current?.focus({ preventScroll: true });
  }, [step, open]);

  const nameCheck = checkName(name, true);
  const surnameCheck = checkName(surname, false);
  const nicknameCheck = checkName(nickname, false);
  const namesValid =
    nameCheck.ok && surnameCheck.ok && nicknameCheck.ok && name.trim().length > 0;

  const goTo = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const toggleStruggle = (id: string) => {
    setPicked((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  };

  const finish = () => {
    if (!lang) return;
    const tidy = (s: string) => s.trim().replace(/\s+/g, " ");
    saveProfile({
      lang,
      name: tidy(name),
      surname: tidy(surname),
      nickname: tidy(nickname),
      struggles: picked,
    });
    setOpen(false);
    const who = tidy(nickname) || tidy(name);
    toast({
      title: `${GREETINGS[lang] ?? "Welcome"}, ${who}.`,
      description:
        "Your greeting is set. Change it any time with \u201cPersonalise your greeting\u201d at the bottom of the page.",
    });
  };

  const panelMotion = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: dir * 28 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: dir * -28 },
        transition: { duration: 0.35, ease: EASE },
      };

  const stepHeading = (text: string) => (
    <h2
      ref={headingRef}
      tabIndex={-1}
      className="text-balance font-display text-3xl font-black leading-[1.08] tracking-tight text-foreground focus:outline-none sm:text-4xl"
    >
      {text}
    </h2>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="fast-welcome"
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Welcome to Fast"
          className="fixed inset-0 z-[190] flex flex-col overflow-y-auto bg-ink px-5 py-6 focus:outline-none sm:px-8 sm:py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          {/* The splash's own texture, so the two screens read as one
              continuous launch sequence rather than a page change. */}
          <div
            aria-hidden="true"
            className="bg-fade-y pointer-events-none absolute inset-0 bg-grid opacity-30"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/3 h-[26rem] w-[40rem] -translate-x-1/2 rounded-full bg-brand/[0.08] blur-[130px]"
          />

          <div className="relative mx-auto flex w-full max-w-xl flex-1 flex-col">
            {/* Header: a way out is always visible, so the flow can never
                trap anyone. A fresh visitor gets "skip"; a returning one
                editing their greeting instead gets the deletion path. */}
            <div className="flex items-center justify-between gap-4">
              <p className="inline-flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-dim">
                <span className="h-px w-3.5 bg-brand" aria-hidden="true" />
                Welcome to Fast
              </p>
              {editing ? (
                <button
                  type="button"
                  onClick={removeGreeting}
                  className={`rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${
                    confirmRemove
                      ? "bg-brand/15 text-brand"
                      : "text-faint hover:text-brand"
                  }`}
                >
                  {confirmRemove ? "Tap again to remove" : "Remove my greeting"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={skip}
                  className="rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-faint transition-colors hover:text-brand"
                >
                  Skip for now
                </button>
              )}
            </div>

            <div
              className="mt-3 flex items-center gap-2"
              role="status"
              aria-label={`Step ${step + 1} of ${STEPS}`}
            >
              {Array.from({ length: STEPS }, (_, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? "w-6 bg-brand" : "w-1.5 bg-taupe"
                  }`}
                />
              ))}
              <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.18em] text-faint">
                Step {step + 1} of {STEPS}
              </span>
            </div>

            <div className="flex flex-1 flex-col justify-center py-8">
              <AnimatePresence mode="wait" initial={false}>
                {step === 0 && (
                  <motion.div key="step-lang" {...panelMotion}>
                    {stepHeading("How should Fast greet you?")}
                    <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-body sm:text-base">
                      Pick one of South Africa&apos;s eleven official
                      languages. Every visit will open with this greeting,
                      and you can change it whenever you like.
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {LANGUAGES.map((l) => {
                        const selected = lang === l.code;
                        return (
                          <button
                            key={l.code}
                            type="button"
                            onClick={() => setLang(l.code)}
                            aria-pressed={selected}
                            className={`flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl border-2 px-3 py-3 transition-all duration-200 ${
                              selected
                                ? "border-brand bg-brand/15 text-brand"
                                : "border-taupe/70 bg-taupe/10 text-foreground hover:border-brand/70"
                            }`}
                          >
                            <span className="font-display text-lg font-black tracking-tight">
                              {l.greeting}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-dim">
                              {l.native}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-medium text-faint" aria-live="polite">
                        {lang
                          ? `${GREETINGS[lang]} — ${languageByCode(lang).native}${
                              languageByCode(lang).note
                                ? `, ${languageByCode(lang).note}`
                                : ""
                            }.`
                          : "Choose how Fast should greet you."}
                      </p>
                      <button
                        type="button"
                        onClick={() => goTo(1)}
                        disabled={!lang}
                        className="lift inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-7 text-sm font-bold tracking-tight text-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Continue
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div key="step-name" {...panelMotion}>
                    {stepHeading("And what should we call you?")}
                    <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-body sm:text-base">
                      Everything you type stays on this device. Fast has no
                      accounts and nothing is sent anywhere. If this phone is
                      shared, a nickname alone is enough.
                    </p>

                    <div className="mt-6 flex flex-col gap-4">
                      <label className="block">
                        <span className="flex items-baseline justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-dim">
                          Name
                          <span className="text-brand">compulsory</span>
                        </span>
                        <span className="relative block">
                          <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={inputClass}
                            placeholder="The name Fast greets you with"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            maxLength={40}
                            aria-required="true"
                            aria-invalid={!nameCheck.ok && name.length > 0}
                            autoFocus
                          />
                          {nameCheck.ok && name.trim().length >= 2 && (
                            <Check
                              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand"
                              aria-hidden="true"
                            />
                          )}
                        </span>
                        {!nameCheck.ok && name.length > 0 && (
                          <span
                            className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-brand"
                            role="alert"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                            {nameCheck.reason}
                          </span>
                        )}
                      </label>

                      <label className="block">
                        <span className="flex items-baseline justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-dim">
                          Surname
                          <span>optional</span>
                        </span>
                        <input
                          value={surname}
                          onChange={(e) => setSurname(e.target.value)}
                          className={inputClass}
                          placeholder="Only if you want to"
                          autoComplete="off"
                          spellCheck={false}
                          maxLength={40}
                          aria-invalid={!surnameCheck.ok && surname.length > 0}
                        />
                        {!surnameCheck.ok && surname.length > 0 && (
                          <span
                            className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-brand"
                            role="alert"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                            {surnameCheck.reason}
                          </span>
                        )}
                      </label>

                      <label className="block">
                        <span className="flex items-baseline justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-dim">
                          Nickname
                          <span>optional</span>
                        </span>
                        <input
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          className={inputClass}
                          placeholder="What Fast will call you"
                          autoComplete="off"
                          spellCheck={false}
                          maxLength={40}
                          aria-invalid={!nicknameCheck.ok && nickname.length > 0}
                        />
                        {!nicknameCheck.ok && nickname.length > 0 && (
                          <span
                            className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-brand"
                            role="alert"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                            {nicknameCheck.reason}
                          </span>
                        )}
                      </label>
                    </div>

                    <div className="mt-7 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => goTo(0)}
                        className="inline-flex min-h-12 items-center gap-2 rounded-2xl px-3 text-sm font-bold tracking-tight text-body transition-colors hover:text-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => goTo(2)}
                        disabled={!namesValid}
                        className="lift inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-7 text-sm font-bold tracking-tight text-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Continue
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="step-struggles" {...panelMotion}>
                    {stepHeading("What is going on for you right now?")}
                    <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-body sm:text-base">
                      Pick anything that fits — there are no wrong answers,
                      and picking none is fine too. This helps Fast
                      understand what you might need, and it stays on this
                      device. It is never shown on the screen.
                    </p>

                    <div
                      className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2"
                      role="group"
                      aria-label="What you are going through"
                    >
                      {STRUGGLES.map((s) => {
                        const selected = picked.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            role="checkbox"
                            aria-checked={selected}
                            onClick={() => toggleStruggle(s.id)}
                            className={`flex min-h-12 items-center gap-3 rounded-xl border-2 px-4 py-2.5 text-left transition-all duration-200 ${
                              selected
                                ? "border-brand bg-brand/15 text-foreground"
                                : "border-taupe/70 bg-taupe/10 text-body hover:border-brand/70 hover:text-foreground"
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                                selected
                                  ? "border-brand bg-brand text-ink"
                                  : "border-taupe"
                              }`}
                            >
                              {selected && (
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                              )}
                            </span>
                            <span className="text-sm font-semibold leading-snug">
                              {s.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-7 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => goTo(1)}
                        className="inline-flex min-h-12 items-center gap-2 rounded-2xl px-3 text-sm font-bold tracking-tight text-body transition-colors hover:text-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={finish}
                        className="lift inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-7 text-sm font-bold tracking-tight text-ink"
                      >
                        Enter Fast
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Pinned on every step: the flow never stands between someone
                in danger and the crisis line. */}
            <a
              href={CRISIS_TEL_HREF}
              className="relative mx-auto mb-1 inline-flex items-center gap-2 rounded-xl border border-taupe/60 bg-taupe/10 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-dim transition-colors hover:border-brand hover:text-brand"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              In danger now? Call {CRISIS_LINE.display}
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
