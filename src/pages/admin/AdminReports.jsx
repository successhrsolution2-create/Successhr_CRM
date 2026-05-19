import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/axiosInstance.js'
import Badge from '../../components/ui/Badge.jsx'
import Table from '../../components/ui/Table.jsx'
import {
  buildQueryString,
  callStatusTone,
  candidateClassTone,
  downloadBlob,
  formatDateTime,
  getErrorMessage
} from '../../utils/helpers.js'

const defaultFilters = {
  employeeId: '',
  candidateClass: '',
  callStatus: '',
  interested: '',
  startDate: '',
  endDate: '',
  search: ''
}

const Stat = ({ label, value }) => (
  <div className="rounded-md border border-line bg-white p-4 shadow-sm">
    <p className="text-sm font-semibold text-slate-500">{label}</p>
    <p className="mt-2 text-3xl font-bold text-ink">{value ?? 0}</p>
  </div>
)

const AdminReports = ({ initialView = 'reports' }) => {
  const [view, setView] = useState(initialView)
  const [filters, setFilters] = useState(defaultFilters)
  const [activeFilters, setActiveFilters] = useState(defaultFilters)
  const [employees, setEmployees] = useState([])
  const [reports, setReports] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const query = useMemo(
    () =>
      buildQueryString({
        ...activeFilters,
        page,
        limit: 25
      }),
    [activeFilters, page]
  )

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const response = await api.get('/admin/employees?limit=100')
        setEmployees(response.data.data?.employees || [])
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to load employees'))
      }
    }

    loadEmployees()
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [reportResponse, candidateResponse] = await Promise.all([
          api.get(`/admin/reports${buildQueryString(activeFilters)}`),
          api.get(`/admin/candidates${query}`)
        ])

        setReports(reportResponse.data.data)
        setCandidates(candidateResponse.data.data?.candidates || [])
        setPagination(candidateResponse.data.data?.pagination || null)
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to load CRM reports'))
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [activeFilters, query])

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  const applyFilters = (event) => {
    event.preventDefault()
    setPage(1)
    setActiveFilters(filters)
  }

  const resetFilters = () => {
    setFilters(defaultFilters)
    setActiveFilters(defaultFilters)
    setPage(1)
  }

  const exportCsv = async () => {
    try {
      const response = await api.get(`/admin/export${buildQueryString(activeFilters)}`, { responseType: 'blob' })
      downloadBlob(response.data, `crm-candidates-${new Date().toISOString().slice(0, 10)}.csv`)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to export candidates'))
    }
  }

  const columns = [
    { key: 'candidateName', label: 'Candidate' },
    { key: 'mobileNumber', label: 'Mobile' },
    { key: 'jobProfile', label: 'Job Profile' },
    {
      key: 'employee',
      label: 'Employee',
      render: (row) => row.recruiter?.name || '-'
    },
    {
      key: 'interested',
      label: 'Interested',
      render: (row) => <Badge tone={row.interested?.status === 'yes' ? 'emerald' : 'red'}>{row.interested?.status}</Badge>
    },
    {
      key: 'candidateClass',
      label: 'Class',
      render: (row) => <Badge tone={candidateClassTone[row.candidateClass]}>{row.candidateClass}</Badge>
    },
    {
      key: 'callStatus',
      label: 'Status',
      render: (row) => <Badge tone={callStatusTone[row.callStatus]}>{row.callStatus}</Badge>
    },
    {
      key: 'latestCall',
      label: 'Last Called',
      render: (row) => formatDateTime(row.latestCall?.calledAt)
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-brand-blue-dark">{view === 'reports' ? 'Reports' : 'All Candidates'}</h1>
          <p className="mt-2 text-sm text-slate-600">Filter CRM activity by employee, date, class, and status.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={view === 'reports' ? 'crm-button-primary' : 'crm-button-secondary'}
            onClick={() => setView('reports')}
          >
            Reports
          </button>
          <button
            type="button"
            className={view === 'candidates' ? 'crm-button-primary' : 'crm-button-secondary'}
            onClick={() => setView('candidates')}
          >
            Candidates
          </button>
        </div>
      </div>

      <form className="rounded-md border border-line bg-white p-4 shadow-sm" onSubmit={applyFilters}>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <label className="block">
            <span className="crm-label">Employee</span>
            <select className="crm-input mt-1" value={filters.employeeId} onChange={(e) => updateFilter('employeeId', e.target.value)}>
              <option value="">All</option>
              {employees.map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="crm-label">Class</span>
            <select
              className="crm-input mt-1"
              value={filters.candidateClass}
              onChange={(e) => updateFilter('candidateClass', e.target.value)}
            >
              <option value="">All</option>
              <option value="1st">1st</option>
              <option value="2nd">2nd</option>
              <option value="3rd">3rd</option>
            </select>
          </label>
          <label className="block">
            <span className="crm-label">Status</span>
            <select className="crm-input mt-1" value={filters.callStatus} onChange={(e) => updateFilter('callStatus', e.target.value)}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="called">Called</option>
              <option value="followup">Follow-up</option>
              <option value="converted">Converted</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="block">
            <span className="crm-label">Interested</span>
            <select className="crm-input mt-1" value={filters.interested} onChange={(e) => updateFilter('interested', e.target.value)}>
              <option value="">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="block">
            <span className="crm-label">From</span>
            <input className="crm-input mt-1" type="date" value={filters.startDate} onChange={(e) => updateFilter('startDate', e.target.value)} />
          </label>
          <label className="block">
            <span className="crm-label">To</span>
            <input className="crm-input mt-1" type="date" value={filters.endDate} onChange={(e) => updateFilter('endDate', e.target.value)} />
          </label>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            className="crm-input"
            placeholder="Search name, mobile, job"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
          <div className="flex gap-2">
            <button type="submit" className="crm-button-primary">
              Apply
            </button>
            <button type="button" className="crm-button-secondary" onClick={resetFilters}>
              Reset
            </button>
            <button type="button" className="crm-button-secondary" onClick={exportCsv}>
              Export CSV
            </button>
          </div>
        </div>
      </form>

      {view === 'reports' && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Stat label="Total Candidates" value={reports?.candidates?.total} />
          <Stat label="Converted" value={reports?.candidates?.converted} />
          <Stat label="Pending" value={reports?.candidates?.pending} />
          <Stat label="Follow-ups" value={reports?.candidates?.followup} />
          <Stat label="Today's Calls" value={reports?.calls?.today} />
        </section>
      )}

      {loading ? (
        <div className="rounded-lg border border-line bg-white p-6 text-slate-600">Loading CRM records...</div>
      ) : (
        <Table columns={columns} rows={candidates} emptyMessage="No CRM candidates found" />
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button className="crm-button-secondary" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span className="text-sm font-semibold text-slate-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            className="crm-button-secondary"
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default AdminReports
