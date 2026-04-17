import { RouterProvider } from 'react-router-dom'
import routes from './routes/Routes';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setActiveUser } from './redux/chatSlice';

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Initialize user from localStorage on app load
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        dispatch(setActiveUser(userData));
      } catch (err) {
        console.error('Failed to parse stored user:', err);
      }
    }
  }, [dispatch]);

  return (
     <>
      <RouterProvider router={routes} />
      <Toaster position="top-right" />
    </>
  )
}
