import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface ModalProps {
  aberto: boolean
  onFechar: () => void
  children: ReactNode
}

export default function Modal({ aberto, onFechar, children }: ModalProps) {
  useEffect(() => {
    if (!aberto) return

    const bodyOverflowOriginal = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = bodyOverflowOriginal
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [aberto, onFechar])

  if (!aberto) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-8 backdrop-blur-sm sm:items-center"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
