import React from 'react'
import { Outlet } from 'react-router-dom'
import { Button } from '../ui/button'

const RootLayout = () => {
  return (
    <div
      className={`relative h-screen min-h-screen w-full min-w-full bg-gray-700 text-white`}
    >

      <Button variant="destructive">wjenwken</Button>
      {/* root layout */}
      <Outlet />
    </div>
  )
}

export default RootLayout