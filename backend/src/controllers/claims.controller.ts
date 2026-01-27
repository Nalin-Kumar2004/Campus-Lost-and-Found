import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendEmail, claimCreatedTemplate, claimStatusUpdatedTemplate } from '../utils/email';
import { comparePassword } from '../utils/password';

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
 * CLAIMS CONTROLLER
 * 
 * Purpose: Handle claim operations (create, read, update status)
 * Interview context: Core feature for matching lost items with rightful owners
 */

/**
 * CREATE CLAIM - POST /api/items/:id/claims
 * 
 * Purpose: Allow users to claim an item they believe is theirs
 * 
 * Architecture Flow:
 * 1. User authenticates (middleware)
 * 2. Extract item ID from URL params
 * 3. Validate item exists and is claimable
 * 4. Check user hasn't already claimed this item
 * 5. Verify answer to verification question (if exists)
 * 6. Create claim record
 * 7. Return created claim
 * 
 * URL Parameters:
 * - id: Item ID to claim
 * 
 * Request Body:
 * {
 *   "verificationAnswer": "Blue" // Optional, required if item has verification question
 * }
 * 
 * Business Rules:
 * - User cannot claim their own item (you posted it!)
 * - User can only have 1 claim per item (prevent spam)
 * - If item has verification question, answer is required
 * - Item must be UNCLAIMED status (can't claim already claimed items)
 * 
 * Response (201):
 * {
 *   "id": "claim_123",
 *   "itemId": "item_123",
 *   "claimantId": "user_123",
 *   "status": "PENDING",
 *   "createdAt": "2026-01-21...",
 *   "item": { "title": "...", "type": "LOST" },
 *   "claimant": { "name": "John", "email": "john@college.edu" }
 * }
 * 
 * Interview Concepts:
 * - Business rules validation (can't claim own item)
 * - Unique constraint (one claim per user per item)
 * - Optional verification (security feature)
 * - Status workflow (PENDING → APPROVED/REJECTED)
 */
export const createClaim = async (req: Request, res: Response) => {
  try {
    // Step 1: Extract item ID from URL params
    const itemId = asString(req.params.id);

    // Step 2: Extract verification answer from request body (optional)
    const { verificationAnswer } = req.body;

    // Step 3: Validate item ID
    if (!itemId || itemId.trim() === '') {
      return res.status(400).json({ 
        error: 'Item ID is required' 
      });
    }

    console.log(`📝 Claim request for item: ${itemId} by user ${req.user!.userId}`);

    // Step 4: Find the item to claim
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        poster: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Step 5: Check if item exists
    if (!item) {
      return res.status(404).json({ 
        error: 'Item not found' 
      });
    }

    // Step 6: Business Rule - User cannot claim their own item
    // Why? You posted it, you already have it!
    if (item.posterId === req.user!.userId) {
      return res.status(400).json({ 
        error: 'You cannot claim your own item',
        hint: 'This item was posted by you'
      });
    }

    // Step 7: Business Rule - Item must be UNCLAIMED
    // Why? Can't claim already claimed/returned items
    if (item.status !== 'UNCLAIMED') {
      return res.status(400).json({ 
        error: `Cannot claim item with status: ${item.status}`,
        hint: 'Only UNCLAIMED items can be claimed'
      });
    }

    // Step 8: Check if user already claimed this item
    // Why? Prevent spam claims
    const existingClaim = await prisma.claim.findUnique({
      where: {
        itemId_claimantId: {
          itemId: itemId,
          claimantId: req.user!.userId
        }
      }
    });

    if (existingClaim) {
      return res.status(400).json({ 
        error: 'You have already claimed this item',
        existingClaimId: existingClaim.id,
        existingClaimStatus: existingClaim.status
      });
    }

    // Step 9: Verify answer if item has verification question
    // Why? Security - prevent random claims
    if (item.verificationQuestion && item.verificationAnswerHash) {
      // Verification answer is required
      if (!verificationAnswer || verificationAnswer.trim() === '') {
        return res.status(400).json({ 
          error: 'Verification answer is required',
          question: item.verificationQuestion
        });
      }

      // Verify the answer matches
      const isAnswerCorrect = await comparePassword(
        verificationAnswer.trim().toLowerCase(),
        item.verificationAnswerHash
      );

      if (!isAnswerCorrect) {
        console.log(`❌ Incorrect verification answer for item ${itemId}`);
        return res.status(400).json({ 
          error: 'Incorrect verification answer',
          hint: 'Please provide the correct answer to claim this item'
        });
      }

      console.log(`✅ Verification answer correct for item ${itemId}`);
    }

    // Step 10: Create the claim
    const newClaim = await prisma.claim.create({
      data: {
        itemId: itemId,
        claimantId: req.user!.userId,
        status: 'PENDING',
        verificationAnswer: verificationAnswer || null
      },
      include: {
        item: {
          select: {
            id: true,
            title: true,
            type: true,
            category: true,
            location: true,
            status: true
          }
        },
        claimant: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`✅ Claim created: ${newClaim.id} for item ${itemId}`);

    // Step 11: Side Effect - Notify item poster about new claim
    try {
      const to = item.poster?.email;
      if (to) {
        await sendEmail({
          to,
          subject: `New claim on your item: ${item.title}`,
          html: claimCreatedTemplate({
            posterName: item.poster?.name,
            itemTitle: item.title,
            claimerName: newClaim.claimant?.name,
            claimerEmail: newClaim.claimant?.email,
          }),
        });
      } else {
        console.warn(`[email] Poster has no email; skipping notification for item ${item.id}`);
      }
    } catch (e) {
      console.error('Failed to send new-claim email:', e);
    }

    // Step 12: Return success response
    return res.status(201).json(newClaim);

  } catch (error) {
    console.error('Create claim error:', error);

    // Handle Prisma unique constraint violation (race condition)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return res.status(400).json({ 
        error: 'You have already claimed this item' 
      });
    }

    return res.status(500).json({ 
      error: 'Failed to create claim',
      message: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * GET CLAIMS - GET /api/claims
 * 
 * Purpose: List all claims for current user or all claims if admin
 * 
 * Architecture Flow:
 * 1. Authenticate user (middleware)
 * 2. Check user role (admin sees all, users see only their claims)
 * 3. Build WHERE clause based on role and filters
 * 4. Fetch claims with pagination
 * 5. Return claims list
 * 
 * Query Parameters:
 * - status: Filter by claim status (PENDING, APPROVED, REJECTED, CANCELLED)
 * - type: Filter by item type (LOST, FOUND)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 50)
 * 
 * Response (200):
 * {
 *   "claims": [...],
 *   "pagination": { "page": 1, "limit": 10, "total": 5, "pages": 1 }
 * }
 * 
 * Authorization:
 * - Regular users see only claims THEY made
 * - Admins see ALL claims in system
 * 
 * Interview Concepts:
 * - Role-based data filtering (users vs admins)
 * - Complex queries with nested includes
 * - Pagination for scalability
 */
export const getClaims = async (req: Request, res: Response) => {
  try {
    // Step 1: Extract query parameters
    const { status, type, page = '1', limit = '10' } = req.query;

    // Step 2: Validate and parse pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));

    // Step 3: Build WHERE clause based on role
    const where: any = {};

    // Step 4: Role-based filtering
    // Regular users: Only see their own claims
    // Admins: See all claims
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isAdmin) {
      // Regular user - only their claims
      where.claimantId = req.user!.userId;
    }

    // Step 5: Add status filter if provided
    if (status) {
      const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
      if (!validStatuses.includes(status as string)) {
        return res.status(400).json({ 
          error: 'Invalid status',
          validStatuses 
        });
      }
      where.status = status;
    }

    // Step 6: Add type filter (filter by item type) if provided
    if (type) {
      if (type !== 'LOST' && type !== 'FOUND') {
        return res.status(400).json({ 
          error: 'Type must be LOST or FOUND' 
        });
      }
      where.item = {
        type: type
      };
    }

    // Step 7: Count total claims
    const total = await prisma.claim.count({ where });

    // Step 8: Calculate pagination metadata
    const skip = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(total / limitNum);
    const hasMore = pageNum < totalPages;

    console.log(`📋 Fetching claims for user ${req.user!.userId} (admin=${isAdmin}): page=${pageNum}, total=${total}`);

    // Step 9: Fetch claims with related data
    const claims = await prisma.claim.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            category: true,
            status: true,
            location: true,
            posterId: true,
            poster: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            images: {
              take: 1  // Just first image for list view
            }
          }
        },
        claimant: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'  // Newest claims first
      },
      take: limitNum,
      skip: skip
    });

    // Step 10: Return claims with pagination
    return res.status(200).json({
      claims,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages,
        hasMore
      }
    });

  } catch (error) {
    console.error('Get claims error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch claims',
      message: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * UPDATE CLAIM STATUS - PATCH /api/claims/:id/status
 * 
 * Purpose: Allow item owner to approve or reject a claim
 * 
 * Architecture Flow:
 * 1. Authenticate user (middleware)
 * 2. Extract claim ID from params
 * 3. Extract new status from body
 * 4. Find claim with item details
 * 5. Verify user is the item owner
 * 6. Validate status transition
 * 7. Update claim status
 * 8. Optionally update item status if approved
 * 9. Return updated claim
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
 * Authorization Rules:
 * - Only the item OWNER can approve/reject claims
 * - Claimant cannot approve their own claim
 * - Admin can approve/reject any claim
 * 
 * Business Rules:
 * - Can only update PENDING claims
 * - Cannot change APPROVED/REJECTED claims
 * - Valid transitions: PENDING → APPROVED or PENDING → REJECTED
 * - When claim is APPROVED, item status becomes CLAIMED
 * 
 * Interview Concepts:
 * - Authorization: Check item ownership before allowing action
 * - State machine: Valid status transitions
 * - Side effects: Updating item status when claim approved
 * - Idempotency: Handle already-processed claims
 */
export const updateClaimStatus = async (req: Request, res: Response) => {
  try {
    // Step 1: Extract claim ID from URL params
    const claimId = asString(req.params.id);

    // Step 2: Extract status and notes from request body
    const { status, adminNotes } = req.body;

    // Step 3: Validate claim ID
    if (!claimId || claimId.trim() === '') {
      return res.status(400).json({ 
        error: 'Claim ID is required' 
      });
    }

    // Step 4: Validate status is provided
    if (!status) {
      return res.status(400).json({ 
        error: 'Status is required',
        allowedStatuses: ['APPROVED', 'REJECTED']
      });
    }

    // Step 5: Validate status value
    // Only allow APPROVED or REJECTED (claimant can cancel via separate endpoint)
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return res.status(400).json({ 
        error: 'Invalid status',
        allowedStatuses: ['APPROVED', 'REJECTED'],
        hint: 'Only APPROVED or REJECTED are allowed'
      });
    }

    console.log(`🔄 Update claim status: ${claimId} to ${status} by user ${req.user!.userId}`);

    // Step 6: Find the claim with item details
    const existingClaim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        item: {
          select: {
            id: true,
            title: true,
            posterId: true,
            status: true
          }
        },
        claimant: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Step 7: Check if claim exists
    if (!existingClaim) {
      return res.status(404).json({ 
        error: 'Claim not found' 
      });
    }

    // Step 8: AUTHORIZATION - Check if user can update this claim
    // Rule 1: User is the item owner (can approve/reject claims on their items)
    const isItemOwner = existingClaim.item.posterId === req.user!.userId;
    
    // Rule 2: User is admin (can moderate any claim)
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isItemOwner && !isAdmin) {
      console.log(`❌ Unauthorized claim update by user ${req.user!.userId} on claim ${claimId}`);
      return res.status(403).json({ 
        error: 'Forbidden: Only the item owner can approve or reject claims',
        hint: 'You must be the owner of the item being claimed'
      });
    }

    // Step 9: Business Rule - Can only update PENDING claims
    // Why? Once approved/rejected, decision is final
    if (existingClaim.status !== 'PENDING') {
      return res.status(400).json({ 
        error: `Cannot update claim with status: ${existingClaim.status}`,
        currentStatus: existingClaim.status,
        hint: 'Only PENDING claims can be approved or rejected'
      });
    }

    // Step 10: Update the claim status
    const updatedClaim = await prisma.claim.update({
      where: { id: claimId },
      data: {
        status: status,
        adminNotes: adminNotes || null,
        updatedAt: new Date()
      },
      include: {
        item: {
          select: {
            id: true,
            title: true,
            type: true,
            category: true,
            status: true,
            poster: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        claimant: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Step 11: Side Effect - Update item status if claim is APPROVED
    // Business logic: When claim approved, item becomes CLAIMED
    if (status === 'APPROVED') {
      await prisma.item.update({
        where: { id: existingClaim.item.id },
        data: { status: 'CLAIMED' }
      });

      console.log(`✅ Item ${existingClaim.item.id} status updated to CLAIMED`);
    }

    console.log(`✅ Claim ${claimId} status updated to ${status}`);

    // Step 12: Side Effect - Notify claimant about status update
    try {
      const to = updatedClaim.claimant?.email;
      if (to) {
        await sendEmail({
          to,
          subject: `Your claim for "${updatedClaim.item.title}" was ${status}`,
          html: claimStatusUpdatedTemplate({
            claimerName: updatedClaim.claimant?.name,
            itemTitle: updatedClaim.item.title,
            status,
            notes: adminNotes || null,
          }),
        });
      } else {
        console.warn(`[email] Claimer has no email; skipping claim status email for claim ${claimId}`);
      }
    } catch (e) {
      console.error('Failed to send claim-status email:', e);
    }

    // Step 13: Return updated claim
    return res.status(200).json(updatedClaim);

  } catch (error) {
    console.error('Update claim status error:', error);
    return res.status(500).json({ 
      error: 'Failed to update claim status',
      message: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};
