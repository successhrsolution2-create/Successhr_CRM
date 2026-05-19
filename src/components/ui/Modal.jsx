import { useEffect } from 'react'

const Modal = ({ open, title, children, onClose, size = 'md' }) => {
  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const sizeClass = size === 'lg' ? 'max-w-4xl' : 'max-w-xl'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <div className={`max-h-[90vh] w-full ${sizeClass} overflow-y-auto rounded-lg bg-white shadow-soft`}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button className="crm-button-secondary h-8 px-3" type="button" onClick={onClose} aria-label="Close modal">
            x
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  )
}

export default Modal
