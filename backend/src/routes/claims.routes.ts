import { Router } from 'express';
import { createClaim, getClaims, updateClaimStatus } from '../controllers/claims.controller';
import { authenticate } from '../middleware/auth';

/**
 * CLAIMS ROUTES
 * 
 * Purpose: Handle claim-related endpoints
 * Base path: /api (handles both /api/claims and /api/items/:id/claims)
 * 
 * Architecture:
 * User finds lost item → Claims it → Owner reviews → Approves/Rejects
 */

const router = Router();

/**
 * POST /api/items/:id/claims
 * 
 * Create a claim on an item
 * 
 * Access: Authenticated users only
 * 
 * URL Parameters:
 * - id: Item ID to claim
 * 
 * Request Body:
 * {
 *   "verificationAnswer": "Blue" // Required if item has verification question
 * }
 * 
 * Success Response (201):
 * {
 *   "id": "claim_123",
 *   "itemId": "item_123",
 *   "claimantId": "user_123",
 *   "status": "PENDING",
 *   "item": { "title": "Lost Wallet", "type": "FOUND" },
 *   "claimant": { "name": "John", "email": "john@college.edu" },
 *   "createdAt": "2026-01-21..."
 * }
 * 
 * Error Responses:
 * 400 - Cannot claim own item / Already claimed / Wrong verification
 * 401 - Unauthorized (no token)
 * 404 - Item not found
 * 500 - Server error
 */
router.post('/items/:id/claims', authenticate, createClaim);

/**
 * GET /api/claims
 * 
 * Get all claims (user's claims or all if admin)
 * 
 * Access: Authenticated users
 * 
 * Query Parameters (optional):
 * - status: Filter by status (PENDING, APPROVED, REJECTED, CANCELLED)
 * - type: Filter by item type (LOST, FOUND)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 50)
 * 
 * Authorization:
 * - Regular users see only claims THEY made
 * - Admins see ALL claims in the system
 * 
 * Success Response (200):
 * {
 *   "claims": [
 *     {
 *       "id": "claim_123",
 *       "status": "PENDING",
 *       "item": { "title": "Lost Wallet", "poster": {...} },
 *       "claimant": { "name": "John" },
 *       "createdAt": "..."
 *     }
 *   ],
 *   "pagination": { "page": 1, "limit": 10, "total": 5, "pages": 1, "hasMore": false }
 * }
 */
router.get('/claims', authenticate, getClaims);

/**
 * PATCH /api/claims/:id/status
 * 
 * Update claim status (approve or reject)
 * 
 * Access: Item owner or admin only
 * 
 * URL Parameters:
 * - id: Claim ID
 * 
 * Request Body:
 * {
 *   "status": "APPROVED" | "REJECTED",
 *   "adminNotes": "Verified identity" // Optional
 * }
 * 
 * Authorization:
 * - Only the item OWNER can approve/reject claims on their items
 * - Admin can approve/reject any claim
 * - Claimant cannot approve their own claim
 * 
 * Business Rules:
 * - Can only update PENDING claims
 * - Valid transitions: PENDING → APPROVED or PENDING → REJECTED
 * - When APPROVED, item status becomes CLAIMED
 * 
 * Success Response (200):
 * {
 *   "id": "claim_123",
 *   "status": "APPROVED",
 *   "adminNotes": "Verified",
 *   "item": { "title": "Lost Wallet", "status": "CLAIMED" },
 *   "claimant": { "name": "John" }
 * }
 * 
 * Error Responses:
 * 400 - Invalid status or claim not PENDING
 * 401 - Unauthorized (no token)
 * 403 - Forbidden (not item owner)
 * 404 - Claim not found
 */
router.patch('/claims/:id/status', authenticate, updateClaimStatus);

export default router;
