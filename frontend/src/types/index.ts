/**
 * GLOBAL TYPE DEFINITIONS
 * =======================
 * 
 * Centralized types used across the application.
 * This follows the DRY principle and provides type safety.
 * 
 * INTERVIEW TALKING POINT:
 * "I centralized types in a dedicated file to ensure consistency
 * across the app and make maintenance easier."
 */

import type { AxiosError } from 'axios';
import type { LucideIcon } from 'lucide-react';

// ================================
// API ERROR TYPES
// ================================

/**
 * Standard API error response from backend
 * All backend errors follow this structure
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  statusCode?: number;
  details?: Record<string, string[]>;
}

/**
 * Typed Axios error with our API error response
 * Use this instead of `any` in catch blocks
 */
export type ApiError = AxiosError<ApiErrorResponse>;

/**
 * Helper function to extract error message from API errors
 * Handles different error shapes gracefully
 */
export function getErrorMessage(error: unknown): string {
  // Check if it's an Axios error with our expected response shape
  if (isApiError(error)) {
    return error.response?.data?.error || error.response?.data?.message || error.message;
  }
  
  // Standard Error object
  if (error instanceof Error) {
    return error.message;
  }
  
  // Fallback for unknown error types
  return 'An unexpected error occurred';
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}

// ================================
// NAVIGATION TYPES
// ================================

/**
 * Navigation item for menus
 * Used in Navbar and other navigation components
 */
export interface NavItem {
  label: string;
  to: string;
  requiresAuth?: boolean;
  icon?: LucideIcon;
}

/**
 * Location state for redirects after login
 * Used with React Router's useLocation
 */
export interface LocationState {
  from?: {
    pathname: string;
  };
}

// ================================
// PAGINATION TYPES
// ================================

/**
 * Standard pagination response from API
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasMore?: boolean;
}

/**
 * Paginated response wrapper
 * Generic type for any paginated API response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

// ================================
// QUERY PARAMETER TYPES
// ================================

/**
 * Base query parameters for list endpoints
 */
export interface BaseQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Items list query parameters
 */
export interface ItemsQueryParams extends BaseQueryParams {
  type?: 'LOST' | 'FOUND';
  category?: string;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Admin users list query parameters
 */
export interface AdminUsersQueryParams extends BaseQueryParams {
  role?: string;
  emailVerified?: string;
}

/**
 * Admin items list query parameters
 */
export interface AdminItemsQueryParams extends BaseQueryParams {
  type?: string;
  status?: string;
  category?: string;
}
