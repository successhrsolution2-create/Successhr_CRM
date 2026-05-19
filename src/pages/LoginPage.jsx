import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import * as yup from 'yup'
import { login } from '../store/authSlice.js'
import { redirectPathForRole } from '../utils/helpers.js'

const schema = yup.object({
  email: yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required')
})

const LoginPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { accessToken, role, status, error } = useSelector((state) => state.auth)
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { email: '', password: '' }
  })

  useEffect(() => {
    if (accessToken && role) {
      navigate(location.state?.from?.pathname || redirectPathForRole(role), { replace: true })
    }
  }, [accessToken, location.state, navigate, role])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  const onSubmit = async (values) => {
    const result = await dispatch(login(values))

    if (login.fulfilled.match(result)) {
      toast.success('Login successful')
      navigate(redirectPathForRole(result.payload.user?.role), { replace: true })
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7fafc] px-4 py-10">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-line bg-white shadow-soft md:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col justify-between border-r border-line bg-white px-8 py-10 text-ink">
          <div>
            <div className="mb-8 rounded-md border border-line bg-white p-4">
              <img src="/success-logo.svg" alt="Success HR Solutions" className="h-auto w-full object-contain" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-normal text-brand-blue">Telecalling CRM</p>
            <h1 className="mt-3 text-3xl font-bold text-brand-blue-dark">Candidate Calling Workspace</h1>
          </div>
          <div className="mt-10 grid gap-3 text-sm text-slate-700">
            <div className="rounded-md border border-line bg-brand-blue-soft p-3">Super admin employee control</div>
            <div className="rounded-md border border-line bg-brand-orange-soft p-3">Employee-owned candidate records</div>
            <div className="rounded-md border border-line bg-white p-3">Call logs with follow-up tracking</div>
          </div>
        </div>
        <form className="px-6 py-10 sm:px-10" onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-normal text-slate-500">Sign in</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">CRM Login</h2>
          </div>

          <div className="space-y-5">
            <label className="block">
              <span className="crm-label">Email</span>
              <input className="crm-input mt-1" type="email" autoComplete="email" {...register('email')} />
              {errors.email && <span className="mt-1 block text-xs text-rose-600">{errors.email.message}</span>}
            </label>

            <label className="block">
              <span className="crm-label">Password</span>
              <input
                className="crm-input mt-1"
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && <span className="mt-1 block text-xs text-rose-600">{errors.password.message}</span>}
            </label>
          </div>

          <button className="crm-button-primary mt-7 w-full" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default LoginPage
