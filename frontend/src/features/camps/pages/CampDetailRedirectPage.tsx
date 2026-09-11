import { Navigate, useParams } from 'react-router-dom'

// /camps/:id used to be a standalone view/edit page; it now redirects to the
// drawer experience so old bookmarks/shared links keep working without a
// second, conflicting view/edit interface staying reachable.
const CampDetailRedirectPage = () => {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/camps?camp=${id}`} replace />
}

export default CampDetailRedirectPage
