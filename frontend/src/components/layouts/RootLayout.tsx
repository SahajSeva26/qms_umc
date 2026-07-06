import { Outlet } from 'react-router-dom'

const RootLayout = () => {
  return (
    <div className="relative h-screen min-h-screen w-full min-w-full">
      <Outlet />
    </div>
  )
}

export default RootLayout