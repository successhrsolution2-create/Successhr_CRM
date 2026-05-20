import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../api/axiosInstance.js'
import Badge from '../../components/ui/Badge.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Table from '../../components/ui/Table.jsx'
import { fetchMyCandidates } from '../../store/candidateSlice.js'
import { callStatusTone, candidateClassTone, formatDateTime, formatDisplayText, getErrorMessage } from '../../utils/helpers.js'

const defaultFilters = {
  search: '',
  interested: '',
  candidateClass: '',
  callStatus: '',
  startDate: '',
  endDate: '',
  dateField: 'updatedAt',
  sortBy: 'updatedAt',
  sortOrder: 'desc'
}

const MAX_IMPORT_ROWS = 500
const PAGE_LIMIT = 20

const getTodayInputValue = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const crmImportHeaderMap = {
  candidatename: 'candidateName',
  candidate: 'candidateName',
  name: 'candidateName',
  fullname: 'candidateName',
  studentname: 'candidateName',
  applicantname: 'candidateName',
  applicant: 'candidateName',
  number: 'mobileNumber',
  mobile: 'mobileNumber',
  mobilenumber: 'mobileNumber',
  phone: 'mobileNumber',
  phonenumber: 'mobileNumber',
  contact: 'mobileNumber',
  contactnumber: 'mobileNumber',
  whatsapp: 'mobileNumber',
  whatsappnumber: 'mobileNumber',
  education: 'education',
  qualification: 'education',
  highesteducation: 'education',
  jobno: 'jobNo',
  jobnumber: 'jobNo',
  jobid: 'jobNo',
  jobcode: 'jobNo',
  jobprofile: 'jobProfile',
  currentjobprofile: 'jobProfile',
  currentdesignation: 'jobProfile',
  appliedfor: 'jobProfile',
  department: 'jobProfile',
  dept: 'jobProfile',
  jobrole: 'jobProfile',
  profile: 'jobProfile',
  position: 'jobProfile',
  designation: 'jobProfile',
  interested: 'interested',
  interestedstatus: 'interested',
  reason: 'interestedReason',
  interestedreason: 'interestedReason',
  notinterestedreason: 'interestedReason',
  availability: 'availabilityForInterview',
  availabilityforinterview: 'availabilityForInterview',
  interviewavailability: 'availabilityForInterview',
  interviewtime: 'interviewTime',
  time: 'interviewTime',
  remark: 'overallCallingRemark',
  remarks: 'overallCallingRemark',
  overallremark: 'overallCallingRemark',
  overallcallingremark: 'overallCallingRemark',
  callingremark: 'overallCallingRemark',
  class: 'candidateClass',
  candidateclass: 'candidateClass',
  registration: 'registrationInfo',
  registrationinfo: 'registrationInfo',
  reginfo: 'registrationInfo',
  status: 'callStatus',
  callstatus: 'callStatus'
}

const importText = (value, fallback = '-') => {
  const text = String(value ?? '').trim()
  return text || fallback
}

const normalizeImportHeader = (value) => String(value || '').trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '')

const importFieldFromHeader = (header) => {
  const normalized = normalizeImportHeader(header)
  if (!normalized) return null
  if (crmImportHeaderMap[normalized]) return crmImportHeaderMap[normalized]

  if (normalized.includes('mobile') || normalized.includes('phone') || normalized.includes('contact') || normalized === 'number') {
    return 'mobileNumber'
  }

  if (normalized === 'name' || normalized.includes('candidate') || normalized.includes('student') || normalized.includes('applicant')) {
    return 'candidateName'
  }

  if (normalized.includes('qualification') || normalized.includes('education')) return 'education'
  if (normalized.includes('job') && (normalized.includes('no') || normalized.includes('number') || normalized.includes('id') || normalized.includes('code'))) return 'jobNo'
  if (
    normalized.includes('jobprofile') ||
    normalized.includes('profile') ||
    normalized.includes('designation') ||
    normalized.includes('jobrole') ||
    normalized.includes('appliedfor') ||
    normalized.includes('department') ||
    normalized.includes('dept')
  ) {
    return 'jobProfile'
  }

  if (normalized.includes('interest')) return normalized.includes('reason') ? 'interestedReason' : 'interested'
  if (normalized.includes('reason')) return 'interestedReason'
  if (normalized.includes('availability')) return 'availabilityForInterview'
  if (normalized.includes('interview') && normalized.includes('time')) return 'interviewTime'
  if (normalized.includes('remark')) return 'overallCallingRemark'
  if (normalized.includes('class')) return 'candidateClass'
  if (normalized.includes('registration') || normalized.includes('reginfo')) return 'registrationInfo'
  if (normalized.includes('status')) return 'callStatus'

  return null
}

const normalizeImportText = (value) => String(value ?? '').trim()

const getIndexSearchNumber = (value) => {
  const search = String(value || '').trim()
  if (!/^[1-9]\d{0,3}$/.test(search)) return null

  return Number.parseInt(search, 10)
}

const getCandidateRequestParams = (filterSet, nextPage) => {
  const indexSearchNumber = getIndexSearchNumber(filterSet.search)

  if (indexSearchNumber) {
    return {
      ...filterSet,
      search: '',
      serialNumber: indexSearchNumber,
      page: 1,
      limit: 1
    }
  }

  return {
    ...filterSet,
    page: nextPage,
    limit: PAGE_LIMIT
  }
}

const normalizeMobile = (value) => normalizeImportText(value).replace(/\D/g, '')

const normalizeInterested = (value) => {
  if (!normalizeImportText(value)) return ''
  const normalized = normalizeImportHeader(value)
  if (['yes', 'y', 'true', '1', 'interested'].includes(normalized)) return 'yes'
  if (['no', 'n', 'false', '0', 'notinterested'].includes(normalized)) return 'no'
  return ''
}

const normalizeCandidateClass = (value) => {
  const normalized = normalizeImportText(value).toLowerCase()
  if (normalized.startsWith('2')) return '2nd'
  if (normalized.startsWith('3')) return '3rd'
  return '1st'
}

const normalizeRegistrationInfo = (value) => {
  const normalized = normalizeImportText(value).toUpperCase()
  return normalized === 'WRC' ? 'WRC' : 'RC'
}

const normalizeCallStatus = (value) => {
  const normalized = normalizeImportHeader(value)
  if (normalized.includes('follow')) return 'followup'
  if (normalized.includes('convert')) return 'converted'
  if (normalized.includes('reject')) return 'rejected'
  if (normalized.includes('called')) return 'called'
  return 'pending'
}

const columnIndexFromRef = (ref = '') => {
  const letters = String(ref).match(/^[A-Z]+/i)?.[0] || ''
  return letters.split('').reduce((sum, letter) => sum * 26 + letter.toUpperCase().charCodeAt(0) - 64, 0) - 1
}

const readUint16 = (view, offset) => view.getUint16(offset, true)
const readUint32 = (view, offset) => view.getUint32(offset, true)

const inflateRaw = async (data) => {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot read .xlsx files. Please use the latest Chrome or Edge.')
  }

  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

const unzipXlsxEntries = async (buffer) => {
  const view = new DataView(buffer)
  let eocdOffset = -1
  const minOffset = Math.max(0, buffer.byteLength - 66000)

  for (let offset = buffer.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (readUint32(view, offset) === 0x06054b50) {
      eocdOffset = offset
      break
    }
  }

  if (eocdOffset === -1) throw new Error('Could not read Excel file.')

  const entryCount = readUint16(view, eocdOffset + 10)
  let centralOffset = readUint32(view, eocdOffset + 16)
  const decoder = new TextDecoder('utf-8')
  const entries = {}

  for (let index = 0; index < entryCount; index += 1) {
    if (readUint32(view, centralOffset) !== 0x02014b50) break

    const compression = readUint16(view, centralOffset + 10)
    const compressedSize = readUint32(view, centralOffset + 20)
    const nameLength = readUint16(view, centralOffset + 28)
    const extraLength = readUint16(view, centralOffset + 30)
    const commentLength = readUint16(view, centralOffset + 32)
    const localOffset = readUint32(view, centralOffset + 42)
    const nameBytes = new Uint8Array(buffer, centralOffset + 46, nameLength)
    const name = decoder.decode(nameBytes)

    const localNameLength = readUint16(view, localOffset + 26)
    const localExtraLength = readUint16(view, localOffset + 28)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    const compressedData = new Uint8Array(buffer, dataStart, compressedSize)

    entries[name] = async () => {
      if (compression === 0) return compressedData
      if (compression === 8) return inflateRaw(compressedData)
      throw new Error('Unsupported Excel compression method.')
    }

    centralOffset += 46 + nameLength + extraLength + commentLength
  }

  return entries
}

const parseXml = (xmlText) => {
  const xml = new DOMParser().parseFromString(xmlText, 'application/xml')
  if (xml.querySelector('parsererror')) throw new Error('Could not read Excel XML.')
  return xml
}

const readXlsxText = async (entries, path) => {
  const readEntry = entries[path]
  if (!readEntry) return ''
  const bytes = await readEntry()
  return new TextDecoder('utf-8').decode(bytes)
}

const firstElementText = (element, tagName) => element.getElementsByTagName(tagName)[0]?.textContent || ''

const readSharedStrings = async (entries) => {
  const xmlText = await readXlsxText(entries, 'xl/sharedStrings.xml')
  if (!xmlText) return []

  return Array.from(parseXml(xmlText).getElementsByTagName('si')).map((item) =>
    Array.from(item.getElementsByTagName('t'))
      .map((node) => node.textContent || '')
      .join('')
  )
}

const firstWorksheetPath = async (entries) => {
  const workbookText = await readXlsxText(entries, 'xl/workbook.xml')
  const relsText = await readXlsxText(entries, 'xl/_rels/workbook.xml.rels')

  if (!workbookText || !relsText) return 'xl/worksheets/sheet1.xml'

  const workbook = parseXml(workbookText)
  const firstSheet = workbook.getElementsByTagName('sheet')[0]
  const relationId = firstSheet?.getAttribute('r:id')

  if (!relationId) return 'xl/worksheets/sheet1.xml'

  const relation = Array.from(parseXml(relsText).getElementsByTagName('Relationship')).find(
    (item) => item.getAttribute('Id') === relationId
  )
  const target = relation?.getAttribute('Target') || 'worksheets/sheet1.xml'
  return `xl/${target}`.replace('xl//', 'xl/')
}

const cellValue = (cell, sharedStrings) => {
  const type = cell.getAttribute('t')

  if (type === 's') {
    const index = Number(firstElementText(cell, 'v'))
    return sharedStrings[index] || ''
  }

  if (type === 'inlineStr') {
    return Array.from(cell.getElementsByTagName('t'))
      .map((node) => node.textContent || '')
      .join('')
  }

  if (type === 'b') return firstElementText(cell, 'v') === '1' ? 'yes' : 'no'
  return firstElementText(cell, 'v')
}

const readXlsxRows = async (file) => {
  const entries = await unzipXlsxEntries(await file.arrayBuffer())
  const sharedStrings = await readSharedStrings(entries)
  const sheetText = await readXlsxText(entries, await firstWorksheetPath(entries))

  if (!sheetText) throw new Error('Could not find the first worksheet.')

  const rows = Array.from(parseXml(sheetText).getElementsByTagName('row'))
  const parsedRows = rows
    .map((row) => {
      const cells = Array.from(row.getElementsByTagName('c'))
      const values = []
      cells.forEach((cell, fallbackIndex) => {
        const index = Math.max(columnIndexFromRef(cell.getAttribute('r')), fallbackIndex)
        values[index] = cellValue(cell, sharedStrings)
      })
      return {
        rowNumber: Number(row.getAttribute('r')) || 0,
        values
      }
    })
    .filter((row) => row.values.some((value) => normalizeImportText(value)))

  const headerRow = findImportHeaderRow(parsedRows)
  if (!headerRow) throw new Error('No matching Excel columns found.')

  return parsedRows.slice(headerRow.index + 1).map((row) => {
    const mapped = {}
    row.values.forEach((value, index) => {
      const field = headerRow.mappedHeaders[index]
      if (field && mapped[field] === undefined) mapped[field] = value
    })
    return { rowNumber: row.rowNumber, mapped }
  })
}

const findImportHeaderRow = (rows) => {
  let bestMatch = null

  rows.slice(0, 15).forEach((row, index) => {
    const mappedHeaders = row.values.map(importFieldFromHeader)
    const fields = new Set(mappedHeaders.filter(Boolean))
    const score =
      fields.size +
      (fields.has('candidateName') ? 3 : 0) +
      (fields.has('mobileNumber') ? 3 : 0) +
      (fields.has('jobProfile') ? 1 : 0)

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        index,
        mappedHeaders,
        score
      }
    }
  })

  return bestMatch?.score > 0 ? bestMatch : null
}

const buildImportPayload = (mapped) => {
  const interestedStatus = normalizeInterested(mapped.interested)
  const interestedReason = normalizeImportText(mapped.interestedReason)

  const payload = {
    candidateName: normalizeImportText(mapped.candidateName),
    mobileNumber: normalizeMobile(mapped.mobileNumber),
    education: normalizeImportText(mapped.education) || 'Not specified',
    jobNo: normalizeImportText(mapped.jobNo) || '-',
    jobProfile: normalizeImportText(mapped.jobProfile) || 'Not specified',
    availabilityForInterview: normalizeImportText(mapped.availabilityForInterview) || 'Not specified',
    interviewTime: normalizeImportText(mapped.interviewTime) || 'Not specified',
    overallCallingRemark: normalizeImportText(mapped.overallCallingRemark) || 'Imported from Excel',
    candidateClass: normalizeCandidateClass(mapped.candidateClass),
    registrationInfo: normalizeRegistrationInfo(mapped.registrationInfo),
    callStatus: normalizeCallStatus(mapped.callStatus)
  }

  if (interestedStatus) {
    payload.interested =
      interestedStatus === 'no'
        ? {
            status: 'no',
            reason: interestedReason || 'Imported from Excel'
          }
        : { status: 'yes' }
  }

  return payload
}

const buildImportPreview = async (file) => {
  const rows = await readXlsxRows(file)
  const seenMobiles = new Set()
  const previewRows = []
  const failedRows = []
  const skippedRows = []

  rows.forEach((row) => {
    const payload = buildImportPayload(row.mapped)
    const errors = []

    if (payload.candidateName.length < 2) errors.push('Candidate name is required')
    if (!/^[0-9]{10}$/.test(payload.mobileNumber)) errors.push('Mobile number must be exactly 10 digits')

    if (errors.length) {
      failedRows.push({ row: row.rowNumber, errors })
      return
    }

    if (seenMobiles.has(payload.mobileNumber)) {
      skippedRows.push({ row: row.rowNumber, reason: `Duplicate mobile in Excel: ${payload.mobileNumber}` })
      return
    }

    seenMobiles.add(payload.mobileNumber)
    previewRows.push({ rowNumber: row.rowNumber, payload })
  })

  return {
    fileName: file.name,
    totalRows: rows.length,
    importableCount: previewRows.length,
    previewRows,
    failedRows,
    skippedRows,
    failedCount: failedRows.length,
    skippedCount: skippedRows.length
  }
}

const checkImportPreview = async (preview) => {
  const rows = Array.isArray(preview.previewRows) ? preview.previewRows : []
  if (!rows.length) return preview

  const response = await api.post('/candidates/import/check', {
    rows: rows.map((row) => ({
      rowNumber: row.rowNumber,
      payload: row.payload
    }))
  })
  const result = response.data?.data || {}
  const serverSkippedRows = Array.isArray(result.skippedRows) ? result.skippedRows : []
  const serverFailedRows = Array.isArray(result.failedRows) ? result.failedRows : []
  const serverRestoreRows = Array.isArray(result.restoreRows) ? result.restoreRows : []
  const blockedRows = new Set([...serverSkippedRows, ...serverFailedRows].map((row) => row.row))
  const restoreByRow = new Map(serverRestoreRows.map((row) => [row.row, row]))
  const previewRows = rows
    .filter((row) => !blockedRows.has(row.rowNumber))
    .map((row) => (restoreByRow.has(row.rowNumber) ? { ...row, restoreInfo: restoreByRow.get(row.rowNumber) } : row))
  const skippedRows = [...(preview.skippedRows || []), ...serverSkippedRows]
  const failedRows = [...(preview.failedRows || []), ...serverFailedRows]

  return {
    ...preview,
    previewRows,
    importableCount: previewRows.length,
    restoreRows: serverRestoreRows,
    restoreCount: result.restoreCount || 0,
    skippedRows,
    failedRows,
    skippedCount: (preview.skippedCount || 0) + (result.skippedCount || 0),
    failedCount: (preview.failedCount || 0) + (result.failedCount || 0)
  }
}

const ImportPreviewDialog = ({ preview, confirming, onCancel, onConfirm, onRemoveRow }) => {
  if (!preview) return null

  const rows = Array.isArray(preview.previewRows) ? preview.previewRows : []
  const failedRows = Array.isArray(preview.failedRows) ? preview.failedRows : []
  const skippedRows = Array.isArray(preview.skippedRows) ? preview.skippedRows : []
  const restoreRows = Array.isArray(preview.restoreRows) ? preview.restoreRows : []
  const failedCount = preview.failedCount ?? failedRows.length
  const skippedCount = preview.skippedCount ?? skippedRows.length
  const restoreCount = preview.restoreCount ?? restoreRows.length
  const blockedRows = [
    ...skippedRows.map((row) => ({ ...row, type: 'Skipped', detail: row.reason || 'Not imported' })),
    ...failedRows.map((row) => ({ ...row, type: 'Issue', detail: (row.errors || []).join(', ') || 'Could not import row' }))
  ]
  const visibleBlockedRows = blockedRows.slice(0, 8)
  const hiddenBlockedRows = Math.max(failedCount + skippedCount - visibleBlockedRows.length, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-3 py-4">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="border-b border-line px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-ink">Import Preview</h2>
              <p className="mt-1 text-sm text-slate-600">Review Excel rows before adding them to CRM candidates.</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-400">{preview.fileName}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs font-semibold text-slate-600 sm:flex">
              <span className="rounded-md bg-slate-100 px-3 py-2">Total {preview.totalRows || 0}</span>
              <span className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-700">Ready {rows.length}</span>
              {restoreCount ? <span className="rounded-md bg-sky-50 px-3 py-2 text-sky-700">Restore {restoreCount}</span> : null}
              <span className="rounded-md bg-slate-100 px-3 py-2">Skipped {failedCount + skippedCount}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          <div className="overflow-hidden rounded-md border border-line">
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full table-fixed text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-[24%] px-3 py-3">Candidate</th>
                    <th className="w-[15%] px-3 py-3">Mobile</th>
                    <th className="w-[22%] px-3 py-3">Job Profile</th>
                    <th className="w-[11%] px-3 py-3">Class</th>
                    <th className="w-[12%] px-3 py-3">Status</th>
                    <th className="w-[16%] px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, index) => {
                    const payload = row.payload || {}
                    return (
                      <tr key={`${row.rowNumber}-${index}`} className="odd:bg-white even:bg-slate-50">
                        <td className="px-3 py-3">
                          <span className="block truncate font-semibold text-ink" title={importText(payload.candidateName)}>
                            {importText(payload.candidateName)}
                          </span>
                          <span className="mt-0.5 block text-xs font-semibold text-slate-400">Excel row {row.rowNumber}</span>
                          {row.restoreInfo ? (
                            <span className="mt-0.5 block text-xs font-semibold text-sky-600">Will restore deleted record</span>
                          ) : null}
                        </td>
                        <td className="truncate px-3 py-3 text-slate-700" title={importText(payload.mobileNumber)}>
                          {importText(payload.mobileNumber)}
                        </td>
                        <td className="truncate px-3 py-3 text-slate-700" title={importText(payload.jobProfile)}>
                          {importText(payload.jobProfile)}
                        </td>
                        <td className="px-3 py-3 text-slate-700">{importText(payload.candidateClass)}</td>
                        <td className="px-3 py-3 text-slate-700">{importText(payload.callStatus)}</td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            disabled={confirming}
                            onClick={() => onRemoveRow(index)}
                            className="inline-flex h-8 min-w-20 items-center justify-center rounded-md bg-rose-50 px-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                        No valid rows selected for import.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {visibleBlockedRows.length ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-900">Skipped before import</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {visibleBlockedRows.map((row, index) => (
                  <div key={`${row.row}-${row.mobileNumber || index}`} className="rounded-md bg-white px-3 py-2 text-sm text-amber-900">
                    <span className="font-semibold">Row {row.row || '-'}</span>
                    <span className="mx-1">-</span>
                    <span>{row.detail}</span>
                    {row.existingCandidateName ? <span className="text-amber-700"> ({row.existingCandidateName})</span> : null}
                    {row.assignedTo ? <span className="text-amber-700"> Assigned to {row.assignedTo}</span> : null}
                  </div>
                ))}
              </div>
              {hiddenBlockedRows ? <p className="mt-2 text-xs font-medium text-amber-800">{hiddenBlockedRows} more skipped rows.</p> : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" disabled={confirming} onClick={onCancel} className="crm-button-secondary">
            Cancel
          </button>
          <button type="button" disabled={confirming || rows.length === 0} onClick={onConfirm} className="crm-button-primary">
            {confirming ? 'Importing...' : `OK, Import ${rows.length} Record${rows.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

const DetailItem = ({ label, value }) => (
  <div className="rounded-md border border-line bg-white px-3 py-2">
    <p className="crm-label">{label}</p>
    <p className="mt-1 text-sm font-medium text-ink">{formatDisplayText(value, '-')}</p>
  </div>
)

const CandidateViewModal = ({ candidate, onClose, onUpdate, onDelete, deleting }) => (
  <Modal open={Boolean(candidate)} title="Candidate Details" size="lg" onClose={onClose}>
    {candidate ? (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <DetailItem label="Name" value={candidate.candidateName} />
          <DetailItem label="Mobile" value={candidate.mobileNumber} />
          <DetailItem label="Job Profile" value={candidate.jobProfile} />
          <DetailItem label="Education" value={candidate.education} />
          <DetailItem label="Job No" value={candidate.jobNo} />
          <DetailItem label="Interested" value={candidate.interested?.status} />
          <DetailItem label="Class" value={candidate.candidateClass} />
          <DetailItem label="Status" value={candidate.callStatus} />
          <DetailItem label="Registration" value={candidate.registrationInfo} />
          <DetailItem label="Availability" value={candidate.availabilityForInterview} />
          <DetailItem label="Interview Time" value={candidate.interviewTime} />
          <DetailItem label="Last Update" value={formatDateTime(candidate.updatedAt)} />
        </div>
        <DetailItem label="Overall Remark" value={candidate.overallCallingRemark} />
        {candidate.interested?.reason ? <DetailItem label="Interested Reason" value={candidate.interested.reason} /> : null}
        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <button type="button" className="crm-button-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="crm-button-secondary" onClick={() => onUpdate(candidate)}>
            Update
          </button>
          <button type="button" className="crm-button-danger" disabled={deleting} onClick={() => onDelete(candidate)}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    ) : null}
  </Modal>
)

const DeleteConfirmModal = ({ request, deleting, onCancel, onConfirm }) => {
  if (!request) return null

  const isBulk = request.type === 'bulk'
  const count = isBulk ? request.ids.length : 1
  const title = isBulk ? 'Delete Selected Candidates' : 'Delete Candidate'
  const description = isBulk
    ? `${count} selected candidate${count === 1 ? '' : 's'} will be removed from your active CRM list.`
    : `${request.candidate?.candidateName || 'This candidate'} will be removed from your active CRM list.`

  return (
    <Modal open={Boolean(request)} title={title} onClose={deleting ? undefined : onCancel}>
      <div className="space-y-5">
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-semibold text-rose-800">{description}</p>
          <p className="mt-1 text-sm text-rose-700">Please review before continuing.</p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="crm-button-secondary" disabled={deleting} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="crm-button-danger" disabled={deleting} onClick={onConfirm}>
            {deleting ? 'Deleting...' : `Delete ${count === 1 ? 'Candidate' : `${count} Candidates`}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

const ImportResultDialog = ({ result, onClose }) => {
  if (!result) return null

  const skippedRows = Array.isArray(result.skippedRows) ? result.skippedRows : []
  const failedRows = Array.isArray(result.failedRows) ? result.failedRows : []
  const detailRows = [
    ...skippedRows.map((row) => ({ ...row, type: 'Skipped', detail: row.reason || 'Not imported' })),
    ...failedRows.map((row) => ({ ...row, type: 'Issue', detail: (row.errors || []).join(', ') || 'Could not import row' }))
  ]
  const hiddenDetails = Math.max((result.skippedCount || 0) + (result.failedCount || 0) - detailRows.length, 0)

  return (
    <Modal open={Boolean(result)} title="Import Result" size="lg" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-2 text-sm font-semibold sm:grid-cols-4">
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-700">Imported {result.createdCount || 0}</div>
          {result.restoredCount ? (
            <div className="rounded-md bg-sky-50 px-3 py-2 text-sky-700">Restored {result.restoredCount || 0}</div>
          ) : null}
          <div className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">Skipped {result.skippedCount || 0}</div>
          <div className="rounded-md bg-rose-50 px-3 py-2 text-rose-700">Issues {result.failedCount || 0}</div>
        </div>

        {result.createdCount ? (
          <p className="text-sm text-slate-600">{result.message || 'Import completed.'}</p>
        ) : (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            No new candidate was added. Check the rows below for the exact reason.
          </p>
        )}

        {detailRows.length ? (
          <div className="overflow-hidden rounded-md border border-line">
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Row</th>
                    <th className="px-3 py-3">Mobile</th>
                    <th className="px-3 py-3">Result</th>
                    <th className="px-3 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detailRows.map((row, index) => (
                    <tr key={`${row.row}-${row.mobileNumber || index}`}>
                      <td className="px-3 py-3 font-semibold text-slate-700">{row.row || '-'}</td>
                      <td className="px-3 py-3 text-slate-700">{row.mobileNumber || '-'}</td>
                      <td className="px-3 py-3 text-slate-700">{row.type}</td>
                      <td className="px-3 py-3 text-slate-700">
                        <span>{row.detail}</span>
                        {row.existingCandidateName ? (
                          <span className="ml-1 text-slate-500">({row.existingCandidateName})</span>
                        ) : null}
                        {row.assignedTo ? <span className="ml-1 text-slate-500">Assigned to {row.assignedTo}</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {hiddenDetails ? <p className="text-xs font-medium text-slate-500">{hiddenDetails} more rows were not shown.</p> : null}

        <div className="flex justify-end">
          <button type="button" className="crm-button-primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </Modal>
  )
}

const CandidateList = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items, pagination, status } = useSelector((state) => state.candidates)
  const importInputRef = useRef(null)
  const [filters, setFilters] = useState(defaultFilters)
  const [activeFilters, setActiveFilters] = useState(defaultFilters)
  const [page, setPage] = useState(1)
  const [importing, setImporting] = useState(false)
  const [confirmingImport, setConfirmingImport] = useState(false)
  const [importPreview, setImportPreview] = useState(null)
  const [viewCandidate, setViewCandidate] = useState(null)
  const [deletingId, setDeletingId] = useState('')
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([])
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [deleteRequest, setDeleteRequest] = useState(null)
  const [importResult, setImportResult] = useState(null)

  useEffect(() => {
    dispatch(fetchMyCandidates(getCandidateRequestParams(activeFilters, page)))
  }, [activeFilters, dispatch, page])

  useEffect(() => {
    const visibleIds = new Set(items.map((candidate) => candidate._id).filter(Boolean))
    setSelectedCandidateIds((current) => current.filter((id) => visibleIds.has(id)))
  }, [items])

  const visibleCandidateIds = items.map((candidate) => candidate._id).filter(Boolean)
  const selectedVisibleCandidateIds = selectedCandidateIds.filter((id) => visibleCandidateIds.includes(id))
  const allVisibleCandidatesSelected =
    visibleCandidateIds.length > 0 && selectedVisibleCandidateIds.length === visibleCandidateIds.length

  const updateFilter = (field, value) => {
    const nextFilters = { ...filters, [field]: value }
    setFilters(nextFilters)
    setActiveFilters(nextFilters)
    setPage(1)
  }

  const resetFilters = () => {
    setFilters(defaultFilters)
    setActiveFilters(defaultFilters)
    setPage(1)
  }

  const showTodayUpdates = () => {
    const today = getTodayInputValue()
    const nextFilters = {
      ...filters,
      startDate: today,
      endDate: today,
      dateField: 'updatedAt',
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    }

    setFilters(nextFilters)
    setActiveFilters(nextFilters)
    setPage(1)
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Please select a .xlsx Excel file')
      return
    }

    setImporting(true)

    try {
      const preview = await checkImportPreview(await buildImportPreview(file))
      setImportPreview(preview)

      if (preview.importableCount) {
        toast.success(`${preview.importableCount} row${preview.importableCount === 1 ? '' : 's'} ready to review`)
      } else {
        toast.error('No new rows ready for import')
      }
    } catch (error) {
      toast.error(error.message || 'Could not read Excel file')
    } finally {
      setImporting(false)
    }
  }

  const removeImportPreviewRow = (indexToRemove) => {
    setImportPreview((current) => {
      if (!current) return current
      const rows = Array.isArray(current.previewRows) ? current.previewRows : []
      return {
        ...current,
        previewRows: rows.filter((_row, index) => index !== indexToRemove)
      }
    })
  }

  const cancelImportPreview = () => {
    if (confirmingImport) return
    setImportPreview(null)
  }

  const confirmImportPreview = async () => {
    const rows = Array.isArray(importPreview?.previewRows) ? importPreview.previewRows : []

    if (!rows.length) {
      toast.error('No rows selected for import')
      return
    }

    if (rows.length > MAX_IMPORT_ROWS) {
      toast.error(`Please import up to ${MAX_IMPORT_ROWS} records at a time`)
      return
    }

    setConfirmingImport(true)

    try {
      const response = await api.post('/candidates/import/bulk', {
        rows: rows.map((row) => ({
          rowNumber: row.rowNumber,
          payload: row.payload
        }))
      })
      const result = response.data?.data || {}
      const createdCount = result.createdCount || 0
      const restoredCount = result.restoredCount || 0
      const skippedCount = result.skippedCount || 0
      const failedCount = result.failedCount || 0
      const nextImportResult = {
        ...result,
        createdCount,
        restoredCount,
        skippedCount,
        failedCount,
        message: response.data?.message
      }

      setImportPreview(null)
      setImportResult(nextImportResult)
      setPage(1)
      await dispatch(fetchMyCandidates(getCandidateRequestParams(activeFilters, 1)))

      if (createdCount) {
        toast.success(`${createdCount} imported${restoredCount ? `, ${restoredCount} restored` : ''}, ${skippedCount} skipped`)
      } else if (skippedCount || failedCount) {
        toast.error(`No new candidates imported. ${skippedCount} skipped, ${failedCount} issues.`)
      } else {
        toast.error(response.data?.message || 'No candidates imported')
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not import selected rows'))
    } finally {
      setConfirmingImport(false)
    }
  }

  const refreshCandidates = async (nextPage = page) => {
    await dispatch(fetchMyCandidates(getCandidateRequestParams(activeFilters, nextPage)))
  }

  const toggleCandidateSelection = (candidateId, checked) => {
    if (!candidateId) return

    setSelectedCandidateIds((current) => {
      if (checked) return current.includes(candidateId) ? current : [...current, candidateId]
      return current.filter((id) => id !== candidateId)
    })
  }

  const toggleVisibleCandidateSelection = (checked) => {
    setSelectedCandidateIds(checked ? visibleCandidateIds : [])
  }

  const updateCandidate = (candidate) => {
    if (!candidate?._id) return
    navigate(`/employee/candidates/${candidate._id}`)
  }

  const requestDeleteCandidate = (candidate) => {
    if (!candidate?._id || deletingId || bulkDeleting) return
    setDeleteRequest({ type: 'single', candidate })
  }

  const confirmSingleDelete = async (candidate) => {
    try {
      setDeletingId(candidate._id)
      await api.delete(`/candidates/${candidate._id}`)
      toast.success('Candidate deleted')
      setSelectedCandidateIds((current) => current.filter((id) => id !== candidate._id))
      setViewCandidate(null)
      await refreshCandidates(1)
      setPage(1)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete candidate'))
    } finally {
      setDeletingId('')
    }
  }

  const requestDeleteSelectedCandidates = () => {
    const ids = selectedVisibleCandidateIds

    if (!ids.length) {
      toast.error('Select candidates to delete')
      return
    }

    if (bulkDeleting || deletingId) return
    setDeleteRequest({ type: 'bulk', ids })
  }

  const confirmBulkDelete = async (ids) => {
    try {
      setBulkDeleting(true)
      const response = await api.delete('/candidates/bulk', { data: { ids } })
      const deletedCount = response.data?.data?.deletedCount || 0

      if (deletedCount) {
        toast.success(`${deletedCount} candidate${deletedCount === 1 ? '' : 's'} deleted`)
      } else {
        toast.error(response.data?.message || 'No candidates deleted')
      }

      setSelectedCandidateIds([])
      if (viewCandidate?._id && ids.includes(viewCandidate._id)) {
        setViewCandidate(null)
      }

      const nextPage = ids.length >= visibleCandidateIds.length && page > 1 ? page - 1 : page
      setPage(nextPage)
      await refreshCandidates(nextPage)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete selected candidates'))
    } finally {
      setBulkDeleting(false)
    }
  }

  const cancelDeleteRequest = () => {
    if (deletingId || bulkDeleting) return
    setDeleteRequest(null)
  }

  const confirmDeleteRequest = async () => {
    const request = deleteRequest
    if (!request) return

    try {
      if (request.type === 'bulk') {
        await confirmBulkDelete(request.ids)
      } else {
        await confirmSingleDelete(request.candidate)
      }
    } finally {
      setDeleteRequest(null)
    }
  }

  const serialStart = ((pagination?.page || page) - 1) * (pagination?.limit || PAGE_LIMIT)

  const columns = [
    {
      key: 'select',
      headerClassName: 'w-14 text-center',
      cellClassName: 'w-14 text-center',
      label: (
        <input
          type="checkbox"
          aria-label="Select all visible candidates"
          checked={allVisibleCandidatesSelected}
          disabled={!visibleCandidateIds.length || bulkDeleting}
          onChange={(event) => toggleVisibleCandidateSelection(event.target.checked)}
          className="h-4 w-4 rounded border-line text-brand-blue focus:ring-brand-blue"
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          aria-label={`Select ${row.candidateName || 'candidate'}`}
          checked={selectedCandidateIds.includes(row._id)}
          disabled={bulkDeleting}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => toggleCandidateSelection(row._id, event.target.checked)}
          className="h-4 w-4 rounded border-line text-brand-blue focus:ring-brand-blue"
        />
      )
    },
    {
      key: 'serialNumber',
      label: 'No.',
      headerClassName: 'w-14 text-center',
      cellClassName: 'w-14 text-center font-semibold text-slate-500',
      render: (row, rowIndex) => row.serialNumber || serialStart + rowIndex + 1
    },
    { key: 'candidateName', label: 'Name' },
    { key: 'mobileNumber', label: 'Mobile' },
    { key: 'jobProfile', label: 'Job Profile' },
    {
      key: 'interested',
      label: 'Interested',
      render: (row) =>
        row.interested?.status ? (
          <Badge tone={row.interested.status === 'yes' ? 'emerald' : 'red'}>{row.interested.status}</Badge>
        ) : (
          ''
        )
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
      key: 'lastUpdatedAt',
      label: 'Last Update',
      render: (row) => formatDateTime(row.updatedAt)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="h-8 rounded-md border border-line bg-white px-3 text-xs font-semibold text-brand-blue-dark transition hover:border-brand-blue hover:bg-brand-blue-soft"
            onClick={(event) => {
              event.stopPropagation()
              setViewCandidate(row)
            }}
          >
            View
          </button>
          <button
            type="button"
            className="h-8 rounded-md border border-line bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-brand-blue hover:bg-brand-blue-soft"
            onClick={(event) => {
              event.stopPropagation()
              updateCandidate(row)
            }}
          >
            Update
          </button>
          <button
            type="button"
            className="h-8 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={deletingId === row._id || bulkDeleting}
            onClick={(event) => {
              event.stopPropagation()
              requestDeleteCandidate(row)
            }}
          >
            {deletingId === row._id ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )
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
            <button type="button" className="crm-button-secondary" disabled={importing} onClick={() => importInputRef.current?.click()}>
              {importing ? 'Scanning...' : 'Import Excel'}
            </button>
            <input
              ref={importInputRef}
              type="file"
              className="sr-only"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleImportFile}
            />
            <button type="button" className="crm-button-primary" onClick={() => navigate('/employee/candidates/new')}>
              Add Candidate
            </button>
          </div>
        </div>
      </div>

      <form className="rounded-md border border-line bg-white p-3 shadow-sm" onSubmit={(event) => event.preventDefault()}>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            className="crm-input"
            placeholder="Search name, mobile, or No."
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
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className="crm-input h-9 w-full sm:w-44"
            type="date"
            aria-label="From update date"
            title="From update date"
            value={filters.startDate}
            onChange={(e) => updateFilter('startDate', e.target.value)}
          />
          <input
            className="crm-input h-9 w-full sm:w-44"
            type="date"
            aria-label="To update date"
            title="To update date"
            value={filters.endDate}
            onChange={(e) => updateFilter('endDate', e.target.value)}
          />
          <button type="button" className="crm-button-primary h-9 px-3 whitespace-nowrap" onClick={showTodayUpdates}>
            Today
          </button>
          <button type="button" className="crm-button-secondary h-9 px-3" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </form>

      {status === 'loading' ? (
        <div className="rounded-md border border-line bg-white p-6 text-slate-600">Loading candidates...</div>
      ) : (
        <section className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-lg font-bold text-brand-blue-dark">
              <h2>Active Candidates</h2>
            </div>
            {selectedVisibleCandidateIds.length ? (
              <button type="button" className="crm-button-danger" disabled={bulkDeleting} onClick={requestDeleteSelectedCandidates}>
                {bulkDeleting
                  ? 'Deleting...'
                  : `Delete Selected (${selectedVisibleCandidateIds.length})`}
              </button>
            ) : null}
          </div>
          <Table
            columns={columns}
            rows={items}
            emptyMessage="No candidates found"
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

      <ImportPreviewDialog
        preview={importPreview}
        confirming={confirmingImport}
        onCancel={cancelImportPreview}
        onConfirm={confirmImportPreview}
        onRemoveRow={removeImportPreviewRow}
      />
      <CandidateViewModal
        candidate={viewCandidate}
        deleting={Boolean(deletingId) || bulkDeleting}
        onClose={() => setViewCandidate(null)}
        onUpdate={updateCandidate}
        onDelete={requestDeleteCandidate}
      />
      <DeleteConfirmModal
        request={deleteRequest}
        deleting={Boolean(deletingId) || bulkDeleting}
        onCancel={cancelDeleteRequest}
        onConfirm={confirmDeleteRequest}
      />
      <ImportResultDialog result={importResult} onClose={() => setImportResult(null)} />
    </div>
  )
}

export default CandidateList
