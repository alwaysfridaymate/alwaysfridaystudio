"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";

/* ═══════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════ */

/** Intersection-observer fade-in + subtle text parallax */
function useFadeIn<T extends HTMLElement>(
  threshold = 0.15,
  rootMargin = "0px 0px -60px 0px",
  parallaxSpeed = 0
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in-view");
          io.unobserve(el);
        }
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (!parallaxSpeed) return;
    const el = ref.current;
    if (!el) return;
    let rafId: number;
    let active = false;

    const onScroll = () => {
      if (!active) {
        if (!el.classList.contains("in-view")) return;
        active = true;
        setTimeout(() => {
          el.style.transition = "none";
        }, 950);
      }
      rafId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const centre = rect.top + rect.height / 2;
        const offset = (centre - window.innerHeight / 2) * parallaxSpeed;
        el.style.transform = `translateY(${offset}px)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [parallaxSpeed]);

  return ref;
}

/** Parallax: returns a translateY value driven by scroll position */
function useParallax(speed = 0.08) {
  const ref = useRef<HTMLDivElement>(null);
  const [y, setY] = useState(0);

  const handleScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centre = rect.top + rect.height / 2;
    const viewH = window.innerHeight;
    const offset = (centre - viewH / 2) * speed;
    setY(offset);
  }, [speed]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return { ref, y };
}

/* ═══════════════════════════════════════════
   GRID LINES — section-aware, smooth transitions
   Desktop: 2 lines (3-col) or 3 lines (4-col) depending on section
   Mobile: 1 line at 50%
   ═══════════════════════════════════════════ */
function GridLines() {
  const [hue, setHue] = useState(310);
  const [targetGrid, setTargetGrid] = useState<"3" | "4">("3");
  const [lineOpacities, setLineOpacities] = useState([1, 1, 0]); // 3 lines, 3rd starts hidden
  const [linePositions, setLinePositions] = useState([33.333, 66.666, 50]); // 3rd at center initially
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    let raf: number;
    let prev = performance.now();
    const SPEED = 4;
    const tick = (now: number) => {
      const dt = (now - prev) / 1000;
      prev = now;
      setHue((h) => (h + SPEED * dt) % 360);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* Watch which section is in viewport and update target grid */
  useEffect(() => {
    const updateLines = () => {
      const sections = document.querySelectorAll("[data-grid]");
      const vh = window.innerHeight;
      let activeGrid: "3" | "4" = "3";

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top < vh * 0.5 && rect.bottom > vh * 0.5) {
          activeGrid = (section.getAttribute("data-grid") || "3") as "3" | "4";
        }
      });

      setTargetGrid(activeGrid);
    };

    window.addEventListener("scroll", updateLines, { passive: true });
    updateLines();
    return () => window.removeEventListener("scroll", updateLines);
  }, []);

  /* Animate transitions between 2-line and 3-line states */
  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const duration = 600; // ms
    const start = performance.now();
    const startPositions = [...linePositions];
    const startOpacities = [...lineOpacities];

    // Target states
    const endPositions = targetGrid === "4" ? [25, 50, 75] : [33.333, 66.666, 50];
    const endOpacities = targetGrid === "4" ? [1, 1, 1] : [1, 1, 0];

    const ease = (t: number) => {
      // cubic-bezier(0.25, 0.1, 0.25, 1) approximation
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = ease(t);

      const newPositions = startPositions.map((sp, i) => sp + (endPositions[i] - sp) * eased);
      const newOpacities = startOpacities.map((so, i) => so + (endOpacities[i] - so) * eased);

      setLinePositions(newPositions);
      setLineOpacities(newOpacities);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetGrid]);

  const color = `hsl(${hue}, 70%, 25%)`;

  return (
    <>
      {/* Desktop: 2 or 3 lines */}
      <div
        className="hidden md:block fixed inset-0 z-[1] pointer-events-none"
        aria-hidden="true"
      >
        <div className="relative h-full w-full">
          {linePositions.map((pos, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px"
              style={{
                left: `${pos}%`,
                backgroundColor: color,
                opacity: lineOpacities[i],
              }}
            />
          ))}
        </div>
      </div>
      {/* Mobile: 1 line at 50% */}
      <div
        className="md:hidden fixed inset-0 z-[1] pointer-events-none"
        aria-hidden="true"
      >
        <div className="relative h-full w-full">
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{ left: "50%", backgroundColor: color }}
          />
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   CUSTOM CURSOR
   ═══════════════════════════════════════════ */
const CURSOR_BASE = 20;
const CURSOR_HOVER = 48;

function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const sizeRef = useRef(CURSOR_BASE);
  const targetSizeRef = useRef(CURSOR_BASE);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const isTouchDevice =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    if (isTouchDevice) return;

    const el = cursorRef.current;
    if (!el) return;

    // Animation loop for smooth size interpolation
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      const currentSize = sizeRef.current;
      const targetSize = targetSizeRef.current;

      if (Math.abs(currentSize - targetSize) > 0.5) {
        sizeRef.current = lerp(currentSize, targetSize, 0.15);
      } else {
        sizeRef.current = targetSize;
      }

      const s = sizeRef.current;
      el.style.width = `${s}px`;
      el.style.height = `${s}px`;
      el.style.transform = `translate(${posRef.current.x - s / 2}px, ${posRef.current.y - s / 2}px)`;

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const move = (e: MouseEvent) => {
      posRef.current.x = e.clientX;
      posRef.current.y = e.clientY;
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("a, button, [role=button], input, textarea")) {
        targetSizeRef.current = CURSOR_HOVER;
      }
    };

    const onOut = (e: MouseEvent) => {
      const target = e.relatedTarget as HTMLElement | null;
      if (!target || !target.closest?.("a, button, [role=button], input, textarea")) {
        targetSizeRef.current = CURSOR_BASE;
      }
    };

    window.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseout", onOut, { passive: true });

    return () => {
      window.removeEventListener("mousemove", move);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 z-[9999] pointer-events-none mix-blend-difference hidden md:block"
      style={{
        width: CURSOR_BASE,
        height: CURSOR_BASE,
        borderRadius: "50%",
        backgroundColor: "#ffffff",
        willChange: "transform, width, height",
      }}
      aria-hidden="true"
    />
  );
}

/* ═══════════════════════════════════════════
   PARALLAX IMAGE WRAPPER
   ═══════════════════════════════════════════ */
function ParallaxImage({
  src,
  alt,
  aspect = "4/3",
  sizes,
  speed = 0.08,
  className = "",
  grayscale = true,
}: {
  src: string;
  alt: string;
  aspect?: string;
  sizes: string;
  speed?: number;
  className?: string;
  grayscale?: boolean;
}) {
  const { ref, y } = useParallax(speed);
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={{ aspectRatio: aspect }}>
      <div
        className="absolute inset-[-15%] will-change-transform"
        style={{ transform: `translateY(${y}px)` }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className={`object-cover ${grayscale ? "grayscale" : ""}`}
          sizes={sizes}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PARALLAX BLOCK
   ═══════════════════════════════════════════ */
function ParallaxBlock({
  children,
  speed = 0.05,
  className = "",
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const { ref, y } = useParallax(speed);
  return (
    <div
      ref={ref}
      className={`will-change-transform ${className}`}
      style={{ transform: `translateY(${y}px)` }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SVG PARALLAX
   ═══════════════════════════════════════════ */
function ParallaxSvg({
  children,
  speed = -0.06,
  className = "",
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const { ref, y } = useParallax(speed);
  return (
    <div
      ref={ref}
      className={`will-change-transform overflow-hidden ${className}`}
      style={{ transform: `translateY(${y}px)` }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SECTION SVG — normalized height
   Desktop: natural size (full width). Mobile: 86px height.
   ═══════════════════════════════════════════ */
function SectionSvg({
  src,
  speed = -0.06,
  blend = true,
}: {
  src: string;
  speed?: number;
  blend?: boolean;
}) {
  return (
    <ParallaxSvg speed={speed}>
      <div className={`w-full overflow-hidden ${blend ? "mix-blend-difference" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className="w-full h-auto hidden md:block"
          style={{ filter: "brightness(0) invert(1)" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className="md:hidden h-[86px] w-auto"
          style={{ filter: "brightness(0) invert(1)" }}
        />
      </div>
    </ParallaxSvg>
  );
}

/* ═══════════════════════════════════════════
   ACCORDION COMPONENT
   ═══════════════════════════════════════════ */
interface AccordionItemData {
  title: string;
  content: React.ReactNode;
}

function Accordion({
  items,
  className = "",
}: {
  items: AccordionItemData[];
  className?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={className}>
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className="border-b border-white/10">
            <button
              className="w-full flex items-center justify-between py-5 md:py-6 text-left"
              onClick={() => setOpenIndex(isOpen ? null : i)}
            >
              <span className="text-[16px] md:text-[18px] tracking-[0.15em] text-white uppercase font-normal">
                {item.title}
              </span>
              <span
                className="text-white/40 text-xl transition-transform duration-300"
                style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0)" }}
              >
                +
              </span>
            </button>
            <div
              className="overflow-hidden transition-all duration-400"
              style={{
                maxHeight: isOpen ? "500px" : "0",
                opacity: isOpen ? 1 : 0,
              }}
            >
              <div className="pb-6 text-sm md:text-base text-white/50 leading-relaxed">
                {item.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   IMAGE CAROUSEL — horizontal swipeable (mobile)
   ═══════════════════════════════════════════ */
function ImageCarousel({
  images,
  className = "",
}: {
  images: { src: string; alt: string; num: string; desc: string }[];
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto scrollbar-hide ${className}`}>
      <div className="flex gap-3" style={{ width: `${images.length * 70}vw` }}>
        {images.map((img, i) => (
          <div key={i} className="flex-shrink-0" style={{ width: "65vw" }}>
            <div className="relative overflow-hidden" style={{ aspectRatio: "3/2" }}>
              <Image
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover"
                sizes="65vw"
              />
            </div>
            <div className="flex items-baseline justify-between mt-2 px-1">
              <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">
                {img.num}
              </p>
              <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">
                {img.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── NAV ─── */
function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-[100] mix-blend-difference">
      <nav className="mx-auto flex items-center px-3 md:px-12 lg:px-16 h-16 md:h-20 max-w-[1920px]">
        <a
          href="#"
          className="text-sm md:text-base font-normal tracking-[0.2em] text-white uppercase shrink-0"
        >
          ALWAYSFRIDAY
        </a>
        {/* Desktop nav — evenly distributed between logo and CTA */}
        <div className="hidden md:flex items-center justify-evenly flex-1">
          <a href="#work" className="text-sm md:text-base font-normal tracking-[0.2em] text-white uppercase hover:text-white/70 transition-colors">
            Work
          </a>
          <a href="#approach" className="text-sm md:text-base font-normal tracking-[0.2em] text-white uppercase hover:text-white/70 transition-colors">
            Approach
          </a>
          <a href="#services" className="text-sm md:text-base font-normal tracking-[0.2em] text-white uppercase hover:text-white/70 transition-colors">
            Services
          </a>
        </div>
        <a
          href="#contact"
          className="hidden md:inline-flex items-center justify-center px-6 py-2 text-sm font-normal tracking-[0.15em] uppercase border border-white text-white rounded-full hover:bg-white/10 transition-colors shrink-0"
        >
          Meet Us
        </a>
        {/* Mobile menu */}
        <button className="md:hidden text-white ml-auto" aria-label="Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 8h18M3 16h18" />
          </svg>
        </button>
      </nav>
    </header>
  );
}

/* ─── HERO ─── */
function Hero() {
  const headRef = useFadeIn<HTMLDivElement>(0.2, "0px 0px -40px 0px", 0.05);
  const bodyRef = useFadeIn<HTMLDivElement>(0.15, "0px 0px -60px 0px", 0.04);

  return (
    <section data-grid="3" className="relative">
      {/* Hero image — full viewport */}
      <div className="relative min-h-screen flex flex-col overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/images/hero.jpg"
            alt="Concentric circles abstract background"
            fill
            className="object-cover object-center"
            priority
            quality={90}
          />
          {/* Fade gradient at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-[#1C1B1A] via-[#1C1B1A]/60 to-transparent" />
        </div>

        {/* STUDIO SVG overlay */}
        <ParallaxSvg speed={-0.04} className="absolute inset-0 flex items-center justify-center z-10 px-4 md:px-8 mix-blend-exclusion pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/studio.svg"
            alt=""
            aria-hidden="true"
            className="w-full h-auto max-h-[45vh] object-contain select-none hidden md:block"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/studio.svg"
            alt=""
            aria-hidden="true"
            className="md:hidden h-[86px] w-auto object-contain select-none"
          />
        </ParallaxSvg>

        {/* Hero CTA buttons — mid-hero */}
        <div className="relative z-20 mt-auto mb-auto px-3 w-full mix-blend-difference">
          {/* Mobile */}
          <div className="md:hidden flex gap-3 justify-center mt-[55vh]">
            <a
              href="#contact"
              className="inline-flex items-center justify-center px-6 py-3 text-[14px] tracking-[0.15em] uppercase font-normal border border-white text-white rounded-full hover:bg-white/10 transition-colors"
            >
              Let&apos;s Meet
            </a>
            <a
              href="#work"
              className="inline-flex items-center justify-center px-6 py-3 text-[14px] tracking-[0.15em] uppercase font-normal border border-white text-white rounded-full hover:bg-white/10 transition-colors"
            >
              Selected Work
            </a>
          </div>
          {/* Desktop */}
          <div className="hidden md:block">
            <div
              className="grid"
              style={{ gridTemplateColumns: "33.333% 33.333% 33.334%" }}
            >
              <div />
              <div style={{ paddingLeft: "12px" }} className="flex gap-4 mt-[50vh]">
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center px-8 py-3 text-xs tracking-[0.15em] uppercase font-normal border border-white text-white rounded-full hover:bg-white/10 transition-colors"
                >
                  Let&apos;s Meet
                </a>
                <a
                  href="#work"
                  className="inline-flex items-center justify-center px-8 py-3 text-xs tracking-[0.15em] uppercase font-normal border border-white text-white rounded-full hover:bg-white/10 transition-colors"
                >
                  Selected Work
                </a>
              </div>
              <div />
            </div>
          </div>
        </div>

        {/* Hero text content — over the gradient fade */}
        <div
          ref={headRef}
          className="fade-up relative z-20 px-3 w-full pb-12 md:pb-16 lg:pb-20 mix-blend-difference"
        >
          {/* Mobile */}
          <div className="md:hidden">
            <h1 className="text-[20px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase mb-4">
              Intersection of strategy, brand and digital&nbsp;products
            </h1>
          </div>
          {/* Desktop */}
          <div className="hidden md:block">
            <div
              className="grid"
              style={{ gridTemplateColumns: "33.333% 33.333% 33.334%" }}
            >
              <div className="col-span-3" style={{ paddingLeft: "12px" }}>
                <h2 className="text-[42px] lg:text-[52px] font-semibold leading-[1.15] tracking-tight text-white uppercase">
                  Intersection of strategy, brand and digital&nbsp;products
                </h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Below hero — body text */}
      <div className="px-3 py-24 md:py-32 lg:py-40">
        <div ref={bodyRef} className="fade-up">
          {/* Mobile body */}
          <div className="md:hidden">
            <p className="text-[16px] text-white/60 leading-relaxed mb-10">
              We help companies clarify who they are, how they communicate, and how their
              products work. We work with founders, leadership teams, and organisations
              navigating growth, change, or complexity. Sometimes the right move is a big
              change. Sometimes it is minor fix with huge impact.
            </p>
          </div>
          {/* Desktop body */}
          <div className="hidden md:block">
            <div
              className="grid"
              style={{ gridTemplateColumns: "33.333% 33.333% 33.334%" }}
            >
              <div />
              <div className="col-span-2" style={{ paddingLeft: "12px" }}>
                <p className="text-base text-white/60 leading-relaxed max-w-2xl">
                  We help companies clarify who they are, how they communicate, and how their
                  products work. We work with founders, leadership teams, and organisations
                  navigating growth, change, or complexity. Sometimes the right move is a big
                  change. Sometimes it is minor fix with huge impact.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── WORK ─── */
function Work() {
  const headRef = useFadeIn<HTMLDivElement>(0.15, "0px 0px -60px 0px", 0.06);
  const ctaRef = useFadeIn<HTMLDivElement>(0.15, "0px 0px -60px 0px", 0.04);

  const images = [
    { src: "/images/atlantik.jpg", alt: "Atlantik J&T Group brand identity", num: "01", desc: "Atlantik J&T Group" },
    { src: "/images/project2.jpg", alt: "Project 2", num: "02", desc: "Description" },
    { src: "/images/nasecesko.jpg", alt: "Naše Česko brand identity", num: "03", desc: "Naše Česko" },
  ];

  return (
    <section id="work" data-grid="3" className="relative py-24 md:py-32 lg:py-40">
      {/* WORK SVG */}
      <SectionSvg src="/images/work.svg" speed={-0.06} />

      {/* Desktop: 3-column staggered image gallery */}
      <div className="hidden md:block mt-8 md:mt-12 mb-16 md:mb-24">
        <div
          className="grid md:items-start"
          style={{ gridTemplateColumns: "33.333% 33.333% 33.334%" }}
        >
          <ParallaxBlock speed={0.04} className="mt-0">
            <div style={{ paddingRight: "12px" }}>
              <ParallaxImage src="/images/atlantik.jpg" alt="Atlantik J&T Group brand identity" aspect="3/4" sizes="33vw" speed={0.02} grayscale={false} />
              <div className="flex items-baseline justify-between mt-3 px-1">
                <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">01</p>
                <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">Atlantik J&amp;T Group · Brand Identity</p>
              </div>
            </div>
          </ParallaxBlock>
          <ParallaxBlock speed={0.09} className="mt-32">
            <div style={{ paddingLeft: "12px", paddingRight: "12px" }}>
              <ParallaxImage src="/images/project2.jpg" alt="Project 2" aspect="3/2" sizes="33vw" speed={0.03} grayscale={false} />
              <div className="flex items-baseline justify-between mt-3 px-1">
                <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">02</p>
                <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">Description</p>
              </div>
            </div>
          </ParallaxBlock>
          <ParallaxBlock speed={0.065} className="mt-16">
            <div style={{ paddingLeft: "12px" }}>
              <ParallaxImage src="/images/nasecesko.jpg" alt="Naše Česko brand identity" aspect="3/2" sizes="33vw" speed={0.02} grayscale={false} />
              <div className="flex items-baseline justify-between mt-3 px-1">
                <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">03</p>
                <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">Naše Česko</p>
              </div>
            </div>
          </ParallaxBlock>
        </div>
      </div>

      {/* Mobile: swipeable image carousel */}
      <div className="md:hidden px-3 mt-8 mb-16">
        <ImageCarousel images={images} />
      </div>

      {/* CTAs */}
      <div ref={ctaRef} className="fade-up px-3">
        {/* Mobile */}
        <div className="md:hidden flex gap-3">
          <a
            href="#"
            className="inline-flex items-center justify-center px-8 py-3 text-[16px] tracking-[0.15em] uppercase font-normal border border-white text-white rounded-full hover:bg-white/10 transition-colors"
          >
            More Work
          </a>
          <a
            href="#"
            className="inline-flex items-center justify-center px-8 py-3 text-[16px] tracking-[0.15em] uppercase font-normal border border-white text-white rounded-full hover:bg-white/10 transition-colors"
          >
            Experiments
          </a>
        </div>
        {/* Desktop */}
        <div className="hidden md:block">
          <div
            className="grid"
            style={{ gridTemplateColumns: "33.333% 33.333% 33.334%" }}
          >
            <div />
            <div style={{ paddingLeft: "12px" }} className="flex gap-4">
              <a
                href="#"
                className="inline-flex items-center justify-center px-8 py-3 text-xs tracking-[0.15em] uppercase font-normal border border-white text-white rounded-full hover:bg-white/10 transition-colors"
              >
                More Work
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center px-8 py-3 text-xs tracking-[0.15em] uppercase font-normal border border-white text-white rounded-full hover:bg-white/10 transition-colors"
              >
                Experiments
              </a>
            </div>
            <div />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── APPROACH (HOW) ─── */
function Approach() {
  const quoteRef = useFadeIn<HTMLDivElement>(0.15, "0px 0px -60px 0px", 0.06);
  const bodyRef = useFadeIn<HTMLDivElement>(0.15, "0px 0px -60px 0px", 0.04);

  const approachImages = [
    { src: "/images/atlantik.jpg", alt: "Define phase", num: "01", desc: "Define" },
    { src: "/images/project2.jpg", alt: "Build phase", num: "02", desc: "Build" },
    { src: "/images/nasecesko.jpg", alt: "Learn phase", num: "03", desc: "Learn" },
    { src: "/images/what-image.jpg", alt: "Evolve phase", num: "04", desc: "Evolve" },
  ];

  return (
    <section id="approach" className="relative">
      {/* Part 1: Text — 3 columns */}
      <div data-grid="3" className="py-24 md:py-32 lg:py-40">
        {/* HOW SVG */}
        <SectionSvg src="/images/how.svg" speed={-0.05} />

        {/* Big quote */}
        <div ref={quoteRef} className="fade-up px-3 mt-8 md:mt-12 mb-16 md:mb-20">
          {/* Mobile */}
          <div className="md:hidden">
            <h2 className="text-[32px] font-semibold leading-[1.15] tracking-tight text-white uppercase">
              Every project is different, the way we work stays&nbsp;consistent.
            </h2>
          </div>
          {/* Desktop */}
          <div className="hidden md:block">
            <div
              className="grid"
              style={{ gridTemplateColumns: "33.333% 33.333% 33.334%" }}
            >
              <div className="col-span-3" style={{ paddingLeft: "12px" }}>
                <h2 className="text-[42px] lg:text-[52px] font-semibold leading-[1.15] tracking-tight text-white uppercase">
                  Every project is different, the way we work stays&nbsp;consistent.
                </h2>
              </div>
            </div>
          </div>
        </div>

        {/* Body + CTA */}
        <div ref={bodyRef} className="fade-up px-3">
          {/* Mobile */}
          <div className="md:hidden">
            <p className="text-[16px] text-white/60 leading-relaxed mb-10">
              We listen first and define the real problem in plain terms. We explore fast,
              and keep human judgment in control. Then we decide what actually matters for
              your business without unnecessary moves. We deliver clean, production-ready
              outputs and stay around to refine what needs to evolve.
            </p>
            <a
              href="#contact"
              className="inline-flex items-center justify-center px-8 py-3 text-[16px] tracking-[0.15em] uppercase font-normal border border-white text-white rounded-full hover:bg-white/10 transition-colors"
            >
              Book a Meeting
            </a>
          </div>
          {/* Desktop */}
          <div className="hidden md:block">
            <div
              className="grid"
              style={{ gridTemplateColumns: "33.333% 33.333% 33.334%" }}
            >
              <div />
              <div className="col-span-2" style={{ paddingLeft: "12px" }}>
                <p className="text-base text-white/60 leading-relaxed max-w-2xl mb-14">
                  We listen first and define the real problem in plain terms. We explore fast,
                  and keep human judgment in control. Then we decide what actually matters for
                  your business without unnecessary moves. We deliver clean, production-ready
                  outputs and stay around to refine what needs to evolve.
                </p>
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center px-8 py-3 text-xs tracking-[0.15em] uppercase font-normal border border-white text-white rounded-full hover:bg-white/10 transition-colors"
                >
                  Book a Meeting
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Part 2: Images — 4 columns */}
      <div data-grid="4" className="py-16 md:py-24">
        {/* Desktop: 4-column image grid */}
        <div className="hidden md:block w-full">
          <div
            className="grid md:items-start"
            style={{ gridTemplateColumns: "25% 25% 25% 25%" }}
          >
            <ParallaxBlock speed={0.035} className="lg:mt-0">
              <div style={{ paddingRight: "12px" }}>
                <div className="relative overflow-hidden bg-[#2a1a3e]" style={{ aspectRatio: "3/2" }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#3a1a5e] to-[#1a0a2e]" />
                </div>
                <div className="flex items-baseline justify-between mt-3 px-1">
                  <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">Define</p>
                  <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">01</p>
                </div>
              </div>
            </ParallaxBlock>
            <ParallaxBlock speed={0.09} className="lg:mt-60">
              <div style={{ paddingLeft: "12px", paddingRight: "12px" }}>
                <div className="relative overflow-hidden bg-[#2a1a3e]" style={{ aspectRatio: "3/2" }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#4a1a6e] to-[#2a0a3e]" />
                </div>
                <div className="flex items-baseline justify-between mt-3 px-1">
                  <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">Build</p>
                  <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">02</p>
                </div>
              </div>
            </ParallaxBlock>
            <ParallaxBlock speed={0.06} className="lg:mt-24">
              <div style={{ paddingLeft: "12px", paddingRight: "12px" }}>
                <div className="relative overflow-hidden bg-[#2a1a3e]" style={{ aspectRatio: "3/2" }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#5a2a7e] to-[#3a1a4e]" />
                </div>
                <div className="flex items-baseline justify-between mt-3 px-1">
                  <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">Learn</p>
                  <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">03</p>
                </div>
              </div>
            </ParallaxBlock>
            <ParallaxBlock speed={0.075} className="lg:mt-48">
              <div style={{ paddingLeft: "12px" }}>
                <div className="relative overflow-hidden bg-[#2a1a3e]" style={{ aspectRatio: "3/2" }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#6a3a8e] to-[#4a2a5e]" />
                </div>
                <div className="flex items-baseline justify-between mt-3 px-1">
                  <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">Evolve</p>
                  <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">04</p>
                </div>
              </div>
            </ParallaxBlock>
          </div>
        </div>
        {/* Mobile: swipeable carousel */}
        <div className="md:hidden px-3">
          <ImageCarousel images={approachImages} />
        </div>
      </div>
    </section>
  );
}

/* ─── WHAT (SERVICES) ─── */
function What() {
  const quoteRef = useFadeIn<HTMLDivElement>(0.15, "0px 0px -60px 0px", 0.06);

  const serviceItems: AccordionItemData[] = [
    {
      title: "Brand and Strategy",
      content: "Brand positioning, visual identity, naming, tone of voice, and strategic communication frameworks.",
    },
    {
      title: "Digital Products",
      content: "UX/UI design, product strategy, prototyping, design systems, and full-stack development.",
    },
    {
      title: "Motion and Sound Design",
      content: "Animated brand assets, explainer videos, sound identity, and immersive audiovisual experiences.",
    },
    {
      title: "Editorial Design",
      content: "Print and digital publications, annual reports, brand books, and editorial content systems.",
    },
    {
      title: "Consulting and Partnership",
      content: "Ongoing creative partnership, design sprints, team workshops, and strategic advisory.",
    },
  ];

  return (
    <section id="services" className="relative">
      {/* WHAT SVG overlaid on image */}
      <div data-grid="3" className="relative py-24 md:py-32 lg:py-40">
        {/* Background image for SVG area */}
        <div className="relative mb-16 md:mb-20">
          <div className="relative overflow-hidden" style={{ aspectRatio: "auto" }}>
            {/* Desktop: show image behind SVG */}
            <div className="hidden md:block relative">
              <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
                <Image
                  src="/images/what-image.jpg"
                  alt="Studio workspace"
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
              {/* SVG overlaid */}
              <div className="absolute inset-0 flex items-center">
                <ParallaxSvg speed={-0.05} className="w-full">
                  <div className="w-full overflow-hidden mix-blend-difference">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/what.svg"
                      alt=""
                      aria-hidden="true"
                      className="w-full h-auto"
                      style={{ filter: "brightness(0) invert(1)" }}
                    />
                  </div>
                </ParallaxSvg>
              </div>
            </div>
            {/* Mobile: image + SVG */}
            <div className="md:hidden">
              <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
                <Image
                  src="/images/what-image.jpg"
                  alt="Studio workspace"
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
                <div className="absolute inset-0 flex items-center px-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/what.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-[86px] w-auto mix-blend-difference"
                    style={{ filter: "brightness(0) invert(1)" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Accordion */}
        <div className="px-3 mt-8 md:mt-12 mb-24 md:mb-32">
          {/* Desktop: 3-col grid, accordion in cols 2-3 */}
          <div className="hidden md:block">
            <div
              className="grid"
              style={{ gridTemplateColumns: "33.333% 33.333% 33.334%" }}
            >
              <div />
              <div className="col-span-2" style={{ paddingLeft: "12px", paddingRight: "12px" }}>
                <Accordion items={serviceItems} />
              </div>
            </div>
          </div>
          {/* Mobile: full width */}
          <div className="md:hidden">
            <Accordion items={serviceItems} />
          </div>
        </div>

        {/* Bold statement */}
        <div ref={quoteRef} className="fade-up px-3">
          {/* Mobile */}
          <div className="md:hidden">
            <h2 className="text-[32px] font-semibold leading-[1.15] tracking-tight text-white uppercase">
              We cover the full chain. You can work with us end to end, or only in selected&nbsp;stages.
            </h2>
          </div>
          {/* Desktop */}
          <div className="hidden md:block">
            <div
              className="grid"
              style={{ gridTemplateColumns: "33.333% 33.333% 33.334%" }}
            >
              <div className="col-span-3" style={{ paddingLeft: "12px" }}>
                <h2 className="text-[42px] lg:text-[52px] font-semibold leading-[1.15] tracking-tight text-white uppercase">
                  We cover the full chain. You can work with us end to end, or only in selected&nbsp;stages.
                </h2>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── CONTACT ─── */
function Contact() {
  const formRef = useFadeIn<HTMLDivElement>(0.15, "0px 0px -60px 0px", 0.04);
  const [formState, setFormState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [formData, setFormData] = useState({ name: "", contact: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contact || !formData.message) return;
    setFormState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error();
      setFormState("sent");
      setFormData({ name: "", contact: "", message: "" });
    } catch {
      setFormState("error");
    }
  };

  return (
    <section id="contact" className="relative">
      {/* Top area: TALK SVG + people photos + talk image */}
      <div data-grid="3" className="py-24 md:py-32 lg:py-40">
        {/* Desktop: 3-col layout with people on sides */}
        <div className="hidden md:block relative mb-16">
          <div
            className="grid"
            style={{ gridTemplateColumns: "33.333% 33.333% 33.334%" }}
          >
            {/* Left: Lukas */}
            <div style={{ paddingRight: "12px" }}>
              <ParallaxBlock speed={0.04}>
                <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
                  <Image
                    src="/images/lukas.jpg"
                    alt="Lukas Mikovec"
                    fill
                    className="object-cover"
                    sizes="33vw"
                  />
                </div>
                <div className="flex items-baseline justify-between mt-3 px-1">
                  <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">Lukas Mikovec</p>
                  <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">01</p>
                </div>
              </ParallaxBlock>
            </div>

            {/* Center: TALK SVG + talk-image */}
            <div style={{ paddingLeft: "12px", paddingRight: "12px" }}>
              <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
                <Image
                  src="/images/talk-image.jpg"
                  alt="Studio workspace"
                  fill
                  className="object-cover"
                  sizes="33vw"
                />
                <div className="absolute inset-0 flex items-center justify-center mix-blend-difference">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/talk.svg"
                    alt=""
                    aria-hidden="true"
                    className="w-full h-auto px-4"
                    style={{ filter: "brightness(0) invert(1)" }}
                  />
                </div>
              </div>
            </div>

            {/* Right: Tomas */}
            <div style={{ paddingLeft: "12px" }}>
              <ParallaxBlock speed={0.06}>
                <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
                  <Image
                    src="/images/tomas.jpg"
                    alt="Tomas Prochazka"
                    fill
                    className="object-cover"
                    sizes="33vw"
                  />
                </div>
                <div className="flex items-baseline justify-between mt-3 px-1">
                  <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">Tomas Prochazka</p>
                  <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">02</p>
                </div>
              </ParallaxBlock>
            </div>
          </div>
        </div>

        {/* Mobile: TALK SVG + talk image + people stacked */}
        <div className="md:hidden mb-8">
          <div className="relative overflow-hidden mb-4" style={{ aspectRatio: "16/9" }}>
            <Image
              src="/images/talk-image.jpg"
              alt="Studio workspace"
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 flex items-center px-3 mix-blend-difference">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/talk.svg"
                alt=""
                aria-hidden="true"
                className="h-[86px] w-auto"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 px-3">
            <div>
              <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
                <Image
                  src="/images/lukas.jpg"
                  alt="Lukas Mikovec"
                  fill
                  className="object-cover"
                  sizes="50vw"
                />
              </div>
              <div className="flex items-baseline justify-between mt-2 px-1">
                <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">Lukas Mikovec</p>
                <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">01</p>
              </div>
            </div>
            <div>
              <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
                <Image
                  src="/images/tomas.jpg"
                  alt="Tomas Prochazka"
                  fill
                  className="object-cover"
                  sizes="50vw"
                />
              </div>
              <div className="flex items-baseline justify-between mt-2 px-1">
                <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">Tomas Prochazka</p>
                <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">02</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact form */}
        <div
          ref={formRef}
          className="fade-up px-3 mt-12 md:mt-16"
        >
          {/* Desktop: centered in cols 2-3 of 3-col grid */}
          <div className="hidden md:block">
            <div
              className="grid"
              style={{ gridTemplateColumns: "33.333% 33.333% 33.334%" }}
            >
              <div />
              <div className="col-span-2" style={{ paddingLeft: "12px", paddingRight: "12px" }}>
                {formState === "sent" ? (
                  <p className="text-sm tracking-[0.1em] text-white/60 uppercase py-8">
                    Thank you. We&apos;ll get back to you soon.
                  </p>
                ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <input
                      type="text"
                      placeholder="YOUR NAME"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full bg-transparent border border-white/20 rounded-[24px] px-6 py-3 text-sm tracking-[0.1em] text-white placeholder:text-white/30 uppercase focus:outline-none focus:border-white/50 transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="PHONE OR EMAIL"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      required
                      className="w-full bg-transparent border border-white/20 rounded-[24px] px-6 py-3 text-sm tracking-[0.1em] text-white placeholder:text-white/30 uppercase focus:outline-none focus:border-white/50 transition-colors"
                    />
                  </div>
                  <textarea
                    placeholder="DESCRIBE YOUR PLAN OR WHAT ARE YOU INTERESTED IN"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={5}
                    className="w-full bg-transparent border border-white/20 rounded-[24px] px-6 py-4 text-sm tracking-[0.1em] text-white placeholder:text-white/30 uppercase focus:outline-none focus:border-white/50 transition-colors resize-none"
                  />
                  <button
                    type="submit"
                    disabled={formState === "sending"}
                    className="inline-flex items-center justify-center px-10 py-3 text-sm tracking-[0.15em] uppercase font-normal border border-white text-white rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    {formState === "sending" ? "Sending..." : formState === "error" ? "Try Again" : "Let Me Know"}
                  </button>
                </form>
                )}
              </div>
            </div>
          </div>

          {/* Mobile: stacked full width */}
          <div className="md:hidden">
            {formState === "sent" ? (
              <p className="text-[16px] text-white/60 uppercase py-8">
                Thank you. We&apos;ll get back to you soon.
              </p>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="YOUR NAME"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full bg-transparent border border-white/20 rounded-[24px] px-6 py-3 text-[16px] text-white placeholder:text-white/30 uppercase focus:outline-none focus:border-white/50 transition-colors"
              />
              <input
                type="text"
                placeholder="PHONE OR EMAIL"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                required
                className="w-full bg-transparent border border-white/20 rounded-[24px] px-6 py-3 text-[16px] text-white placeholder:text-white/30 uppercase focus:outline-none focus:border-white/50 transition-colors"
              />
              <textarea
                placeholder="DESCRIBE YOUR PLAN OR WHAT ARE YOU INTERESTED IN"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                rows={5}
                className="w-full bg-transparent border border-white/20 rounded-[24px] px-6 py-4 text-[16px] text-white placeholder:text-white/30 uppercase focus:outline-none focus:border-white/50 transition-colors resize-none"
              />
              <button
                type="submit"
                disabled={formState === "sending"}
                className="inline-flex items-center justify-center px-10 py-3 text-[16px] tracking-[0.15em] uppercase font-normal border border-white text-white rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {formState === "sending" ? "Sending..." : formState === "error" ? "Try Again" : "Let Me Know"}
              </button>
            </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer data-grid="4" className="px-3 mt-24 md:mt-32 pt-12">
        {/* Desktop: all 4 cols used */}
        <div className="hidden md:block">
          <div
            className="grid"
            style={{ gridTemplateColumns: "25% 25% 25% 25%" }}
          >
            <div style={{ paddingLeft: "12px" }}>
              <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase mb-4">
                &copy; {new Date().getFullYear()} alwaysfriday.studio
              </p>
            </div>
            <div style={{ paddingLeft: "12px" }}>
              <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase mb-4">
                Studio Řevnice
              </p>
              <p className="text-sm text-white/50 leading-relaxed">
                Co-work Meandr, Dům Sylvie,<br />
                náměstí Krále Jiřího z Poděbrad 2,<br />
                Řevnice
              </p>
            </div>
            <div style={{ paddingLeft: "12px" }}>
              <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase mb-4">
                Studio Praha Nusle
              </p>
              <p className="text-sm text-white/50 leading-relaxed">
                Táborská 317/65,<br />
                Praha 4
              </p>
            </div>
            <div style={{ paddingLeft: "12px" }}>
              <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase mb-4">
                Invoicing
              </p>
              <p className="text-sm text-white/50 leading-relaxed">
                Alwaysfriday s.r.o.,<br />
                U Ladronky 1167/30,<br />
                Břevnov, Praha 6, 169 00
              </p>
            </div>
          </div>
          <div className="pb-8" />
        </div>

        {/* Mobile: stacked */}
        <div className="md:hidden space-y-8">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase mb-3">
              Studio Řevnice
            </p>
            <p className="text-sm text-white/50 leading-relaxed">
              Co-work Meandr, Dům Sylvie,<br />
              náměstí Krále Jiřího z Poděbrad 2, Řevnice
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase mb-3">
              Studio Praha Nusle
            </p>
            <p className="text-sm text-white/50 leading-relaxed">
              Táborská 317/65, Praha 4
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase mb-3">
              Invoicing
            </p>
            <p className="text-sm text-white/50 leading-relaxed">
              Alwaysfriday s.r.o.,<br />
              U Ladronky 1167/30, Břevnov, Praha 6, 169 00
            </p>
          </div>
          <div className="mt-12 pb-8">
            <p className="text-xs text-white/20">
              &copy; {new Date().getFullYear()} alwaysfriday.studio
            </p>
          </div>
        </div>
      </footer>
    </section>
  );
}

/* ─── PAGE ─── */
export default function Home() {
  return (
    <>
      <CustomCursor />
      <GridLines />
      <Nav />
      <main>
        <Hero />
        <Work />
        <Approach />
        <What />
        <Contact />
      </main>
    </>
  );
}
