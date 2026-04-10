import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import TopPage from './components/TopPage'
import WorkspaceLayout from './components/WorkspaceLayout'
import ViewerMode from './components/ViewerMode'

const router = createBrowserRouter([
  { path: '/', element: <TopPage /> },
  { path: '/workspace/:id', element: <WorkspaceLayout /> },
  { path: '/workspace/:id/view', element: <ViewerMode /> },
])

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="bottom-center" />
    </>
  )
}

export default App
