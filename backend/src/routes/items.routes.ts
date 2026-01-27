import { Router } from 'express';
import { createItem, getItems, getItemById, updateItem, deleteItem, getMyItems } from '../controllers/items.controller';
import { authenticate } from '../middleware/auth';

/**
 * ITEMS ROUTES
 * 
 * Purpose: Map HTTP endpoints to controller functions
 * Base path: /api/items (set in server.ts)
 * 
 * Architecture:
 * Request → Route → Middleware(s) → Controller → Response
 * 
 * Why separate routes from controllers?
 * 1. Separation of concerns (routing vs business logic)
 * 2. Easier testing (can test controllers independently)
 * 3. Better organization (all routes for items in one place)
 * 4. Reusability (same controller can be used by different routes)
 */

const router = Router();

/**
 * POST /api/items
 * 
 * Create a new lost or found item
 * 
 * Access: Authenticated users only
 * 
 * Flow:
 * 1. authenticate middleware checks JWT token
 * 2. If valid, attaches req.user = { userId, email, role }
 * 3. createItem controller handles business logic
 * 4. Returns 201 with created item
 * 
 * Middleware chain: authenticate → createItem
 * 
 * Request body:
 * {
 *   "title": "Lost Blue Laptop",
 *   "description": "HP laptop lost near library",
 *   "type": "LOST",
 *   "category": "ELECTRONICS",
 *   "location": "Central Library",
 *   "contactInfo": "john@college.edu", // optional
 *   "images": ["base64string1", "base64string2"] // optional
 * }
 * 
 * Success Response (201):
 * {
 *   "id": "item_123",
 *   "title": "Lost Blue Laptop",
 *   "type": "LOST",
 *   "status": "UNCLAIMED",
 *   "createdBy": { "id": "user_123", "name": "John" },
 *   "images": [{ "url": "https://..." }],
 *   ...
 * }
 * 
 * Error Responses:
 * 401 - Unauthorized (no token or invalid token)
 * 400 - Bad Request (validation failed)
 * 500 - Server Error (database or Cloudinary error)
 */
router.post('/', authenticate, createItem);

/**
 * GET /api/items
 * 
 * List and search all items with filters and pagination
 * 
 * Access: Public (no auth required)
 * 
 * Query Parameters:
 * - type: "LOST" | "FOUND" (optional)
 * - category: category name (optional)
 * - search: text to search (optional)
 * - page: page number (default: 1)
 * - limit: items per page (default: 10, max: 50)
 * 
 * Success Response (200):
 * {
 *   "items": [...],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 10,
 *     "total": 45,
 *     "pages": 5,
 *     "hasMore": true
 *   }
 * }
 */
router.get('/', getItems);

/**
 * GET /api/my-items
 * 
 * Get all items posted by current authenticated user
 * 
 * Access: Authenticated users only
 * 
 * Query Parameters (optional):
 * - type: "LOST" | "FOUND"
 * - status: "UNCLAIMED" | "CLAIMED" | "MATCHED" | "RETURNED" | "CLOSED"
 * - page: page number (default: 1)
 * - limit: items per page (default: 10, max: 50)
 * 
 * Success Response (200):
 * {
 *   "items": [...],
 *   "pagination": { "page": 1, "limit": 10, "total": 5, "pages": 1, "hasMore": false }
 * }
 * 
 * Use Cases:
 * - Dashboard showing user's posted items
 * - "My Lost Items" section
 * - "My Found Items" section
 * - Managing claims on user's items
 */
router.get('/my-items', authenticate, getMyItems);

/**
 * GET /api/items/:id
 * 
 * Get full details of a single item
 * 
 * Access: Public (no auth required)
 * 
 * URL Parameters:
 * - id: Item ID (required)
 * 
 * Success Response (200):
 * {
 *   "id": "clxy123",
 *   "title": "Lost Blue Backpack",
 *   "description": "...",
 *   "type": "LOST",
 *   "category": "BAGS",
 *   "status": "UNCLAIMED",
 *   "poster": { "id": "...", "name": "Alice" },
 *   "images": [...],
 *   "claims": [...],
 *   "_count": { "claims": 2 }
 * }
 * 
 * Error Responses:
 * 400 - Missing or invalid ID
 * 404 - Item not found
 * 500 - Server error
 */
router.get('/:id', getItemById);

/**
 * PATCH /api/items/:id
 * 
 * Update an existing item (partial update)
 * 
 * Access: Authenticated users (item owner only)
 * 
 * URL Parameters:
 * - id: Item ID (required)
 * 
 * Request Body (all optional):
 * {
 *   "title": "Updated title",
 *   "description": "Updated description",
 *   "location": "New location",
 *   "currentLocation": "Where item is stored now",
 *   "status": "CLAIMED"
 * }
 * 
 * Success Response (200):
 * {
 *   "id": "...",
 *   "title": "Updated title",
 *   ...
 * }
 * 
 * Error Responses:
 * 400 - Missing ID or no fields to update
 * 401 - Unauthorized (no token)
 * 403 - Forbidden (not item owner)
 * 404 - Item not found
 * 500 - Server error
 */
router.patch('/:id', authenticate, updateItem);

/**
 * DELETE /api/items/:id
 * 
 * Delete an item permanently (hard delete)
 * 
 * Access: Authenticated users (item owner) or admins
 * 
 * URL Parameters:
 * - id: Item ID (required)
 * 
 * Authorization:
 * - Item owner can delete their own item
 * - Admin can delete any item (for moderation)
 * - Other users will receive 403 Forbidden
 * 
 * What gets deleted:
 * - Item record from database
 * - Related images (cascade delete)
 * - Related claims (cascade delete)
 * - Images from Cloudinary CDN (best-effort)
 * 
 * Success Response (200):
 * {
 *   "message": "Item deleted successfully",
 *   "deletedItemId": "clxy123",
 *   "deletedImagesCount": 3
 * }
 * 
 * Error Responses:
 * 400 - Missing or invalid ID
 * 401 - Unauthorized (no token)
 * 403 - Forbidden (not owner or admin)
 * 404 - Item not found
 * 500 - Server error
 * 
 * Interview Note:
 * This is a HARD DELETE (permanent removal).
 * For production, consider SOFT DELETE:
 * - Add deletedAt field to schema
 * - Set deletedAt = new Date() instead of deleting
 * - Filter out deleted items in queries
 * - Allows recovery and audit trails
 */
router.delete('/:id', authenticate, deleteItem);

// Export router to use in server.ts
// In server.ts: app.use('/api/items', itemsRoutes)
export default router;
