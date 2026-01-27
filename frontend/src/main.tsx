import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

/**
 * REACT QUERY CONFIGURATION
 * 
 * QueryClient manages:
 * - Caching of API responses
 * - Background refetching
 * - Retry logic for failed requests
 * - Deduplication of identical requests
 * 
 * INTERVIEW TALKING POINTS:
 * - staleTime: How long data is considered "fresh" (no refetch needed)
 * - gcTime: How long to keep unused data in cache (garbage collection)
 * - retry: Number of retry attempts for failed requests
 * - refetchOnWindowFocus: Refetch when user returns to the tab
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
      gcTime: 1000 * 60 * 30, // Keep unused data in cache for 30 minutes
      retry: 1, // Retry failed requests once
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
