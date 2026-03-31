# Event Management System - Frontend

This is the React frontend for the Faculty Event Management System, built with Vite for fast development and optimized builds.

## Features
- User authentication (login/register)
- Event creation and management
- Admin dashboard for approvals
- Real-time notifications
- Responsive UI with Tailwind CSS

## Setup
1. Ensure backend is running on `http://localhost:8081`
2. Create `.env` file:
   ```
   VITE_API_BASE_URL=http://localhost:8081/api
   ```
3. Install dependencies: `npm install`
4. Run development server: `npm run dev`
5. Open `http://localhost:5173`

## Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Tech Stack
- React 18
- Vite
- Tailwind CSS
- Axios for API calls
- React Router for navigation
