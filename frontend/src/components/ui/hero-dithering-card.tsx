import { ArrowRight } from "lucide-react"
import { useState, Suspense, lazy } from "react"

const Dithering = lazy(() =>
  import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering }))
)

/** Soft burnt orange — less aggressive than #EC4E02 */
const ORANGE_SOFT = "#C46A3A"
const ORANGE_MUTED = "#A85A32"

export function CTASection() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <section className="py-12 w-full flex justify-center items-center px-4 md:px-6">
      <div
        className="w-full max-w-7xl relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative overflow-hidden rounded-[48px] border border-white/10 bg-black shadow-sm min-h-[600px] md:min-h-[600px] flex flex-col items-center justify-center duration-500">
          <Suspense fallback={<div className="absolute inset-0 bg-black" />}>
            {/* Primary moving wave field */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.32] mix-blend-screen">
              <Dithering
                colorBack="#00000000"
                colorFront={ORANGE_SOFT}
                shape="wave"
                type="4x4"
                size={3}
                scale={1.15}
                speed={isHovered ? 1.15 : 0.55}
                className="size-full"
                minPixelRatio={1}
              />
            </div>
            {/* Soft secondary ripple for depth */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.14] mix-blend-screen">
              <Dithering
                colorBack="#00000000"
                colorFront={ORANGE_MUTED}
                shape="ripple"
                type="8x8"
                size={4}
                scale={0.85}
                speed={isHovered ? 0.7 : 0.35}
                className="size-full"
                minPixelRatio={1}
              />
            </div>
          </Suspense>

          {/* Gentle CSS wave wash */}
          <div
            className="absolute inset-0 z-[1] pointer-events-none opacity-30"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 80% 55% at 50% 110%, rgba(196, 106, 58, 0.22), transparent 58%)",
              animation: "hero-wave-drift 9s ease-in-out infinite alternate",
            }}
          />

          <div className="relative z-10 px-6 max-w-4xl mx-auto text-center flex flex-col items-center">
            <div
              className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur-sm"
              style={{
                borderColor: "rgba(196, 106, 58, 0.22)",
                background: "rgba(196, 106, 58, 0.08)",
                color: ORANGE_SOFT,
              }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                  style={{ background: ORANGE_SOFT }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: ORANGE_SOFT }}
                />
              </span>
              AI-Powered Writing
            </div>

            <h2 className="font-serif text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight text-white mb-8 leading-[1.05]">
              Your words, <br />
              <span className="text-white/80">delivered perfectly.</span>
            </h2>

            <p className="text-white/60 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
              Join 2,847 founders using the only AI that understands the nuance of your voice.
              Clean, precise, and uniquely yours.
            </p>

            <button
              className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-full px-12 text-base font-medium text-white transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: ORANGE_MUTED,
                boxShadow: isHovered ? "0 0 0 4px rgba(196, 106, 58, 0.18)" : "none",
              }}
            >
              <span className="relative z-10">Start Typing</span>
              <ArrowRight className="h-5 w-5 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes hero-wave-drift {
          0% { transform: translateY(0) scale(1); opacity: 0.22; }
          100% { transform: translateY(-18px) scale(1.06); opacity: 0.38; }
        }
      `}</style>
    </section>
  )
}
