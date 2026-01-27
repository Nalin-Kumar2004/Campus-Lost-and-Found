import { Router } from 'express';
import { getAllItems, getAllUsers, updateUserRole } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

/**
 * ADMIN ROUTES
 * 
 * Purpose: Admin-only endpoints for moderation and user management
 * Base path: /api/admin
 * 
 * All routes require:
 * 1. authenticate - Valid JWT token
 * 2. authorize('ADMIN') - User role must be ADMIN
 */

const router = Router();

/**
 * GET /api/admin/items
 * 
 * Get all items with admin filters
 * 
 * Access: Admin only
 * 
 * Query Parameters (optional):
 * - type: LOST | FOUND
 * - category: Category name
 * - status: Item status
 * - search: Search text
 * - posterId: Filter by user
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * 
 * Success Response (200):
 * {
 *   "items": [...],
 *   "pagination": { "page": 1, "limit": 10, "total": 150, "pages": 15, "hasMore": true }
 * }
 */
router.get('/items', authenticate, authorize('ADMIN'), getAllItems);

/**
 * GET /api/admin/users
 * 
 * Get all users with stats
 * 
 * Access: Admin only
 * 
 * Query Parameters (optional):
 * - role: STUDENT | ADMIN
 * - emailVerified: true | false
 * - search: Search in name/email
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * 
 * Success Response (200):
 * {
 *   "users": [
 *     {
 *       "id": "...",
 *       "email": "john@college.edu",
 *       "name": "John",
 *       "role": "STUDENT",
 *       "emailVerified": true,
 *       "_count": { "postedItems": 5, "claims": 3 }
 *     }
 *   ],
 *   "pagination": { ... }
 * }
 */
router.get('/users', authenticate, authorize('ADMIN'), getAllUsers);

/**
 * PATCH /api/admin/users/:id
 * 
 * Update user role (promote/demote)
 * 
 * Access: Admin only
 * 
 * URL Parameters:
 * - id: User ID
 * 
 * Request Body:
 * {
 *   "role": "ADMIN" | "STUDENT"
 * }
 * 
 * Success Response (200):
 * {
 *   "message": "User role updated successfully",
 *   "user": { "id": "...", "role": "ADMIN", ... }
 * }
 * 
 * Error Responses:
 * 400 - Cannot demote self / Invalid role
 * 403 - Forbidden (not admin)
 * 404 - User not found
 */
router.patch('/users/:id', authenticate, authorize('ADMIN'), updateUserRole);

export default router;
