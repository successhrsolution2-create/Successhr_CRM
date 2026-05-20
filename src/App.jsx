import { useEffect, useMemo, useState } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import RoleGuard from './components/RoleGuard.jsx'
import { logout } from './store/authSlice.js'
import { redirectPathForRole } from './utils/helpers.js'
import LoginPage from './pages/LoginPage.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import ManageEmployees from './pages/admin/ManageEmployees.jsx'
import AdminReports from './pages/admin/AdminReports.jsx'
import CandidateList from './pages/employee/CandidateList.jsx'
import CandidateForm from './pages/employee/CandidateForm.jsx'

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'grid' },
  { to: '/admin/employees', label: 'Employees', icon: 'users' },
  { to: '/admin/candidates', label: 'Candidates', icon: 'candidate' },
  { to: '/admin/reports', label: 'Reports', icon: 'table' }
]

const employeeLinks = [
  { to: '/employee/candidates', label: 'Candidates', icon: 'candidate' },
  { to: '/employee/candidates/new', label: 'Add Candidate', icon: 'plus' }
]

const SIDEBAR_DEFAULT_WIDTH = 224
const SIDEBAR_MIN_WIDTH = 204
const SIDEBAR_MAX_WIDTH = 340
const SIDEBAR_WIDTH_KEY = 'crm_sidebar_width_compact'

const clampSidebarWidth = (value) => Math.min(Math.max(value, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH)

const SidebarIcon = ({ type }) => {
  const commonProps = {
    className: 'h-4 w-4 flex-none',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true'
  }

  if (type === 'users') {
    return (
      <svg {...commonProps}>
        <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
        <path d="M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M20 19v-1.2a3 3 0 0 0-2.2-2.9" />
        <path d="M15.5 4.2a3 3 0 0 1 0 5.6" />
      </svg>
    )
  }

  if (type === 'table') {
    return (
      <svg {...commonProps}>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M4 10h16" />
        <path d="M10 5v15" />
      </svg>
    )
  }

  if (type === 'plus') {
    return (
      <svg {...commonProps}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    )
  }

  if (type === 'grid') {
    return (
      <svg {...commonProps}>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </svg>
    )
  }

  return (
    <svg {...commonProps}>
      <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
      <path d="M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M18.5 7v5" />
      <path d="M16 9.5h5" />
    </svg>
  )
}

const Shell = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role } = useSelector((state) => state.auth)
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches
  )
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches
  )
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') return SIDEBAR_DEFAULT_WIDTH

    const savedWidth = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY))
    return Number.isFinite(savedWidth) ? clampSidebarWidth(savedWidth) : SIDEBAR_DEFAULT_WIDTH
  })
  const [isResizingSidebar, setIsResizingSidebar] = useState(false)

  const links = useMemo(() => (role === 'crm_super_admin' ? adminLinks : employeeLinks), [role])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const handleViewportChange = (event) => {
      setIsDesktop(event.matches)
      setIsSidebarOpen(event.matches)
    }

    handleViewportChange(mediaQuery)
    mediaQuery.addEventListener('change', handleViewportChange)
    return () => mediaQuery.removeEventListener('change', handleViewportChange)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth))
    }
  }, [sidebarWidth])

  useEffect(() => {
    if (!isResizingSidebar) return undefined

    const handlePointerMove = (event) => {
      setSidebarWidth(clampSidebarWidth(event.clientX))
    }

    const handlePointerUp = () => {
      setIsResizingSidebar(false)
    }

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isResizingSidebar])

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f7fafc]">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-20 bg-slate-950/45 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-[min(224px,86vw)] overflow-y-auto overflow-x-hidden bg-[linear-gradient(180deg,#09264a_0%,#071f3d_42%,#06172c_100%)] text-white transition-transform duration-300 ease-out lg:max-w-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: isDesktop ? `${sidebarWidth}px` : 'min(224px, 86vw)' }}
      >
        <div className="border-b border-white/10 px-4 pb-5 pt-14">
          <img src="/success-logo.svg" alt="Success HR Solutions" className="mx-auto h-auto w-[168px] object-contain" />
        </div>

        <div className="space-y-5 px-3 py-5">
          <div className="border-t border-white/10 pt-4">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              CRM Management
            </p>
          </div>

          <nav className="space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex h-9 items-center gap-3 rounded-md px-3 text-[13px] font-medium transition ${
                  isActive
                    ? 'bg-gradient-to-r from-[#2f8dff] to-[#316dff] text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <SidebarIcon type={link.icon} />
              <span className="min-w-0 truncate">{link.label}</span>
            </NavLink>
          ))}
          </nav>
        </div>

        {isDesktop && isSidebarOpen ? (
          <button
            type="button"
            aria-label="Resize sidebar"
            title="Drag to resize sidebar"
            className={`absolute right-0 top-0 hidden h-full w-3 cursor-col-resize items-center justify-center border-r border-white/10 transition lg:flex ${
              isResizingSidebar ? 'bg-white/10' : 'bg-transparent hover:bg-white/10'
            }`}
            onPointerDown={(event) => {
              event.preventDefault()
              setIsResizingSidebar(true)
            }}
            onDoubleClick={() => setSidebarWidth(SIDEBAR_DEFAULT_WIDTH)}
          >
            <span className="flex h-11 w-6 items-center justify-center rounded-full border border-white/20 bg-[#06172c] text-white">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M8 7 3 12l5 5" />
                <path d="M16 7l5 5-5 5" />
                <path d="M3 12h18" />
              </svg>
            </span>
          </button>
        ) : null}
      </aside>

      <button
        type="button"
        aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        className="fixed left-3 top-3 z-50 flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-[#06172c]/95 text-white transition hover:bg-[#0b2546] focus:outline-none focus:ring-2 focus:ring-white/25"
        onClick={() => setIsSidebarOpen((value) => !value)}
      >
        <span className="flex flex-col gap-1" aria-hidden="true">
          <span
            className={`block h-0.5 w-4 rounded-full bg-current transition ${
              isSidebarOpen ? 'translate-y-1.5 rotate-45' : ''
            }`}
          />
          <span
            className={`block h-0.5 w-4 rounded-full bg-current transition ${
              isSidebarOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`block h-0.5 w-4 rounded-full bg-current transition ${
              isSidebarOpen ? '-translate-y-1.5 -rotate-45' : ''
            }`}
          />
        </span>
      </button>

      <div
        className="transition-[padding] duration-300"
        style={{ paddingLeft: isDesktop && isSidebarOpen ? `${sidebarWidth}px` : undefined }}
      >
        <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
          <div
            className={`flex min-h-20 flex-col gap-3 py-3 pl-16 pr-4 transition-[padding] sm:flex-row sm:items-center sm:justify-between ${
              isSidebarOpen ? 'lg:pl-10 lg:pr-10' : 'lg:pl-20 lg:pr-10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
                  {role === 'crm_super_admin' ? 'Super Admin' : 'Employee'}
                </p>
                <h2 className="text-lg font-semibold text-ink">{user?.name || 'CRM User'}</h2>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 overflow-x-auto lg:hidden">
                {links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `rounded-md px-3 py-2 text-sm font-semibold ${
                        isActive || location.pathname === link.to
                          ? 'bg-brand-blue text-white'
                          : 'bg-white text-slate-600'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
              <button type="button" className="crm-button-secondary" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

const HomeRedirect = () => {
  const { role } = useSelector((state) => state.auth)
  return <Navigate to={redirectPathForRole(role)} replace />
}

const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<Shell />}>
        <Route index element={<HomeRedirect />} />
        <Route element={<RoleGuard allowedRoles={['crm_super_admin']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/employees" element={<ManageEmployees />} />
          <Route path="/admin/candidates" element={<AdminReports initialView="candidates" />} />
          <Route path="/admin/reports" element={<AdminReports initialView="reports" />} />
        </Route>
        <Route element={<RoleGuard allowedRoles={['crm_employee']} />}>
          <Route path="/employee/dashboard" element={<Navigate to="/employee/candidates" replace />} />
          <Route path="/employee/candidates" element={<CandidateList />} />
          <Route path="/employee/candidates/new" element={<CandidateForm mode="create" />} />
          <Route path="/employee/candidates/:id" element={<CandidateForm mode="edit" />} />
        </Route>
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

export default App
