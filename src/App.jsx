import { RouterProvider } from 'react-router-dom'
import routes from './routes/Routes';
import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
     <>
      <RouterProvider router={routes} />
      <Toaster position="top-right" />
    </>
  )
}
