import { useAuth } from '../contexts/AuthContext.jsx';
import { ROLES } from '@arogyafirst/shared';

export default function useRole() {
  const { user } = useAuth();
  const role = user?.role;

  const isPatient = role === ROLES.PATIENT;
  const isHospital = role === ROLES.HOSPITAL;
  const isDoctor = role === ROLES.DOCTOR;
  const isLab = role === ROLES.LAB;
  const isPharmacy = role === ROLES.PHARMACY;
  const isAdmin = role === ROLES.ADMIN;

  const hasRole = (roles) => roles.includes(role);
  const hasAnyRole = (...roles) => roles.includes(role);
  const hasAllRoles = (...roles) => roles.every(r => r === role); // For future multi-role, but currently equivalent to hasAnyRole

  return {
    role,
    isPatient,
    isHospital,
    isDoctor,
    isLab,
    isPharmacy,
    isAdmin,
    hasRole,
    hasAnyRole,
    hasAllRoles,
  };
}