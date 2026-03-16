import React from 'react';
import { Toaster } from 'react-hot-toast';
import App from './App';

export default function AppWrapper() {
  return (
    <>
      <Toaster position="top-right" />
      <App />
    </>
  );
}
