import { Outlet } from 'react-router-dom'

const RootLayout = () => {
  return (
    <div className="relative h-dvh min-h-dvh w-full min-w-full">
      <Outlet />
    </div>
  )
}

export default RootLayout