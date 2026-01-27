import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicId, validateImage } from '../utils/cloudinary';

// Helper to safely extract string from query/params (can be string | string[])
const asString = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

// Extend Express Request type to include user property from auth middleware
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email?: string;
        role?: string;
      };
    }
  }
}

/**
 * ITEMS CONTROLLER
 * 
 * Purpose: Handle all item-related operations (create, read, update, delete)
 * Interview context: This is the core business logic for the lost & found feature
 */

/**
 * CREATE ITEM - POST /api/items
 * 
 * Purpose: Allow authenticated users to post lost or found items
 * 
 * Architecture Flow:
 * 1. User authenticated via middleware (req.user exists)
 * 2. Validate item data (title, description, type, category, location)
 * 3. Upload images to Cloudinary (if provided)
 * 4. Create item record in database
 * 5. Create image records linked to item
 * 6. Return created item with images
 * 
 * Request Body:
 * {
 *   "title": "Lost Blue Laptop",
 *   "description": "HP laptop, lost near library on Monday",
 *   "type": "LOST",                    // or "FOUND"
 *   "category": "ELECTRONICS",         // from Category enum
 *   "location": "Central Library",
 *   "contactInfo": "john@college.edu", // optional
 *   "images": ["base64string1", "base64string2"]  // optional, max 5
 * }
 * 
 * Response (201):
 * {
 *   "id": "item_123",
 *   "title": "Lost Blue Laptop",
 *   "description": "...",
 *   "type": "LOST",
 *   "category": "ELECTRONICS",
 *   "status": "UNCLAIMED",
 *   "location": "Central Library",
 *   "createdById": "user_123",
 *   "createdBy": {
 *     "id": "user_123",
 *     "name": "John Doe",
 *     "email": "john@college.edu"
 *   },
 *   "images": [
 *     { "id": "img_1", "url": "https://res.cloudinary.com/..." }
 *   ],
 *   "createdAt": "2026-01-20T..."
 * }
 */
export const createItem = async (req: Request, res: Response) => {
  try {
    // Step 1: Extract data from request body
    const { title, description, type, category, location, itemDate, images } = req.body;

    // Step 2: Validate required fields
    // Why validate? Prevent bad data in database, give clear error messages
    if (!title || !description || !type || !category || !location || !itemDate) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['title', 'description', 'type', 'category', 'location', 'itemDate']
      });
    }

    // Step 3: Validate title length (5-100 characters)
    // Why? Too short = not descriptive, too long = spam/abuse
    if (title.length < 5 || title.length > 100) {
      return res.status(400).json({ 
        error: 'Title must be between 5 and 100 characters' 
      });
    }

    // Step 4: Validate description length (10-500 characters)
    if (description.length < 10 || description.length > 500) {
      return res.status(400).json({ 
        error: 'Description must be between 10 and 500 characters' 
      });
    }

    // Step 5: Validate type (LOST or FOUND)
    // Why check? Database has enum, but better to fail here with clear message
    if (type !== 'LOST' && type !== 'FOUND') {
      return res.status(400).json({ 
        error: 'Type must be either LOST or FOUND' 
      });
    }

    // Step 6: Validate category (must match enum in schema)
    const validCategories = [
      'ELECTRONICS', 'CLOTHING', 'ACCESSORIES', 'BOOKS', 
      'ID_CARDS', 'KEYS', 'BAGS', 'SPORTS', 'OTHER'
    ];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        error: 'Invalid category',
        validCategories 
      });
    }

    // Step 7: Validate images array (optional, max 5)
    // Why limit? Prevent abuse, keep load times reasonable
    if (images && (!Array.isArray(images) || images.length > 5)) {
      return res.status(400).json({ 
        error: 'Images must be an array with maximum 5 items' 
      });
    }

    // Step 8: Upload images to Cloudinary (if provided)
    // Why async? Upload takes time, we don't want to block
    const imageUrls: string[] = [];
    
    if (images && images.length > 0) {
      console.log(`Uploading ${images.length} images to Cloudinary...`);
      
      // Validate all images BEFORE uploading (fail fast)
      for (const image of images) {
        const validation = validateImage(image);
        if (!validation.valid) {
          return res.status(400).json({ 
            error: validation.error,
            code: 'INVALID_IMAGE'
          });
        }
      }
      
      // Upload each image sequentially
      // Alternative: Promise.all() for parallel uploads (faster but harder to debug)
      for (const image of images) {
        try {
          const url = await uploadToCloudinary(image, 'campus-lost-found/items');
          imageUrls.push(url);
          console.log(`✅ Image uploaded: ${url}`);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          // Continue with other images even if one fails
          // Alternative: Could fail entire request if ANY upload fails
        }
      }
    }

    // Step 9: Create item in database with transaction
    // Why transaction? If item creation succeeds but image creation fails,
    // we don't want orphaned item. Transaction = all or nothing.
    const newItem = await prisma.item.create({
      data: {
        title,
        description,
        type,
        category,
        location,
        itemDate: new Date(itemDate),     // Convert string to Date object
        status: 'UNCLAIMED',              // Default status for new items
        posterId: req.user!.userId,       // From authenticate middleware
        
        // Create related image records in same transaction
        images: {
          create: imageUrls.map(url => ({
            url
          }))
        }
      },
      
      // Include related data in response (avoid extra queries)
      include: {
        poster: {
          select: {
            id: true,
            name: true,
            email: true,
            // Don't include passwordHash for security
          }
        },
        images: true  // Include all images
      }
    });

    // Step 10: Return success response
    console.log(`✅ Item created: ${newItem.id} by user ${req.user!.userId}`);
    
    return res.status(201).json(newItem);
    
  } catch (error) {
    console.error('Create item error:', error);
    
    // Handle specific Prisma errors
    if (error instanceof Error && error.message.includes('Invalid enum value')) {
      return res.status(400).json({ 
        error: 'Invalid category or type value' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to create item',
      message: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * GET ALL ITEMS - GET /api/items
 * 
 * Purpose: Search and browse all lost/found items with filtering and pagination
 * 
 * Query Parameters:
 * - type: "LOST" | "FOUND" (optional)
 * - category: "ELECTRONICS", "BAGS", etc (optional)
 * - search: Search in title + description (optional)
 * - page: Page number starting from 1 (default: 1)
 * - limit: Items per page (default: 10, max: 50)
 * 
 * Example URLs:
 * GET /api/items                                          # All items
 * GET /api/items?type=LOST                                # Only lost items
 * GET /api/items?category=ELECTRONICS&search=laptop      # Category + search
 * GET /api/items?type=FOUND&page=2&limit=20              # Pagination
 * 
 * Architecture Flow:
 * 1. Extract & validate query parameters
 * 2. Build WHERE clause dynamically (only include filters that are provided)
 * 3. Count total matching items
 * 4. Fetch items with SKIP/TAKE for pagination
 * 5. Return items + metadata
 * 
 * Why pagination?
 * - Performance: Don't fetch all 10,000 items at once (slow, memory-heavy)
 * - UX: Users see results faster (10 items vs 10,000)
 * - Database: Less strain on database
 * 
 * Why search in both title + description?
 * - Title might be "Laptop" but user searches "HP"
 * - Description contains "HP ThinkPad"
 * - Searching both gives better results
 */
export const getItems = async (req: Request, res: Response) => {
  try {
    // Step 1: Extract and validate query parameters
    const { type, category, search, location, dateFrom, dateTo, page = '1', limit = '10' } = req.query;

    // Step 2: Validate and parse pagination parameters
    // Why convert to number? Query params come as strings
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    // Explanation: page must be >= 1, limit must be 1-50 (max 50 to prevent abuse)

    // Step 3: Validate type if provided
    if (type && type !== 'LOST' && type !== 'FOUND') {
      return res.status(400).json({ 
        error: 'Type must be LOST or FOUND' 
      });
    }

    // Step 4: Validate category if provided
    const validCategories = [
      'ELECTRONICS', 'CLOTHING', 'ACCESSORIES', 'BOOKS', 
      'ID_CARDS', 'KEYS', 'BAGS', 'SPORTS', 'OTHER'
    ];
    if (category && !validCategories.includes(category as string)) {
      return res.status(400).json({ 
        error: 'Invalid category',
        validCategories 
      });
    }

    // Step 5: Build WHERE clause dynamically
    // Only add filters that were actually provided
    // Why? If user doesn't provide type, we show ALL types (LOST + FOUND)
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    // Step 6: Add search filter (if provided)
    // Search in BOTH title AND description
    // Why OR? If search matches title OR description, include it
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },        // Case-insensitive search
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }      // Also search in location
      ];
    }

    // Step 6a: Add location filter (if provided separately)
    // This allows explicit location filtering beyond text search
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    // Step 6b: Add date range filter (if provided)
    // Filter items by the date they were lost/found
    if (dateFrom || dateTo) {
      where.itemDate = {};
      if (dateFrom) {
        where.itemDate.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        // Add 1 day to include the end date fully
        const endDate = new Date(dateTo as string);
        endDate.setDate(endDate.getDate() + 1);
        where.itemDate.lt = endDate;
      }
    }

    // Step 7: Count total items matching the filters
    // Why count? To calculate total pages and tell user "Found 45 items"
    const total = await prisma.item.count({ where });

    // Step 8: Calculate pagination values
    const skip = (pageNum - 1) * limitNum;  // How many to skip: page 2 with limit 10 = skip 10
    const totalPages = Math.ceil(total / limitNum);
    const hasMore = pageNum < totalPages;

    console.log(`📋 Fetching items: page=${pageNum}, limit=${limitNum}, total=${total}`);

    // Step 9: Fetch items with pagination
    // ORDER BY createdAt DESC = newest items first
    // TAKE/SKIP for pagination
    const items = await prisma.item.findMany({
      where,
      include: {
        poster: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        images: {
          take: 3  // Only fetch first 3 images per item (for performance)
        },
        _count: {
          select: {
            claims: true  // Count how many claims this item has
          }
        }
      },
      orderBy: {
        createdAt: 'desc'  // Newest items first
      },
      take: limitNum,
      skip: skip
    });

    // Step 10: Return response with pagination metadata
    return res.status(200).json({
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages,
        hasMore
      }
    });

  } catch (error) {
    console.error('Get items error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch items',
      message: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * GET ITEM BY ID - GET /api/items/:id
 * 
 * Purpose: Fetch full details of a single item
 * 
 * URL Parameters:
 * - id: Item ID (required)
 * 
 * Example:
 * GET /api/items/clxy123abc
 * 
 * Architecture Flow:
 * 1. Extract ID from URL params
 * 2. Find item in database by ID
 * 3. Include all related data (poster, images, claims)
 * 4. Return 404 if not found
 * 5. Return full item if found
 * 
 * Why include related data?
 * - User wants to see who posted it (poster info)
 * - User wants to see all images
 * - User might want to see claim count
 * 
 * Why return 404?
 * - REST convention: 404 = "Not Found"
 * - Clear to client: "This item doesn't exist"
 * - Prevents information leakage
 * 
 * What about soft-deleted items?
 * - Don't show them (where: { deletedAt: null })
 * - They're hidden from search and detail views
 */
export const getItemById = async (req: Request, res: Response) => {
  try {
    // Step 1: Extract ID from URL parameter
    const id = asString(req.params.id);

    // Step 2: Validate ID is not empty
    if (!id || id.trim() === '') {
      return res.status(400).json({ 
        error: 'Item ID is required' 
      });
    }

    console.log(`🔍 Fetching item: ${id}`);

    // Step 3: Fetch item from database
    // Include poster info, all images, and claim count
    const item = await prisma.item.findFirst({
      where: {
        id
      },
      include: {
        poster: {
          select: {
            id: true,
            name: true,
            email: true
            // Don't include password for security
          }
        },
        images: true,  // All images for this item
        claims: {
          include: {
            claimant: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            claims: true  // Count total claims
          }
        }
      }
    });

    // Step 4: Check if item exists
    // Why 404? REST standard for "not found"
    if (!item) {
      console.log(`❌ Item not found: ${id}`);
      return res.status(404).json({ 
        error: 'Item not found' 
      });
    }

    // Step 5: Return item with all details
    console.log(`✅ Item found: ${item.id}`);
    return res.status(200).json(item);

  } catch (error) {
    console.error('Get item by ID error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch item',
      message: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * UPDATE ITEM - PATCH /api/items/:id
 * 
 * Purpose: Allow item owner to update their item details
 * 
 * URL Parameters:
 * - id: Item ID (required)
 * 
 * Request Body (all optional - partial update):
 * {
 *   "title": "Updated title",
 *   "description": "Updated description",
 *   "location": "New location",
 *   "currentLocation": "Where item is now",
 *   "status": "CLAIMED"
 * }
 * 
 * Architecture Flow:
 * 1. Authenticate user (middleware)
 * 2. Extract ID from params
 * 3. Find item in database
 * 4. Verify ownership (req.user.userId === item.posterId)
 * 5. Validate update data
 * 6. Update only provided fields
 * 7. Return updated item
 * 
 * Authorization Rules:
 * - Only item poster can update
 * - Admin cannot update (only delete) - business rule
 * 
 * Business Rules (What CAN'T be changed):
 * - type (LOST/FOUND) - prevents abuse
 * - category - prevents gaming the system
 * - posterId - obvious security issue
 * - itemDate - historical record
 * 
 * What CAN be changed:
 * - title, description - fix typos
 * - location, currentLocation - item moved
 * - status - UNCLAIMED → CLAIMED → RETURNED
 * 
 * Interview Concepts:
 * - PATCH vs PUT: PATCH = partial update, PUT = full replacement
 * - Authorization: User can only update their own resources
 * - Validation: Check ownership BEFORE updating
 */
export const updateItem = async (req: Request, res: Response) => {
  try {
    // Step 1: Extract ID from URL params
    const id = asString(req.params.id);
    
    // Step 2: Extract fields from request body (all optional)
    const { title, description, location, currentLocation, status } = req.body;

    // Step 3: Validate ID
    if (!id || id.trim() === '') {
      return res.status(400).json({ 
        error: 'Item ID is required' 
      });
    }

    // Step 4: Check if at least one field is being updated
    // Why? PATCH with empty body is meaningless
    if (!title && !description && !location && !currentLocation && !status) {
      return res.status(400).json({ 
        error: 'At least one field must be provided to update',
        allowedFields: ['title', 'description', 'location', 'currentLocation', 'status']
      });
    }

    console.log(`🔄 Updating item: ${id} by user ${req.user!.userId}`);

    // Step 5: Find the item first
    // Why find first? Need to check ownership before updating
    const existingItem = await prisma.item.findUnique({
      where: { id }
    });

    // Step 6: Check if item exists
    if (!existingItem) {
      return res.status(404).json({ 
        error: 'Item not found' 
      });
    }

    // Step 7: AUTHORIZATION - Check ownership
    // Critical security check: Only the person who posted can update
    // Why not allow admin? Business decision - admins can delete, not modify
    if (existingItem.posterId !== req.user!.userId) {
      console.log(`❌ Unauthorized update attempt by user ${req.user!.userId} on item ${id}`);
      return res.status(403).json({ 
        error: 'You can only update your own items' 
      });
    }

    // Step 8: Validate title if provided
    if (title !== undefined) {
      if (typeof title !== 'string' || title.length < 5 || title.length > 100) {
        return res.status(400).json({ 
          error: 'Title must be between 5 and 100 characters' 
        });
      }
    }

    // Step 9: Validate description if provided
    if (description !== undefined) {
      if (typeof description !== 'string' || description.length < 10 || description.length > 500) {
        return res.status(400).json({ 
          error: 'Description must be between 10 and 500 characters' 
        });
      }
    }

    // Step 10: Validate status if provided
    const validStatuses = ['UNCLAIMED', 'CLAIMED', 'MATCHED', 'RETURNED', 'CLOSED'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        validStatuses 
      });
    }

    // Step 11: Build update data object (only include provided fields)
    // This is PARTIAL update - only update what user sent
    const updateData: any = {};
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (currentLocation !== undefined) updateData.currentLocation = currentLocation;
    if (status !== undefined) updateData.status = status;

    // Step 12: Update the item
    const updatedItem = await prisma.item.update({
      where: { id },
      data: updateData,
      include: {
        poster: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        images: true,
        _count: {
          select: {
            claims: true
          }
        }
      }
    });

    console.log(`✅ Item updated: ${id}`);

    // Step 13: Return updated item
    return res.status(200).json(updatedItem);

  } catch (error) {
    console.error('Update item error:', error);
    return res.status(500).json({ 
      error: 'Failed to update item',
      message: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * DELETE ITEM - DELETE /api/items/:id
 * 
 * Purpose: Permanently delete an item and its associated images
 * 
 * URL Parameters:
 * - id: Item ID (required)
 * 
 * Architecture Flow:
 * 1. Authenticate user (middleware)
 * 2. Extract ID from params
 * 3. Find item in database
 * 4. Verify authorization (owner or admin)
 * 5. Extract Cloudinary image URLs
 * 6. Delete item from database (cascades to related images/claims)
 * 7. Delete images from Cloudinary (best-effort, non-blocking)
 * 8. Return success response
 * 
 * Authorization Rules:
 * - Item owner can delete their own item
 * - Admin can delete any item (moderation)
 * - Other users cannot delete
 * 
 * Cascade Behavior:
 * - Deleting item automatically deletes:
 *   * Related Image records (onDelete: Cascade in schema)
 *   * Related Claim records (onDelete: Cascade in schema)
 * 
 * Cloudinary Cleanup:
 * - Best-effort deletion (doesn't fail request if Cloudinary delete fails)
 * - Why? If Cloudinary is down, we still want to delete from our DB
 * - Orphaned images in Cloudinary are acceptable (minor cost)
 * 
 * Interview Concepts:
 * - Hard delete vs soft delete: This is hard delete (permanent removal)
 * - Cascade deletes: Database automatically removes related records
 * - Authorization: Role-based access control (owner or admin)
 * - Best-effort operations: Non-critical operations shouldn't block main flow
 */
export const deleteItem = async (req: Request, res: Response) => {
  try {
    // Step 1: Extract item ID from URL params
    const id = asString(req.params.id);

    // Step 2: Validate that ID exists and is not empty
    // Why validate? Prevent unnecessary database queries
    if (!id || id.trim() === '') {
      return res.status(400).json({ 
        error: 'Item ID is required' 
      });
    }

    console.log(`🗑️ Delete request for item: ${id} by user ${req.user?.userId}`);

    // Step 3: Find the item in database
    // Include images to get Cloudinary URLs for cleanup
    const existingItem = await prisma.item.findUnique({
      where: { id },
      include: {
        images: true  // Need URLs for Cloudinary cleanup
      }
    });

    // Step 4: Check if item exists
    // Why 404? REST convention - resource doesn't exist
    if (!existingItem) {
      console.log(`❌ Item not found: ${id}`);
      return res.status(404).json({ 
        error: 'Item not found' 
      });
    }

    // Step 5: AUTHORIZATION - Check if user can delete this item
    // Rule 1: User is the owner (posterId matches userId)
    const isOwner = existingItem.posterId === req.user?.userId;
    
    // Rule 2: User is an admin (can delete any item for moderation)
    const isAdmin = req.user?.role === 'ADMIN';

    // Step 6: Deny access if neither owner nor admin
    // Why 403? User is authenticated but not authorized (forbidden)
    if (!isOwner && !isAdmin) {
      console.log(`❌ Unauthorized delete attempt by user ${req.user?.userId} on item ${id}`);
      return res.status(403).json({ 
        error: 'Forbidden: You can only delete your own items',
        hint: 'Only the item owner or an admin can delete this item'
      });
    }

    // Step 7: Extract Cloudinary public IDs from image URLs
    // Why extract? Need public ID to delete from Cloudinary
    // Example URL: https://res.cloudinary.com/.../v123/campus-lost-found/items/abc.jpg
    // Extracted: campus-lost-found/items/abc
    const cloudinaryPublicIds = existingItem.images
      .map(image => extractPublicId(image.url))
      .filter((publicId): publicId is string => publicId !== null && publicId !== '');

    console.log(`📸 Found ${cloudinaryPublicIds.length} images to delete from Cloudinary`);

    // Step 8: Delete item from database
    // This triggers CASCADE deletes on:
    // - images table (all images for this item)
    // - claims table (all claims for this item)
    await prisma.item.delete({
      where: { id }
    });

    console.log(`✅ Item deleted from database: ${id}`);

    // Step 9: Delete images from Cloudinary (best-effort)
    // Why best-effort? If Cloudinary is down, we don't want to fail the request
    // The item is already deleted from our DB - that's the critical operation
    // Orphaned images in Cloudinary are acceptable (minor cost, can be cleaned later)
    if (cloudinaryPublicIds.length > 0) {
      for (const publicId of cloudinaryPublicIds) {
        await deleteFromCloudinary(publicId);
        console.log(`🗑️ Deleted from Cloudinary: ${publicId}`);
      }
    }

    // Step 10: Return success response
    return res.status(200).json({ 
      message: 'Item deleted successfully',
      deletedItemId: id,
      deletedImagesCount: cloudinaryPublicIds.length
    });

  } catch (error) {
    console.error('Delete item error:', error);
    
    // Handle Prisma-specific errors
    if (error instanceof Error) {
      // Item was already deleted (race condition)
      if (error.message.includes('Record to delete does not exist')) {
        return res.status(404).json({ 
          error: 'Item not found or already deleted' 
        });
      }
    }
    
    return res.status(500).json({ 
      error: 'Failed to delete item',
      message: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * GET MY ITEMS - GET /api/my-items
 * 
 * Purpose: Get all items posted by the currently authenticated user
 * 
 * Architecture Flow:
 * 1. Authenticate user (middleware)
 * 2. Extract userId from req.user
 * 3. Query items where posterId = userId
 * 4. Include related data (images, claim count)
 * 5. Return user's items with pagination
 * 
 * Query Parameters (optional):
 * - status: Filter by status (UNCLAIMED, CLAIMED, etc.)
 * - type: Filter by type (LOST or FOUND)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 50)
 * 
 * Use Cases:
 * - User wants to see all items they've posted
 * - Dashboard showing "My Lost Items" and "My Found Items"
 * - Managing claims on items they posted
 * 
 * Interview Concepts:
 * - Authorization: Only show user their own items (implicit through WHERE clause)
 * - Filtering: Combine user filter with status/type filters
 * - Reusability: Similar to getItems but filtered by userId
 */
export const getMyItems = async (req: Request, res: Response) => {
  try {
    // Step 1: Extract query parameters
    const { status, type, page = '1', limit = '10' } = req.query;

    // Step 2: Validate and parse pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));

    // Step 3: Build WHERE clause
    // Start with user filter (only this user's items)
    const where: any = {
      posterId: req.user!.userId  // Only items posted by current user
    };

    // Step 4: Add status filter if provided
    if (status) {
      const validStatuses = ['UNCLAIMED', 'CLAIMED', 'MATCHED', 'RETURNED', 'CLOSED'];
      if (!validStatuses.includes(status as string)) {
        return res.status(400).json({ 
          error: 'Invalid status',
          validStatuses 
        });
      }
      where.status = status;
    }

    // Step 5: Add type filter if provided
    if (type) {
      if (type !== 'LOST' && type !== 'FOUND') {
        return res.status(400).json({ 
          error: 'Type must be LOST or FOUND' 
        });
      }
      where.type = type;
    }

    // Step 6: Count total items for pagination
    const total = await prisma.item.count({ where });

    // Step 7: Calculate pagination metadata
    const skip = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(total / limitNum);
    const hasMore = pageNum < totalPages;

    console.log(`📋 Fetching my items for user ${req.user!.userId}: page=${pageNum}, total=${total}`);

    // Step 8: Fetch user's items with pagination
    const items = await prisma.item.findMany({
      where,
      include: {
        images: true,  // All images
        _count: {
          select: {
            claims: true  // Count claims on each item
          }
        }
      },
      orderBy: {
        createdAt: 'desc'  // Newest first
      },
      take: limitNum,
      skip: skip
    });

    // Step 9: Return items with pagination metadata
    return res.status(200).json({
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages,
        hasMore
      }
    });

  } catch (error) {
    console.error('Get my items error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch your items',
      message: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};
