import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { redirectPathForRole } from '../utils/helpers.js'

const RoleGuard = ({ allowedRoles = [] }) => {
  const { role } = useSelector((state) => state.auth)

  if (!allowedRoles.includes(role)) {
    return <Navigate to={redirectPathForRole(role)} replace />
  }

  return <Outlet />
}

export default RoleGuard
