import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

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
 * ADMIN CONTROLLER
 * 
 * Purpose: Admin-only endpoints for moderation and management
 * All endpoints require ADMIN role (checked by authorize middleware)
 */

/**
 * GET ALL ITEMS (ADMIN) - GET /api/admin/items
 * 
 * Purpose: Admin view of all items with additional filters
 * 
 * Architecture Flow:
 * 1. Authenticate + authorize admin (middleware)
 * 2. Extract query parameters
 * 3. Build WHERE clause with filters
 * 4. Count total items
 * 5. Fetch items with pagination
 * 6. Return items with full details
 * 
 * Query Parameters:
 * - type: LOST | FOUND
 * - category: Category name
 * - status: Item status
 * - search: Search in title/description
 * - posterId: Filter by specific user
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * 
 * Differences from public GET /api/items:
 * - Can filter by posterId (see items by specific user)
 * - Higher limit (100 vs 50)
 * - Includes poster's full contact info
 * - Can see all statuses (including CLOSED)
 * 
 * Interview Concepts:
 * - Role-based access control (admin only)
 * - Admin views have more data than public views
 * - Moderation features (filter by user)
 */
export const getAllItems = async (req: Request, res: Response) => {
  try {
    // Step 1: Extract query parameters
    const { 
      type, 
      category, 
      status, 
      search, 
      posterId, 
      page = '1', 
      limit = '10' 
    } = req.query;

    // Step 2: Validate and parse pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 10));

    // Step 3: Build WHERE clause
    const where: any = {};

    if (type) {
      if (type !== 'LOST' && type !== 'FOUND') {
        return res.status(400).json({ error: 'Type must be LOST or FOUND' });
      }
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      const validStatuses = ['UNCLAIMED', 'CLAIMED', 'MATCHED', 'RETURNED', 'CLOSED'];
      if (!validStatuses.includes(status as string)) {
        return res.status(400).json({ error: 'Invalid status', validStatuses });
      }
      where.status = status;
    }

    if (posterId) {
      where.posterId = posterId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Step 4: Count total items
    const total = await prisma.item.count({ where });

    // Step 5: Calculate pagination
    const skip = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(total / limitNum);
    const hasMore = pageNum < totalPages;

    console.log(`👮 Admin fetching items: page=${pageNum}, limit=${limitNum}, total=${total}`);

    // Step 6: Fetch items with full details
    const items = await prisma.item.findMany({
      where,
      include: {
        poster: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,  // Admin can see phone
            role: true,
            createdAt: true
          }
        },
        images: true,
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
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            claims: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limitNum,
      skip: skip
    });

    // Step 7: Return items with pagination
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
    console.error('Admin get items error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch items',
      message: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * GET ALL USERS (ADMIN) - GET /api/admin/users
 * 
 * Purpose: View and manage all users
 * 
 * Architecture Flow:
 * 1. Authenticate + authorize admin
 * 2. Extract query parameters
 * 3. Build WHERE clause
 * 4. Count total users
 * 5. Fetch users with stats
 * 6. Return users with pagination
 * 
 * Query Parameters:
 * - role: STUDENT | ADMIN
 * - emailVerified: true | false
 * - search: Search in name/email
 * - page: Page number
 * - limit: Items per page (max: 100)
 * 
 * Response includes:
 * - User details (no password hash)
 * - Item counts (posted items)
 * - Claim counts (claims made)
 * - Account status (verified, role)
 * 
 * Interview Concepts:
 * - User management (admin feature)
 * - Aggregated data (_count)
 * - Never return password hashes
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    // Step 1: Extract query parameters
    const { role, emailVerified, search, page = '1', limit = '10' } = req.query;

    // Step 2: Validate and parse pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 10));

    // Step 3: Build WHERE clause
    const where: any = {};

    if (role) {
      if (role !== 'STUDENT' && role !== 'ADMIN') {
        return res.status(400).json({ error: 'Role must be STUDENT or ADMIN' });
      }
      where.role = role;
    }

    if (emailVerified !== undefined) {
      where.emailVerified = emailVerified === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Step 4: Count total users
    const total = await prisma.user.count({ where });

    // Step 5: Calculate pagination
    const skip = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(total / limitNum);
    const hasMore = pageNum < totalPages;

    console.log(`👮 Admin fetching users: page=${pageNum}, total=${total}`);

    // Step 6: Fetch users with stats
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            postedItems: true,
            claims: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limitNum,
      skip: skip
    });

    // Step 7: Return users with pagination
    return res.status(200).json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages,
        hasMore
      }
    });

  } catch (error) {
    console.error('Admin get users error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch users',
      message: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * UPDATE USER ROLE (ADMIN) - PATCH /api/admin/users/:id
 * 
 * Purpose: Change user's role (promote to admin or demote to student)
 * 
 * Architecture Flow:
 * 1. Authenticate + authorize admin
 * 2. Extract user ID from params
 * 3. Extract new role from body
 * 4. Validate role value
 * 5. Check user exists
 * 6. Prevent self-demotion (admin can't remove own admin role)
 * 7. Update user role
 * 8. Return updated user
 * 
 * URL Parameters:
 * - id: User ID
 * 
 * Request Body:
 * {
 *   "role": "ADMIN" | "STUDENT"
 * }
 * 
 * Business Rules:
 * - Admin cannot demote themselves (prevent lockout)
 * - Can promote students to admins
 * - Can demote other admins to students
 * 
 * Interview Concepts:
 * - Self-protection (can't remove own admin)
 * - Privilege escalation/de-escalation
 * - Audit trail (who changed what)
 */
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    // Step 1: Extract user ID from URL params
    const { id: userId } = req.params;

    // Step 2: Extract new role from body
    const { role } = req.body;

    // Step 3: Validate user ID
    if (!userId || userId.trim() === '') {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Step 4: Validate role
    if (!role) {
      return res.status(400).json({ 
        error: 'Role is required',
        allowedRoles: ['STUDENT', 'ADMIN']
      });
    }

    if (role !== 'STUDENT' && role !== 'ADMIN') {
      return res.status(400).json({ 
        error: 'Invalid role',
        allowedRoles: ['STUDENT', 'ADMIN']
      });
    }

    console.log(`👮 Admin updating user ${userId} role to ${role}`);

    // Step 5: Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Step 6: Prevent self-demotion (admin can't remove own admin role)
    if (userId === req.user!.userId && role === 'STUDENT') {
      return res.status(400).json({ 
        error: 'Cannot demote yourself',
        hint: 'Admin cannot remove their own admin role'
      });
    }

    // Step 7: Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log(`✅ User ${userId} role updated to ${role}`);

    // Step 8: Return updated user
    return res.status(200).json({
      message: 'User role updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Admin update user role error:', error);
    return res.status(500).json({ 
      error: 'Failed to update user role',
      message: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};
