# MC Tunes

MC Tunes is a web application built with React and Vite that provides a music dashboard experience. The application features a secure login system and a modern, responsive design with a red and grey/black color scheme.

## Current Features

### Authentication System
- Secure login page with username/password authentication
- Mock user service for development (replaceable with real database)
- Error handling and loading states
- Test accounts available for development

### User Interface
- Red and grey/black color scheme for visual appeal
- Consistent styling across all components
- Loading states and error messages for better user experience

## Color Scheme
The application uses a carefully selected color palette:
- Primary Red: `#ff1a1a`
- Secondary Red: `#cc0000`
- Primary Dark: `#1a1a1a`
- Light Grey: `#333333`
- Dark Grey: `#242424`
- Text Light: `#ffffff`
- Text Grey: `#808080`

## Test Accounts
For development purposes, you can use these test accounts:
1. Admin Account
   - Username: `admin`
   - Password: `admin123`
2. Test User Account
   - Username: `user1`
   - Password: `pass123`

## Project Structure
```
src/
├── components/
│   └── Login.jsx       # Login component with authentication
├── services/
│   └── mockUserService.js  # Authentication service
├── App.jsx            # Main application component
├── App.css           # Main application styles
└── index.css         # Global styles and variables
```

## Running the Project
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to the local development server (usually `http://localhost:5173`)

## Upcoming Features
- Oracle database integration for user authentication
- Music dashboard implementation
- User profile management
- Playlist creation and management
- Music player interface

## Tech Stack
- React
- Vite
- CSS
- JavaScript
