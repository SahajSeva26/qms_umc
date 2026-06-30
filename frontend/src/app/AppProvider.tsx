import React from 'react'
import { RouterProvider } from 'react-router-dom'
import appRouter from './router'

const AppProvider = () => {
  return (
    <>
    {/* Add all global providers here */}
      <RouterProvider router={appRouter} />
    </>
  )
}

export default AppProvider