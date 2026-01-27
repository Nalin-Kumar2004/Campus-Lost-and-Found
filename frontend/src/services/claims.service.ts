/**
 * CLAIMS API SERVICE
 * ==================
 * 
 * Handles all claim-related API calls:
 * - Submit new claim on an item
 * - Get user's claims
 * - Get claims on user's items (for item owners)
 * - Approve/reject claims
 */

import api from '../lib/api';

/**
 * TYPESCRIPT INTERFACES
 */

export type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

// Claim entity
export interface Claim {
  id: string;
  itemId: string;
  claimantId: string;
  description: string;
  verificationAnswer?: string;
  status: ClaimStatus;
  proofImages?: string[];
  createdAt: string;
  updatedAt: string;
  claimant: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  claimer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  item: {
    id: string;
    title: string;
    type: string;
    category: string;
    imageUrl?: string;
    location?: string;
  };
}

// Create claim request
export interface CreateClaimData {
  itemId: string;
  description: string;
  verificationAnswer?: string;
  contactMethod?: string;
}

// Update claim status request
export interface UpdateClaimStatusData {
  status: 'APPROVED' | 'REJECTED';
}

/**
 * CLAIMS SERVICE
 */
const claimsService = {
  /**
   * SUBMIT A CLAIM
   * User claims an item they believe is theirs
   */
  createClaim: async (data: CreateClaimData): Promise<Claim> => {
    const response = await api.post<Claim>('/claims', data);
    return response.data;
  },

  /**
   * GET MY CLAIMS
   * Fetch all claims made by the authenticated user
   */
  getMyClaims: async (): Promise<Claim[]> => {
    const response = await api.get<Claim[]>('/claims/my-claims');
    return response.data;
  },

  /**
   * GET CLAIMS ON MY ITEMS
   * Fetch all claims on items posted by the authenticated user
   */
  getClaimsOnMyItems: async (): Promise<Claim[]> => {
    const response = await api.get<Claim[]>('/claims/on-my-items');
    return response.data;
  },

  /**
   * GET CLAIMS FOR SPECIFIC ITEM
   * Fetch all claims for a specific item (for item owner)
   */
  getClaimsForItem: async (itemId: string): Promise<Claim[]> => {
    const response = await api.get<Claim[]>(`/claims/item/${itemId}`);
    return response.data;
  },

  /**
   * UPDATE CLAIM STATUS
   * Item owner approves or rejects a claim
   */
  updateClaimStatus: async (
    claimId: string,
    data: UpdateClaimStatusData
  ): Promise<Claim> => {
    const response = await api.patch<Claim>(`/claims/${claimId}/status`, data);
    return response.data;
  },

  /**
   * CANCEL CLAIM
   * Claimant cancels their own claim
   */
  cancelClaim: async (claimId: string): Promise<Claim> => {
    const response = await api.patch<Claim>(`/claims/${claimId}/cancel`);
    return response.data;
  },

  /**
   * DELETE CLAIM
   * Delete a claim (admin or creator)
   */
  deleteClaim: async (claimId: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/claims/${claimId}`);
    return response.data;
  },
};

export default claimsService;
