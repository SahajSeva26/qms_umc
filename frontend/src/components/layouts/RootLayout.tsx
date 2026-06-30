import React from 'react'
import { Outlet } from 'react-router-dom'

const RootLayout = () => {
  return (
       <div
      className={`relative h-screen min-h-screen w-full min-w-full bg-gray-700 text-white`}
    >ewcwc
      {/* root layout */}
      <Outlet />
    </div>
  )
}

export default RootLayout