# PromptReel Editor

A full SaaS web-based video editor built with React, Vite, TypeScript, and Express.

## Project Structure
- `/frontend` - React Vite application with TailwindCSS and Zustand.
- `/backend` - Node.js Express server with FFmpeg integration.
- `/shared` - Shared TypeScript definitions.

## Setup Instructions

1. **Install Dependencies**
   Navigate to both `frontend` and `backend` directories and install dependencies.
   ```bash
   cd frontend
   npm install
   cd ../backend
   npm install
   ```

2. **Environment Variables**
   - Copy `frontend/.env.example` to `frontend/.env` and fill in your Firebase config.
   - Copy `backend/.env.example` to `backend/.env`.

3. **Start the Application**
   From the root directory, you can start both frontend and backend concurrently:
   ```bash
   npm run dev
   ```
   
   Alternatively, run them separately:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

## Features
- Canvas-based Timeline with multi-track support
- Drag & Drop clip manipulation (positioning, trimming)
- Media Upload with automatic thumbnail generation
- Real-time video preview
- Dark mode responsive UI
