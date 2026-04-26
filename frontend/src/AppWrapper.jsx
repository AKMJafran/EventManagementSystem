import React from 'react';
import { Toaster } from 'react-hot-toast';
import App from './App';

export default function AppWrapper() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '20px',
            border: '1px solid rgba(189, 201, 200, 0.65)',
            background: '#ffffff',
            color: '#1a1c1c',
            boxShadow: '0 20px 45px rgba(0, 45, 45, 0.12)',
            padding: '14px 16px',
          },
          success: {
            iconTheme: {
              primary: '#006565',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ba1a1a',
              secondary: '#ffffff',
            },
          },
        }}
      />
      <App />
    </>
  );
}
