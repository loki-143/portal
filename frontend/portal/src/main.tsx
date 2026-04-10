import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/auth';

console.log('🚀 React mounting...');
console.log('API URL:', import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);

console.log('✅ React mounted successfully');
