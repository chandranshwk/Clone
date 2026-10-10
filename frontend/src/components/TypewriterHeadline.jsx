import { useEffect, useState } from "react";

const HERO_HEADLINE_PREFIX = "Good teaching changes the way ";
const HERO_HEADLINE_SUFFIX = "you see it.";
const HERO_HEADLINE = `${HERO_HEADLINE_PREFIX}${HERO_HEADLINE_SUFFIX}`;

export function TypewriterHeadline() {
  const reducedMotionInitially = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const [visibleCharacters, setVisibleCharacters] = useState(
    reducedMotionInitially ? HERO_HEADLINE.length : 0,
  );
  const [animationComplete, setAnimationComplete] = useState(
    reducedMotionInitially,
  );

  useEffect(() => {
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let timeoutId;
    let runId = 0;
    let animationStarted = false;

    function startAnimation() {
      if (animationStarted) return;
      animationStarted = true;
      window.clearTimeout(timeoutId);
      const activeRun = ++runId;

      if (motionPreference.matches) {
        setVisibleCharacters(HERO_HEADLINE.length);
        setAnimationComplete(true);
        return;
      }

      let position = 0;
      setVisibleCharacters(0);
      setAnimationComplete(false);

      function typeNextCharacter() {
        if (activeRun !== runId) return;
        position += 1;
        setVisibleCharacters(position);
        if (position === HERO_HEADLINE.length) {
          setAnimationComplete(true);
          return;
        }
        timeoutId = window.setTimeout(typeNextCharacter, 200);
      }

      timeoutId = window.setTimeout(typeNextCharacter, 350);
    }

    function completeForReducedMotion() {
      if (!motionPreference.matches) return;
      window.clearTimeout(timeoutId);
      runId += 1;
      animationStarted = true;
      setVisibleCharacters(HERO_HEADLINE.length);
      setAnimationComplete(true);
    }

    startAnimation();
    motionPreference.addEventListener("change", completeForReducedMotion);

    return () => {
      runId += 1;
      window.clearTimeout(timeoutId);
      motionPreference.removeEventListener("change", completeForReducedMotion);
    };
  }, []);

  const prefix = HERO_HEADLINE_PREFIX.slice(
    0,
    Math.min(visibleCharacters, HERO_HEADLINE_PREFIX.length),
  );
  const suffix = HERO_HEADLINE_SUFFIX.slice(
    0,
    Math.max(0, visibleCharacters - HERO_HEADLINE_PREFIX.length),
  );

  return (
    <h1 className="typewriter-heading" aria-label={HERO_HEADLINE}>
      <span className="typewriter-measure" aria-hidden="true">
        {HERO_HEADLINE_PREFIX}
        <em>{HERO_HEADLINE_SUFFIX}</em>
        <span className="typewriter-cursor" />
      </span>
      <span className="typewriter-rendered" aria-hidden="true">
        {prefix}
        <em>{suffix}</em>
        {!animationComplete ? <span className="typewriter-cursor" /> : null}
      </span>
    </h1>
  );
}
