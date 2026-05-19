import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useNavigate, useParams } from 'react-router-dom'
import * as yup from 'yup'
import api from '../../api/axiosInstance.js'
import Badge from '../../components/ui/Badge.jsx'
import Table from '../../components/ui/Table.jsx'
import { callStatusTone, formatDateTime, getErrorMessage } from '../../utils/helpers.js'

const defaultValues = {
  candidateName: '',
  mobileNumber: '',
  education: '',
  jobNo: '',
  jobProfile: '',
  interested: {
    status: 'yes',
    reason: ''
  },
  availabilityForInterview: '',
  interviewTime: '',
  overallCallingRemark: '',
  candidateClass: '1st',
  registrationInfo: 'RC',
  callStatus: 'pending'
}

const candidateSchema = yup.object({
  candidateName: yup.string().trim().min(2, 'Name must be at least 2 characters').required('Candidate name is required'),
  mobileNumber: yup
    .string()
    .trim()
    .matches(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits')
    .required('Mobile number is required'),
  education: yup.string().trim().required('Education is required'),
  jobNo: yup.string().trim().required('Job no is required'),
  jobProfile: yup.string().trim().required('Job profile is required'),
  interested: yup.object({
    status: yup.string().oneOf(['yes', 'no']).required('Interested status is required'),
    reason: yup
      .string()
      .max(1000, 'Reason cannot exceed 1000 characters')
      .test('reason-required', 'Reason is required when interested is no', function requireReason(value) {
        return this.parent.status !== 'no' || Boolean(value?.trim())
      })
  }),
  availabilityForInterview: yup.string().trim().required('Availability is required'),
  interviewTime: yup.string().trim().required('Interview time is required'),
  overallCallingRemark: yup.string().trim().required('Overall remark is required'),
  candidateClass: yup.string().oneOf(['1st', '2nd', '3rd']).required('Candidate class is required'),
  registrationInfo: yup.string().oneOf(['RC', 'WRC']).required('Registration info is required'),
  callStatus: yup
    .string()
    .oneOf(['pending', 'called', 'followup', 'converted', 'rejected'])
    .required('Call status is required')
})

const callLogSchema = yup.object({
  remark: yup.string().max(2000, 'Remark cannot exceed 2000 characters'),
  status: yup.string().oneOf(['answered', 'not_answered', 'busy', 'callback']).required('Call log status is required'),
  nextFollowup: yup.string()
})

const FieldError = ({ message }) => (message ? <span className="mt-1 block text-xs text-rose-600">{message}</span> : null)

const CandidateForm = ({ mode = 'create' }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = mode === 'edit'
  const [loading, setLoading] = useState(isEdit)
  const [callLogs, setCallLogs] = useState([])

  const {
    register,
    control,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(candidateSchema),
    defaultValues
  })

  const {
    register: registerLog,
    reset: resetLog,
    handleSubmit: handleSubmitLog,
    formState: { errors: logErrors, isSubmitting: isSubmittingLog }
  } = useForm({
    resolver: yupResolver(callLogSchema),
    defaultValues: {
      remark: '',
      status: 'answered',
      nextFollowup: ''
    }
  })

  const interestedStatus = useWatch({ control, name: 'interested.status' })

  const loadCallLogs = async () => {
    if (!id) return

    const response = await api.get(`/candidates/${id}/logs?limit=50`)
    setCallLogs(response.data.data?.callLogs || [])
  }

  const loadCandidate = async () => {
    if (!isEdit || !id) return

    try {
      setLoading(true)
      const response = await api.get(`/candidates/${id}`)
      const candidate = response.data.data?.candidate

      if (candidate) {
        reset({
          candidateName: candidate.candidateName || '',
          mobileNumber: candidate.mobileNumber || '',
          education: candidate.education || '',
          jobNo: candidate.jobNo || '',
          jobProfile: candidate.jobProfile || '',
          interested: {
            status: candidate.interested?.status || 'yes',
            reason: candidate.interested?.reason || ''
          },
          availabilityForInterview: candidate.availabilityForInterview || '',
          interviewTime: candidate.interviewTime || '',
          overallCallingRemark: candidate.overallCallingRemark || '',
          candidateClass: candidate.candidateClass || '1st',
          registrationInfo: candidate.registrationInfo || 'RC',
          callStatus: candidate.callStatus || 'pending'
        })
      }

      await loadCallLogs()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load candidate'))
      navigate('/employee/candidates', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCandidate()
  }, [id, isEdit])

  const normalizePayload = (values) => ({
    ...values,
    interested:
      values.interested.status === 'no'
        ? values.interested
        : {
            status: 'yes'
          }
  })

  const onSubmit = async (values) => {
    try {
      const payload = normalizePayload(values)
      const response = isEdit ? await api.put(`/candidates/${id}`, payload) : await api.post('/candidates', payload)
      const candidateId = response.data.data?.candidate?._id || id

      toast.success(isEdit ? 'Candidate updated' : 'Candidate created')
      navigate(`/employee/candidates/${candidateId}`, { replace: true })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save candidate'))
    }
  }

  const onSubmitLog = async (values) => {
    try {
      const payload = {
        remark: values.remark,
        status: values.status,
        ...(values.nextFollowup ? { nextFollowup: values.nextFollowup } : {})
      }

      await api.post(`/candidates/${id}/logs`, payload)
      toast.success('Call log added')
      resetLog({ remark: '', status: 'answered', nextFollowup: '' })
      await Promise.all([loadCallLogs(), loadCandidate()])
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add call log'))
    }
  }

  const callLogColumns = [
    {
      key: 'calledAt',
      label: 'Called At',
      render: (row) => formatDateTime(row.calledAt)
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge tone={row.status === 'answered' ? 'emerald' : row.status === 'callback' ? 'amber' : 'slate'}>{row.status}</Badge>
    },
    { key: 'remark', label: 'Remark', render: (row) => row.remark || '-' },
    { key: 'nextFollowup', label: 'Next Follow-up', render: (row) => formatDateTime(row.nextFollowup) }
  ]

  if (loading) {
    return <div className="rounded-md border border-line bg-white p-6 text-slate-600">Loading candidate...</div>
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-line pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-brand-blue-dark">{isEdit ? 'Edit Candidate' : 'Add Candidate'}</h1>
            <p className="mt-2 text-sm text-slate-600">Telecalling record form.</p>
          </div>
          <button type="button" className="crm-button-secondary" onClick={() => navigate('/employee/candidates')}>
            Back
          </button>
        </div>
      </div>

      <form className="rounded-md border border-line bg-white p-5 shadow-[inset_5px_0_0_#0B5BA7]" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className="crm-label">Candidate Name</span>
            <input className="crm-input mt-1" {...register('candidateName')} />
            <FieldError message={errors.candidateName?.message} />
          </label>

          <label className="block">
            <span className="crm-label">Mobile Number</span>
            <input className="crm-input mt-1" inputMode="numeric" maxLength={10} {...register('mobileNumber')} />
            <FieldError message={errors.mobileNumber?.message} />
          </label>

          <label className="block">
            <span className="crm-label">Education</span>
            <input className="crm-input mt-1" {...register('education')} />
            <FieldError message={errors.education?.message} />
          </label>

          <label className="block">
            <span className="crm-label">Job No</span>
            <input className="crm-input mt-1" {...register('jobNo')} />
            <FieldError message={errors.jobNo?.message} />
          </label>

          <label className="block">
            <span className="crm-label">Job Profile</span>
            <input className="crm-input mt-1" {...register('jobProfile')} />
            <FieldError message={errors.jobProfile?.message} />
          </label>

          <label className="block">
            <span className="crm-label">Interested</span>
            <select className="crm-input mt-1" {...register('interested.status')}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            <FieldError message={errors.interested?.status?.message} />
          </label>

          {interestedStatus === 'no' && (
            <label className="block md:col-span-2 xl:col-span-3">
              <span className="crm-label">Reason</span>
              <textarea className="crm-textarea mt-1" {...register('interested.reason')} />
              <FieldError message={errors.interested?.reason?.message} />
            </label>
          )}

          <label className="block">
            <span className="crm-label">Availability</span>
            <input className="crm-input mt-1" {...register('availabilityForInterview')} />
            <FieldError message={errors.availabilityForInterview?.message} />
          </label>

          <label className="block">
            <span className="crm-label">Interview Time</span>
            <input className="crm-input mt-1" {...register('interviewTime')} />
            <FieldError message={errors.interviewTime?.message} />
          </label>

          <label className="block">
            <span className="crm-label">Recruiter ID</span>
            <input className="crm-input mt-1" placeholder="Enter recruiter ID" />
          </label>

          <label className="block">
            <span className="crm-label">Candidate Class</span>
            <select className="crm-input mt-1" {...register('candidateClass')}>
              <option value="1st">1st</option>
              <option value="2nd">2nd</option>
              <option value="3rd">3rd</option>
            </select>
            <FieldError message={errors.candidateClass?.message} />
          </label>

          <label className="block">
            <span className="crm-label">Registration Info</span>
            <select className="crm-input mt-1" {...register('registrationInfo')}>
              <option value="RC">RC</option>
              <option value="WRC">WRC</option>
            </select>
            <FieldError message={errors.registrationInfo?.message} />
          </label>

          <label className="block">
            <span className="crm-label">Call Status</span>
            <select className="crm-input mt-1" {...register('callStatus')}>
              <option value="pending">Pending</option>
              <option value="called">Called</option>
              <option value="followup">Follow-up</option>
              <option value="converted">Converted</option>
              <option value="rejected">Rejected</option>
            </select>
            <FieldError message={errors.callStatus?.message} />
          </label>

          <label className="block md:col-span-2 xl:col-span-3">
            <span className="crm-label">Overall Remark</span>
            <textarea className="crm-textarea mt-1" {...register('overallCallingRemark')} />
            <FieldError message={errors.overallCallingRemark?.message} />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button className="crm-button-secondary" type="button" onClick={() => navigate('/employee/candidates')}>
            Cancel
          </button>
          <button className="crm-button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Candidate' : 'Create Candidate'}
          </button>
        </div>
      </form>

      {isEdit && (
        <section className="space-y-4 rounded-md border border-line bg-white p-5 shadow-[inset_5px_0_0_#0B5BA7]">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-brand-blue-dark">Call Logs</h2>
            <p className="text-sm text-slate-600">History for this candidate.</p>
          </div>

          <form className="grid gap-3 lg:grid-cols-[1fr_180px_220px_auto]" onSubmit={handleSubmitLog(onSubmitLog)}>
            <label className="block">
              <span className="crm-label">Remark</span>
              <input className="crm-input mt-1" {...registerLog('remark')} />
              <FieldError message={logErrors.remark?.message} />
            </label>
            <label className="block">
              <span className="crm-label">Status</span>
              <select className="crm-input mt-1" {...registerLog('status')}>
                <option value="answered">Answered</option>
                <option value="not_answered">Not Answered</option>
                <option value="busy">Busy</option>
                <option value="callback">Callback</option>
              </select>
              <FieldError message={logErrors.status?.message} />
            </label>
            <label className="block">
              <span className="crm-label">Next Follow-up</span>
              <input className="crm-input mt-1" type="datetime-local" {...registerLog('nextFollowup')} />
              <FieldError message={logErrors.nextFollowup?.message} />
            </label>
            <div className="flex items-end">
              <button className="crm-button-primary w-full" type="submit" disabled={isSubmittingLog}>
                {isSubmittingLog ? 'Adding...' : 'Add Log'}
              </button>
            </div>
          </form>

          <Table columns={callLogColumns} rows={callLogs} emptyMessage="No call logs found" />
        </section>
      )}
    </div>
  )
}

export default CandidateForm
