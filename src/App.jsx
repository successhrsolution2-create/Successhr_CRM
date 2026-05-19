import { useMemo } from 'react'
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
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/employees', label: 'Employees' },
  { to: '/admin/candidates', label: 'Candidates' },
  { to: '/admin/reports', label: 'Reports' }
]

const employeeLinks = [
  { to: '/employee/candidates', label: 'Candidates' },
  { to: '/employee/candidates/new', label: 'Add Candidate' }
]

const Shell = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role } = useSelector((state) => state.auth)

  const links = useMemo(() => (role === 'crm_super_admin' ? adminLinks : employeeLinks), [role])

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f7fafc]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-line bg-white px-5 py-6 lg:block">
        <div className="mb-8 border-b border-line pb-6">
          <img src="/success-logo.svg" alt="Success HR Solutions" className="mb-5 h-auto w-56 object-contain" />
          <p className="text-xs font-semibold uppercase tracking-normal text-brand-blue">Telecalling</p>
          <h1 className="mt-1 text-3xl font-semibold text-brand-blue-dark">CRM</h1>
        </div>
        <nav className="space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex h-11 items-center rounded-md border-l-4 px-4 text-sm font-semibold transition ${
                  isActive
                    ? 'border-brand-orange bg-brand-blue-soft text-brand-blue-dark'
                    : 'border-transparent text-slate-700 hover:border-brand-orange/60 hover:bg-slate-50 hover:text-brand-blue-dark'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
          <div className="flex min-h-20 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
                {role === 'crm_super_admin' ? 'Super Admin' : 'Employee'}
              </p>
              <h2 className="text-lg font-semibold text-ink">{user?.name || 'CRM User'}</h2>
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
                          ? 'bg-brand-blue-soft text-brand-blue-dark'
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
