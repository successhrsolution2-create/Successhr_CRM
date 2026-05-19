const toneClasses = {
  amber: 'bg-amber-100 text-amber-800 ring-amber-200',
  emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  red: 'bg-rose-100 text-rose-800 ring-rose-200',
  sky: 'bg-sky-100 text-sky-800 ring-sky-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200'
}

const Badge = ({ children, tone = 'slate' }) => (
  <span
    className={`inline-flex min-h-6 min-w-12 items-center justify-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${toneClasses[tone] || toneClasses.slate}`}
  >
    {children}
  </span>
)

export default Badge
