# Meme Generator App

## Project Overview
This is a React-based meme generator application migrated from Lovable to Replit. The app allows users to create memes with text overlays and image manipulation features.

## Project Architecture

### Frontend (Client)
- **Framework**: React 18 with TypeScript
- **Router**: React Router DOM (switched from Wouter to maintain compatibility)
- **UI Components**: Shadcn/ui components with Tailwind CSS
- **State Management**: React Query for server state
- **Canvas**: Fabric.js for image manipulation
- **Drag & Drop**: @dnd-kit for sortable layers

### Backend (Server)
- **Framework**: Express.js with TypeScript
- **Storage**: In-memory storage with interface for future database integration
- **Development**: Vite dev server integration

### Key Components
- `MemeGenerator`: Main application component
- `FabricCanvas`: Canvas area for meme creation
- `TextAndLayersPanel`: Panel for managing text layers
- `ImagePanel`: Panel for image upload and management
- Various UI panels for styling and export

## Migration Status
- [x] Initial project structure analyzed
- [x] Missing dependencies installed
- [x] Router compatibility issues resolved (switched to wouter)
- [x] TypeScript interface conflicts resolved
- [ ] Application functionality verified
- [ ] Migration completed

## User Preferences
None specified yet.

## Recent Changes
- 2025-01-17: Started migration from Lovable to Replit
- 2025-01-17: Installed missing dependencies (react-router-dom, sonner, @dnd-kit packages, fabric)