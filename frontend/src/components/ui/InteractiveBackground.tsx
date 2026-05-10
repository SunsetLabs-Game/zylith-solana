import { memo, useEffect, useMemo, useState } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";

export const InteractiveBackground = memo(function InteractiveBackground() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { damping: 50, stiffness: 400 });
  const smoothY = useSpring(mouseY, { damping: 50, stiffness: 400 });
  const prefersReducedMotion = useReducedMotion();
  const [enablePointerTracking, setEnablePointerTracking] = useState(false);

  // Solana Pulse Glow
  const bgGlow = useMotionTemplate`
    radial-gradient(
      800px circle at ${smoothX}px ${smoothY}px,
      rgba(20, 241, 149, 0.08),
      rgba(153, 69, 255, 0.05) 50%,
      transparent 80%
    )
  `;

  const maskGlow = useMotionTemplate`
    radial-gradient(
      300px circle at ${smoothX}px ${smoothY}px,
      black,
      transparent 80%
    )
  `;

  useEffect(() => {
    if (typeof window === "undefined" || prefersReducedMotion) {
      setEnablePointerTracking(false);
      return;
    }

    const mediaQuery = window.matchMedia("(pointer: fine)");
    const updateMode = () => setEnablePointerTracking(mediaQuery.matches);

    updateMode();
    mediaQuery.addEventListener("change", updateMode);
    return () => mediaQuery.removeEventListener("change", updateMode);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!enablePointerTracking) return;

    let rafId = 0;
    const handleMouseMove = ({ clientX, clientY }: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        mouseX.set(clientX);
        mouseY.set(clientY);
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [enablePointerTracking, mouseX, mouseY]);

  const ambientClassName = useMemo(
    () =>
      prefersReducedMotion
        ? "absolute inset-0 opacity-20 overflow-hidden"
        : "absolute inset-0 opacity-40 mix-blend-plus-lighter overflow-hidden",
    [prefersReducedMotion],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background">
      {/* Dynamic Ambient Orbs */}
      <div className={ambientClassName}>
        <motion.div
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  x: [0, 150, -150, 0],
                  y: [0, -100, 100, 0],
                  scale: [1, 1.3, 0.7, 1],
                }
          }
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[10%] -left-[10%] h-[70vh] w-[70vw] rounded-full bg-solana-green/20 blur-[120px]"
        />
        <motion.div
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  x: [0, -200, 200, 0],
                  y: [0, 150, -150, 0],
                  scale: [1, 0.8, 1.2, 1],
                }
          }
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute top-[30%] left-[50%] h-[80vh] w-[60vw] rounded-full bg-solana-purple/20 blur-[150px]"
        />
      </div>

      {/* Persistent Grid System */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />

      {enablePointerTracking && !prefersReducedMotion && (
        <>
          {/* Mouse Following Glow */}
          <motion.div className="absolute inset-0 z-10" style={{ background: bgGlow }} />

          {/* Highlighted Grid at Mouse Position */}
          <motion.div
            className="absolute inset-0 z-10"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(20, 241, 149, 0.15) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(20, 241, 149, 0.15) 1px, transparent 1px)
              `,
              backgroundSize: "64px 64px",
              WebkitMaskImage: maskGlow,
              maskImage: maskGlow,
            }}
          />
        </>
      )}

      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay noise-bg" />
      
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
    </div>
  );
});
