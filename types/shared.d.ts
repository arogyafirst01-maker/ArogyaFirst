/**
 * Type declarations for @arogyafirst/shared package
 * 
 * This file provides TypeScript definitions for the shared package
 * to eliminate "implicitly has 'any' type" errors in IDE and TypeScript tooling.
 * 
 * The shared package is written in JavaScript but used across API and Web apps.
 * These declarations allow TypeScript to recognize the module imports.
 */

declare module '@arogyafirst/shared' {
  // Constants
  export const ROLES: {
    PATIENT: string;
    HOSPITAL: string;
    DOCTOR: string;
    LAB: string;
    PHARMACY: string;
    ADMIN: string;
  };

  export const BOOKING_STATUS: {
    CONFIRMED: string;
    COMPLETED: string;
    CANCELLED: string;
    NO_SHOW: string;
  };

  export const PAYMENT_STATUS: {
    PENDING: string;
    SUCCESS: string;
    FAILED: string;
    REFUNDED: string;
  };

  export const REFUND_STATUS: {
    PENDING: string;
    PROCESSED: string;
    FAILED: string;
  };

  export const BOOKING_TYPES: {
    OPD: string;
    IPD: string;
    LAB: string;
  };

  export const PAYMENT_METHODS: {
    CASH: string;
    ONLINE: string;
    MANUAL: string;
  };

  export const VERIFICATION_STATUS: {
    PENDING: string;
    APPROVED: string;
    REJECTED: string;
  };

  export const DOCUMENT_TYPES: {
    PRESCRIPTION: string;
    LAB_REPORT: string;
    IMAGING: string;
    DISCHARGE_SUMMARY: string;
    OTHER: string;
  };

  export const DOCUMENT_UPLOAD_SOURCE: {
    PATIENT: string;
    PROVIDER: string;
  };

  // Utility functions
  export function generatePatientId(phone: string): string;
  export function generateHospitalId(): string;
  export function generateDoctorId(hospitalId?: string): string;
  export function generateLabId(): string;
  export function generatePharmacyId(): string;
  export function generateBookingId(): string;
  export function generateDocumentId(): string;
  export function normalizeEmail(email: string): string;
  export function generateReceiptId(prefix: string, entityId: string): string;
}

declare module '@arogyafirst/shared/utils' {
  // Additional utility exports if needed
  export * from '@arogyafirst/shared';
}
