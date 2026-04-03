import { useEffect, useRef, useState } from 'react'
import { MONTHS_MAP } from '../api'

interface Props {
  campgroundId: string
  campgroundName: string
  year: number
  months: number[]
  minConsecutive: number
  onClose: () => void
}

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function AlertModal({ campgroundId, campgroundName, year, months, minConsecutive, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('submitting')
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), campgroundId, campgroundName, year, months, minConsecutive }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create alert')
      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  const monthNames = months.map(m => MONTHS_MAP[m]).join(', ')

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        {status === 'success' ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-lg font-semibold text-black mb-2">Alert set!</h2>
            <p className="text-sm text-gray-500 mb-5">
              We'll email <span className="font-medium text-black">{email}</span> the moment new sites open up at{' '}
              <span className="font-medium text-black">{campgroundName}</span>.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="bg-black text-white rounded-full px-6 py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-black">🔔 Set availability alert</h2>
                <p className="text-sm text-gray-500 mt-1">Get emailed when new sites open up.</p>
              </div>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-black text-xl leading-none mt-0.5">×</button>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 mb-5 text-sm space-y-1">
              <div><span className="text-gray-500">Campground:</span> <span className="font-medium">{campgroundName}</span></div>
              <div><span className="text-gray-500">Months:</span> <span className="font-medium">{monthNames}</span></div>
              <div><span className="text-gray-500">Year:</span> <span className="font-medium">{year}</span></div>
              {minConsecutive > 1 && (
                <div><span className="text-gray-500">Min nights:</span> <span className="font-medium">{minConsecutive}+</span></div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="alert-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Your email address
                </label>
                <input
                  ref={inputRef}
                  id="alert-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors"
                />
              </div>

              {status === 'error' && (
                <p className="text-sm text-red-600">{errorMsg}</p>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="bg-black text-white rounded-full px-6 py-2 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {status === 'submitting' ? 'Setting alert…' : 'Set alert'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm text-gray-400 hover:text-black transition-colors"
                >
                  Cancel
                </button>
              </div>

              <p className="text-xs text-gray-400">
                We check for new openings every 30 minutes. You'll only be notified for genuinely new availability — no spam.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
