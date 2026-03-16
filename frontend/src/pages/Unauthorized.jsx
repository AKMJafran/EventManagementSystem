import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-500">403</h1>
        <h2 className="mt-4 text-2xl font-semibold text-gray-800">Unauthorized Access</h2>
        <p className="mt-2 text-gray-600">You do not have the permission to view this page.</p>
        <Link to="/" className="mt-6 inline-block px-6 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700">
          Go to Homepage
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
