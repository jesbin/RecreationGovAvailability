import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4'

const NAV_ITEMS = [
  { label: 'Home', href: '/', active: true },
  { label: 'Studio', href: '#' },
  { label: 'About', href: '#' },
  { label: 'Journal', href: '#' },
  { label: 'Reach Us', href: '#' },
]

export default function HomePage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const rafRef = useRef<number | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const FADE_DURATION = 0.5

    function tick() {
      if (!video) return
      const { currentTime, duration } = video
      if (!duration || isNaN(duration)) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      if (currentTime < FADE_DURATION) {
        video.style.opacity = String(currentTime / FADE_DURATION)
      } else if (currentTime > duration - FADE_DURATION) {
        video.style.opacity = String((duration - currentTime) / FADE_DURATION)
      } else {
        video.style.opacity = '1'
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    function handleEnded() {
      if (!video) return
      video.style.opacity = '0'
      setTimeout(() => {
        if (!video) return
        video.currentTime = 0
        video.play().catch(() => {})
      }, 100)
    }

    video.style.opacity = '0'
    video.play().catch(() => {})
    rafRef.current = requestAnimationFrame(tick)
    video.addEventListener('ended', handleEnded)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      video.removeEventListener('ended', handleEnded)
    }
  }, [])

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white">
      {/* Video background */}
      <div
        className="absolute w-full overflow-hidden"
        style={{ top: '300px', inset: 'auto 0 0 0' }}
      >
        <video
          ref={videoRef}
          src={VIDEO_URL}
          muted
          playsInline
          className="w-full object-cover"
          style={{ opacity: 0 }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white pointer-events-none" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 w-full">
        <div className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
          {/* Logo */}
          <a href="/" className="font-serif text-3xl tracking-tight text-black select-none">
            Aethera<sup className="text-base align-super">®</sup>
          </a>

          {/* Menu items */}
          <ul className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="font-sans text-sm transition-colors hover:text-black"
                  style={{ color: item.active ? '#000000' : '#6F6F6F' }}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <button
            onClick={() => navigate('/availability')}
            className="font-sans text-sm rounded-full px-6 py-2.5 bg-black text-white transition-transform hover:scale-[1.03] active:scale-100"
          >
            Begin Journey
          </button>
        </div>
      </nav>

      {/* Hero section */}
      <section
        className="relative z-10 flex flex-col items-center justify-center text-center px-6 pb-40"
        style={{ paddingTop: 'calc(8rem - 75px)' }}
      >
        {/* Headline */}
        <h1
          className="font-serif font-normal text-5xl sm:text-7xl md:text-8xl max-w-7xl animate-fade-rise"
          style={{ lineHeight: 0.95, letterSpacing: '-2.46px', color: '#000000' }}
        >
          Beyond{' '}
          <em className="not-italic" style={{ color: '#6F6F6F' }}>
            silence,
          </em>{' '}
          we build{' '}
          <em className="not-italic" style={{ color: '#6F6F6F' }}>
            the eternal.
          </em>
        </h1>

        {/* Description */}
        <p
          className="font-sans text-base sm:text-lg max-w-2xl mt-8 leading-relaxed animate-fade-rise-delay"
          style={{ color: '#6F6F6F' }}
        >
          Building platforms for brilliant minds, fearless makers, and thoughtful souls.
          Through the noise, we craft digital havens for deep work and pure flows.
        </p>

        {/* CTA */}
        <button
          onClick={() => navigate('/availability')}
          className="font-sans text-base rounded-full px-14 py-5 mt-12 bg-black text-white transition-transform hover:scale-[1.03] active:scale-100 animate-fade-rise-delay-2"
        >
          Begin Journey
        </button>
      </section>
    </div>
  )
}
