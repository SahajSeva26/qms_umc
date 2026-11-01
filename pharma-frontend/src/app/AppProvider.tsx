import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import queryClient from '@/lib/api/queryClient'
import { Toaster } from '@/components/ui/sonner'
import appRouter from './router'

const AppProvider = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={appRouter} />
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}

export default AppProvider
