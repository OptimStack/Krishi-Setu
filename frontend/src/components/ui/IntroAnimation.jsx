import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function IntroAnimation({ onComplete }) {
  const containerRef = useRef(null);
  const logoRef = useRef(null);
  const emblemRef = useRef(null);
  const ringRef = useRef(null);
  const bridgeLineRef = useRef(null);
  const farmerNodeRef = useRef(null);
  const buyerNodeRef = useRef(null);
  const textRef = useRef(null);
  const subtextRef = useRef(null);
  const progressRef = useRef(null);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (skipped) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          // Fade out the entire overlay cleanly
          gsap.to(containerRef.current, {
            opacity: 0,
            scale: 1.04,
            duration: 0.6,
            ease: 'power2.inOut',
            onComplete: () => {
              if (onComplete) onComplete();
            },
          });
        },
      });

      // Initial states
      gsap.set(emblemRef.current, { scale: 0, rotation: -45, opacity: 0 });
      gsap.set(ringRef.current, { scale: 0.5, opacity: 0 });
      gsap.set([farmerNodeRef.current, buyerNodeRef.current], { scale: 0, opacity: 0 });
      gsap.set(bridgeLineRef.current, { scaleX: 0, transformOrigin: 'center' });
      gsap.set(textRef.current, { y: 25, opacity: 0 });
      gsap.set(subtextRef.current, { y: 15, opacity: 0 });
      gsap.set(progressRef.current, { width: '0%' });

      // 1. Sprout / Seed Emblem entry
      tl.to(emblemRef.current, {
        scale: 1.2,
        rotation: 0,
        opacity: 1,
        duration: 0.6,
        ease: 'back.out(2)',
      })
      .to(emblemRef.current, {
        scale: 1,
        duration: 0.2,
        ease: 'power1.inOut',
      })
      // 2. Glowing pulse ring expands
      .to(
        ringRef.current,
        {
          scale: 1.6,
          opacity: 0.7,
          duration: 0.5,
          ease: 'power2.out',
        },
        '-=0.3'
      )
      .to(
        ringRef.current,
        {
          scale: 2.2,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in',
        }
      )
      // 3. Reveal Brand Name & Marathi typography
      .to(
        textRef.current,
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'power3.out',
        },
        '-=0.3'
      )
      .to(
        subtextRef.current,
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: 'power2.out',
        },
        '-=0.2'
      )
      // 4. Animate the Double-Auction Bridge nodes
      .to(
        [farmerNodeRef.current, buyerNodeRef.current],
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          stagger: 0.15,
          ease: 'back.out(1.8)',
        },
        '-=0.1'
      )
      .to(
        bridgeLineRef.current,
        {
          scaleX: 1,
          duration: 0.5,
          ease: 'power2.inOut',
        },
        '-=0.3'
      )
      // 5. Progress bar sweep
      .to(
        progressRef.current,
        {
          width: '100%',
          duration: 0.6,
          ease: 'power1.inOut',
        },
        '-=0.2'
      )
      // 6. Hold for aesthetic appreciation
      .to({}, { duration: 0.4 });
    }, containerRef);

    return () => ctx.revert();
  }, [skipped, onComplete]);

  const handleSkip = () => {
    setSkipped(true);
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.out',
        onComplete: () => {
          if (onComplete) onComplete();
        },
      });
    } else {
      if (onComplete) onComplete();
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#061208] via-[#0b1c0e] to-[#040a05] text-white select-none overflow-hidden"
    >
      {/* Ambient background particles / glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(42,81,36,0.35)_0%,_transparent_65%)] pointer-events-none" />
      <div className="absolute w-96 h-96 rounded-full bg-[#D3D67A]/10 blur-3xl pointer-events-none -top-20 -left-20 animate-pulse" />
      <div className="absolute w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none -bottom-20 -right-20 animate-pulse" />

      {/* Top Skip Button */}
      <button
        onClick={handleSkip}
        className="absolute top-6 right-6 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold tracking-wide text-stone-200 border border-white/20 backdrop-blur-md transition-all flex items-center gap-1 z-20 cursor-pointer"
      >
        <span>Skip</span>
        <span>→</span>
      </button>

      {/* Center Cinematic Card */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
        {/* Glowing Emblem & Halo Ring */}
        <div className="relative mb-6 flex items-center justify-center">
          <div
            ref={ringRef}
            className="absolute w-28 h-28 rounded-full border-2 border-[#D3D67A]/60 shadow-[0_0_30px_rgba(211,214,122,0.5)] pointer-events-none"
          />
          <div
            ref={emblemRef}
            className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#1d3d19] to-[#2e5927] border-2 border-[#D3D67A]/70 shadow-[0_0_40px_rgba(42,81,36,0.6)] flex items-center justify-center text-5xl relative z-10"
          >
            🌾
          </div>
        </div>

        {/* Brand Typography */}
        <div ref={textRef} className="space-y-1 mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D3D67A]/15 border border-[#D3D67A]/30 text-[#D3D67A] text-xs font-bold tracking-widest uppercase mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D3D67A] animate-ping" />
            Empowering Indian Agriculture
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            KRISHI<span className="text-[#D3D67A]">-SETU</span>
          </h1>
          <p className="text-sm font-semibold text-emerald-200/90 tracking-wide font-serif">
            कृषी सेतू • थेट बाजार, हमीभाव
          </p>
        </div>

        {/* Subtitle */}
        <p
          ref={subtextRef}
          className="text-xs text-stone-300 max-w-sm mx-auto leading-relaxed mb-8"
        >
          Automated double-auction linkage connecting smallholder farmers with wholesale buyers at guaranteed fair market equilibrium.
        </p>

        {/* Animated Market Bridge Graphic */}
        <div className="w-full max-w-xs mb-8">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <div
              ref={farmerNodeRef}
              className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-xl shadow-md"
            >
              <span>🧑‍🌾</span>
              <span className="text-emerald-300">Farmers</span>
            </div>

            <span className="text-[10px] text-[#D3D67A] font-mono uppercase tracking-widest px-1">
              SETU BRIDGE
            </span>

            <div
              ref={buyerNodeRef}
              className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-xl shadow-md"
            >
              <span>🏢</span>
              <span className="text-emerald-300">Buyers</span>
            </div>
          </div>

          {/* Golden connecting bridge beam */}
          <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              ref={bridgeLineRef}
              className="h-full bg-gradient-to-r from-emerald-400 via-[#D3D67A] to-emerald-400 rounded-full shadow-[0_0_12px_#D3D67A]"
            />
          </div>
        </div>

        {/* Loading Progress Bar */}
        <div className="w-48 space-y-1.5">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              ref={progressRef}
              className="h-full bg-[#D3D67A] rounded-full transition-all duration-300"
            />
          </div>
          <p className="text-[10px] text-stone-400 uppercase tracking-widest font-mono">
            Initializing Marketplace...
          </p>
        </div>
      </div>
    </div>
  );
}
