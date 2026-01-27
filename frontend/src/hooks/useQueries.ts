/**
 * REACT QUERY HOOKS - Custom hooks for data fetching
 * 
 * WHAT IS REACT QUERY?
 * --------------------
 * React Query is a data-fetching library that provides:
 * - Automatic caching and background updates
 * - Loading/error states without useState boilerplate
 * - Deduplication of identical requests
 * - Automatic refetching when data becomes stale
 * - Pagination and infinite scroll support
 * 
 * WHY USE REACT QUERY?
 * --------------------
 * Without React Query:
 *   const [data, setData] = useState([]);
 *   const [loading, setLoading] = useState(true);
 *   const [error, setError] = useState(null);
 *   useEffect(() => { fetchData(); }, []);
 * 
 * With React Query:
 *   const { data, isLoading, error } = useQuery({ queryKey, queryFn });
 * 
 * INTERVIEW TALKING POINTS:
 * -------------------------
 * 1. Query Keys: Unique identifiers for caching
 * 2. Query Functions: Async functions that fetch data
 * 3. Stale Time: How long data is considered "fresh"
 * 4. Background Refetch: Automatic updates when data is stale
 * 5. Mutations: For POST/PUT/DELETE operations with optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import itemsService from '../services/items.service';
import claimsService from '../services/claims.service';
import type { ItemFilters } from '../services/items.service';
import type { CreateClaimData, UpdateClaimStatusData } from '../services/claims.service';

// ================================
// QUERY KEYS - Centralized for consistency
// ================================

export const queryKeys = {
  // Items
  items: ['items'] as const,
  itemsList: (filters?: ItemFilters) => ['items', 'list', filters] as const,
  itemDetail: (id: string) => ['items', 'detail', id] as const,
  myItems: ['items', 'my-items'] as const,
  
  // Claims
  claims: ['claims'] as const,
  myClaims: ['claims', 'my-claims'] as const,
  claimsOnMyItems: ['claims', 'on-my-items'] as const,
  claimsForItem: (itemId: string) => ['claims', 'item', itemId] as const,
};

// ================================
// ITEMS HOOKS
// ================================

/**
 * FETCH ALL ITEMS
 * Supports filtering, searching, and pagination
 * 
 * Usage:
 * const { data, isLoading, error } = useItems({ type: 'LOST', search: 'laptop' });
 */
export function useItems(filters?: ItemFilters) {
  return useQuery({
    queryKey: queryKeys.itemsList(filters),
    queryFn: () => itemsService.getItems(filters),
    staleTime: 1000 * 60 * 2, // Fresh for 2 minutes
  });
}

/**
 * FETCH SINGLE ITEM BY ID
 * 
 * Usage:
 * const { data: item, isLoading } = useItem('item-id-123');
 */
export function useItem(id: string) {
  return useQuery({
    queryKey: queryKeys.itemDetail(id),
    queryFn: () => itemsService.getItemById(id),
    enabled: !!id, // Only fetch if id is provided
  });
}

/**
 * FETCH USER'S ITEMS
 * Items posted by the authenticated user
 * 
 * Usage:
 * const { data: myItems, isLoading } = useMyItems();
 */
export function useMyItems() {
  return useQuery({
    queryKey: queryKeys.myItems,
    queryFn: () => itemsService.getMyItems(),
  });
}

/**
 * CREATE ITEM MUTATION
 * Posts a new lost/found item
 * 
 * Usage:
 * const createItem = useCreateItem();
 * createItem.mutate(itemData, { onSuccess: (item) => navigate(`/items/${item.id}`) });
 */
export function useCreateItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: itemsService.createItem,
    onSuccess: () => {
      // Invalidate items cache to refetch with new item
      queryClient.invalidateQueries({ queryKey: queryKeys.items });
      queryClient.invalidateQueries({ queryKey: queryKeys.myItems });
    },
  });
}

/**
 * DELETE ITEM MUTATION
 * 
 * Usage:
 * const deleteItem = useDeleteItem();
 * deleteItem.mutate(itemId, { onSuccess: () => toast.success('Deleted!') });
 */
export function useDeleteItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: itemsService.deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.items });
      queryClient.invalidateQueries({ queryKey: queryKeys.myItems });
    },
  });
}

// ================================
// CLAIMS HOOKS
// ================================

/**
 * FETCH USER'S CLAIMS
 * Claims made by the authenticated user
 */
export function useMyClaims() {
  return useQuery({
    queryKey: queryKeys.myClaims,
    queryFn: () => claimsService.getMyClaims(),
  });
}

/**
 * FETCH CLAIMS ON USER'S ITEMS
 * Claims made on items the user posted
 */
export function useClaimsOnMyItems() {
  return useQuery({
    queryKey: queryKeys.claimsOnMyItems,
    queryFn: () => claimsService.getClaimsOnMyItems(),
  });
}

/**
 * CREATE CLAIM MUTATION
 * Submit a claim on an item
 */
export function useCreateClaim() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateClaimData) => claimsService.createClaim(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.claims });
    },
  });
}

/**
 * UPDATE CLAIM STATUS MUTATION
 * Approve or reject a claim (for item owner)
 */
export function useUpdateClaimStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ claimId, data }: { claimId: string; data: UpdateClaimStatusData }) => 
      claimsService.updateClaimStatus(claimId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.claims });
    },
  });
}
