import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/axiosInstance.js'
import Badge from '../../components/ui/Badge.jsx'
import Table from '../../components/ui/Table.jsx'
import { formatDateTime, getErrorMessage } from '../../utils/helpers.js'

const Stat = ({ label, value, tone = 'border-slate-200' }) => (
  <div className={`rounded-md border ${tone} bg-white p-4 shadow-sm`}>
    <p className="text-sm font-semibold text-slate-500">{label}</p>
    <p className="mt-2 text-3xl font-bold text-ink">{value ?? 0}</p>
  </div>
)

const AdminDashboard = () => {
  const [reports, setReports] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true)
        const [reportResponse, employeeResponse] = await Promise.all([
          api.get('/admin/reports'),
          api.get('/admin/employees?limit=8')
        ])

        setReports(reportResponse.data.data)
        setEmployees(employeeResponse.data.data?.employees || [])
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to load admin dashboard'))
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'candidateCount', label: 'Candidates', render: (row) => row.candidateCount || 0 },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge tone={row.isActive ? 'emerald' : 'slate'}>{row.isActive ? 'Active' : 'Inactive'}</Badge>
    },
    {
      key: 'lastActiveAt',
      label: 'Last Active',
      render: (row) => formatDateTime(row.lastActiveAt || row.updatedAt)
    }
  ]

  if (loading) {
    return <div className="rounded-lg border border-line bg-white p-6 text-slate-600">Loading dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-brand-blue-dark">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">Today and total CRM activity across all employees.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Total Candidates" value={reports?.candidates?.total} tone="border-brand-blue/30" />
        <Stat label="Total Employees" value={reports?.employees?.total} tone="border-slate-200" />
        <Stat label="Today's Calls" value={reports?.calls?.today} tone="border-brand-orange/40" />
        <Stat label="Converted" value={reports?.candidates?.converted} tone="border-emerald-200" />
        <Stat label="Pending" value={reports?.candidates?.pending} tone="border-rose-200" />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Employees</h2>
        </div>
        <Table columns={columns} rows={employees} emptyMessage="No CRM employees found" />
      </section>
    </div>
  )
}

export default AdminDashboard
