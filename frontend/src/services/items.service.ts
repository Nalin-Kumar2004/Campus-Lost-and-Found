/**
 * ITEMS API SERVICE
 * =================
 * 
 * Handles all item-related API calls:
 * - Fetch all items (with filters)
 * - Create new item
 * - Get single item details
 * - Get user's items
 * - Update/delete items
 */

import api from '../lib/api';

/**
 * TYPESCRIPT INTERFACES
 */

// Item types
export type ItemType = 'LOST' | 'FOUND';
export type ItemStatus = 'UNCLAIMED' | 'CLAIMED' | 'RESOLVED';
export type ItemCategory = 
  | 'ELECTRONICS' 
  | 'CLOTHING' 
  | 'ACCESSORIES' 
  | 'BOOKS' 
  | 'ID_CARDS' 
  | 'KEYS' 
  | 'BAGS' 
  | 'SPORTS' 
  | 'OTHER';

// Item image
export interface ItemImage {
  id: string;
  url: string;
  altText?: string;
  createdAt: string;
}

// Item creator
export interface ItemCreator {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

// Item entity
export interface Item {
  id: string;
  title: string;
  description: string;
  type: ItemType;
  category: ItemCategory;
  status: ItemStatus;
  location: string;
  itemDate: string;
  contactInfo?: string;
  currentLocation?: string;
  verificationQuestion?: string;
  posterId: string;
  poster: ItemCreator;
  images: ItemImage[];
  claimsCount?: number;
  createdAt: string;
  updatedAt: string;
}

// API responses
export interface ItemsResponse {
  items: Item[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
}

export interface ItemResponse {
  id: string;
  title: string;
  description: string;
  type: ItemType;
  category: ItemCategory;
  status: ItemStatus;
  location: string;
  itemDate: string;
  contactInfo?: string;
  images: ItemImage[];
  posterId: string;
  poster: ItemCreator;
  createdAt: string;
  updatedAt: string;
}

// Create item request
export interface CreateItemData {
  title: string;
  description: string;
  type: ItemType;
  category: ItemCategory;
  location: string;
  itemDate: string;
  contactInfo?: string;
  images?: string[]; // Base64 strings
}

// Query filters
export interface ItemFilters {
  type?: ItemType;
  category?: ItemCategory;
  search?: string;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

/**
 * ITEMS SERVICE
 */
const itemsService = {
  /**
   * GET ALL ITEMS
   * Fetch items with optional filters and pagination
   */
  getItems: async (filters?: ItemFilters): Promise<ItemsResponse> => {
    const params = new URLSearchParams();
    
    if (filters?.type) params.append('type', filters.type);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await api.get<ItemsResponse>(`/items?${params.toString()}`);
    return response.data;
  },

  /**
   * GET SINGLE ITEM
   * Fetch detailed information about a specific item
   */
  getItemById: async (id: string): Promise<ItemResponse> => {
    const response = await api.get<ItemResponse>(`/items/${id}`);
    return response.data;
  },

  /**
   * GET MY ITEMS
   * Fetch all items posted by the authenticated user
   */
  getMyItems: async (): Promise<Item[]> => {
    const response = await api.get<{ items: Item[], pagination: ItemsResponse['pagination'] }>('/items/my-items');
    return response.data.items;
  },

  /**
   * CREATE ITEM
   * Post a new lost or found item
   */
  createItem: async (data: CreateItemData): Promise<ItemResponse> => {
    const response = await api.post<ItemResponse>('/items', data);
    return response.data;
  },

  /**
   * UPDATE ITEM
   * Update an existing item (only by creator)
   */
  updateItem: async (id: string, data: Partial<CreateItemData>): Promise<ItemResponse> => {
    const response = await api.put<ItemResponse>(`/items/${id}`, data);
    return response.data;
  },

  /**
   * DELETE ITEM
   * Delete an item (only by creator)
   */
  deleteItem: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/items/${id}`);
    return response.data;
  },
};

export default itemsService;
