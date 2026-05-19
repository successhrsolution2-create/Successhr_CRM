import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Badge from '../../components/ui/Badge.jsx'
import Table from '../../components/ui/Table.jsx'
import { fetchMyCandidates } from '../../store/candidateSlice.js'
import { callStatusTone, candidateClassTone, formatDateTime } from '../../utils/helpers.js'

const defaultFilters = {
  search: '',
  interested: '',
  candidateClass: '',
  callStatus: ''
}

const excelFileExtensions = ['.xlsx', '.xls']
const excelMimeTypes = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
]

const CandidateList = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items, pagination, status } = useSelector((state) => state.candidates)
  const importInputRef = useRef(null)
  const [filters, setFilters] = useState(defaultFilters)
  const [activeFilters, setActiveFilters] = useState(defaultFilters)
  const [page, setPage] = useState(1)
  const [importFileName, setImportFileName] = useState('')

  useEffect(() => {
    dispatch(fetchMyCandidates({ ...activeFilters, page, limit: 20 }))
  }, [activeFilters, dispatch, page])

  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }))

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

  const handleImportFile = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    const fileName = file.name.toLowerCase()
    const hasExcelExtension = excelFileExtensions.some((extension) => fileName.endsWith(extension))
    const hasExcelMimeType = !file.type || excelMimeTypes.includes(file.type)

    if (!hasExcelExtension || !hasExcelMimeType) {
      setImportFileName('')
      toast.error('Please select only an Excel file (.xlsx or .xls)')
      return
    }

    setImportFileName(file.name)
    toast.success(`Excel file selected: ${file.name}`)
  }

  const columns = [
    { key: 'candidateName', label: 'Name' },
    { key: 'mobileNumber', label: 'Mobile' },
    { key: 'jobProfile', label: 'Job Profile' },
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
      key: 'lastCalledAt',
      label: 'Last Called',
      render: (row) => formatDateTime(row.latestCall?.calledAt)
    }
  ]

  return (
    <div className="space-y-6">
      <div className="border-b border-line pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-brand-blue-dark">Candidates</h1>
            <p className="mt-2 text-sm text-slate-600">Only records assigned to your CRM account are shown.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="crm-button-secondary" onClick={() => importInputRef.current?.click()}>
              Import Excel
            </button>
            <input
              ref={importInputRef}
              type="file"
              className="sr-only"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleImportFile}
            />
            <button type="button" className="crm-button-primary" onClick={() => navigate('/employee/candidates/new')}>
              Add Candidate
            </button>
          </div>
        </div>
        {importFileName ? (
          <p className="mt-3 text-sm font-medium text-slate-600">Selected Excel file: {importFileName}</p>
        ) : null}
      </div>

      <form className="rounded-md border border-line bg-white p-3 shadow-sm" onSubmit={applyFilters}>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            className="crm-input"
            placeholder="Search name or mobile"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
          <select className="crm-input" value={filters.interested} onChange={(e) => updateFilter('interested', e.target.value)}>
            <option value="">Interested</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
          <select
            className="crm-input"
            value={filters.candidateClass}
            onChange={(e) => updateFilter('candidateClass', e.target.value)}
          >
            <option value="">Class</option>
            <option value="1st">1st</option>
            <option value="2nd">2nd</option>
            <option value="3rd">3rd</option>
          </select>
          <select className="crm-input" value={filters.callStatus} onChange={(e) => updateFilter('callStatus', e.target.value)}>
            <option value="">Status</option>
            <option value="pending">Pending</option>
            <option value="called">Called</option>
            <option value="followup">Follow-up</option>
            <option value="converted">Converted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="submit" className="crm-button-primary">
            Apply
          </button>
          <button type="button" className="crm-button-secondary" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </form>

      {status === 'loading' ? (
        <div className="rounded-md border border-line bg-white p-6 text-slate-600">Loading candidates...</div>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-lg font-bold text-brand-blue-dark">
            <h2>Active Candidates</h2>
          </div>
          <Table
            columns={columns}
            rows={items}
            emptyMessage="No candidates found"
            onRowClick={(row) => navigate(`/employee/candidates/${row._id}`)}
          />
        </section>
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

export default CandidateList
