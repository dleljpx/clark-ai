# Overview

This is a modern full-stack AI chat application called "CLARK AI" built with React, Express, and TypeScript. The application provides a conversational interface where users can interact with an AI assistant powered by Google's Gemini API. It features a clean, responsive UI with conversation management, system instruction customization, and real-time chat functionality.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The client is built with React 18 and TypeScript, utilizing modern development patterns:

- **Build System**: Vite for fast development and optimized production builds
- **Styling**: TailwindCSS with custom CSS variables for theming, shadcn/ui component library for consistent UI components
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **UI Components**: Comprehensive set of Radix UI primitives wrapped in custom styled components

The frontend follows a component-based architecture with clear separation between pages, reusable components, hooks, and utilities. The chat interface includes features like message history, typing indicators, code syntax highlighting, and responsive design for both desktop and mobile.

## Backend Architecture

The server is built with Express.js and follows a clean architecture pattern:

- **Web Framework**: Express with TypeScript for type safety
- **Development Mode**: Integrated Vite middleware for hot reloading during development
- **API Design**: RESTful endpoints for conversation and message management
- **Request Logging**: Custom middleware for API request monitoring and debugging
- **Error Handling**: Centralized error handling middleware

The backend provides endpoints for creating conversations, managing messages, and configuring system instructions. It maintains conversation context and handles streaming responses from the AI service.

## Data Storage

The application uses a flexible storage abstraction pattern:

- **Database ORM**: Drizzle ORM with PostgreSQL schema definitions
- **Schema Management**: Type-safe database schemas with Zod validation
- **Storage Interface**: Abstract storage interface allowing for multiple implementations
- **Development Storage**: In-memory storage implementation for development
- **Data Models**: User management, conversation threading, and message persistence

The schema includes users, conversations, and messages with proper relationships and timestamps. The storage layer supports conversation history, user sessions, and system instruction persistence.

## External Dependencies

### Third-Party Services
- **Google Gemini API**: Primary AI service integration using the @google/genai SDK
- **Neon Database**: PostgreSQL hosting service via @neondatabase/serverless driver

### UI and Styling
- **shadcn/ui**: Complete component library built on Radix UI primitives
- **Radix UI**: Accessible, unstyled component primitives for complex UI elements
- **TailwindCSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Comprehensive icon library with consistent styling

### Development and Build Tools
- **Vite**: Modern build tool with TypeScript support and hot module replacement
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Autoprefixer for browser compatibility
- **TypeScript**: Full-stack type safety with strict configuration

### State Management and Forms
- **TanStack Query**: Server state management, caching, and synchronization
- **React Hook Form**: Performant forms with minimal re-renders
- **Zod**: Schema validation for both client and server data validation

The application integrates AI conversation capabilities with a polished user experience, supporting features like conversation persistence, system instruction customization, theme switching, and responsive design across devices.