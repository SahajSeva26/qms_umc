import AuthMarketingPanel from '../components/AuthMarketingPanel'
import LoginForm from '../components/LoginForm'

const LoginPage = () => {
  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <AuthMarketingPanel />
      <LoginForm />
    </div>
  )
}

export default LoginPage
