# AI Chat Application

## Overview

This is a full-stack AI chat application built with React, Express, PostgreSQL, and Drizzle ORM. The application provides a modern chat interface for interacting with multiple AI providers (OpenAI, Anthropic, Qwen, DeepSeek) with comprehensive user management, file upload capabilities, and administrative controls.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite with development server and hot module replacement
- **Styling**: TailwindCSS with Shadcn/UI component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Session-based authentication with PostgreSQL session store
- **File Handling**: Multer for file uploads with support for images, PDFs, and documents
- **API Design**: RESTful endpoints with proper error handling

### Database Architecture
- **Primary Database**: PostgreSQL (configured for production)
- **Development Alternative**: SQLite with MS SQL compatible schema
- **ORM**: Drizzle ORM with type-safe database operations
- **Migrations**: Drizzle Kit for schema management

## Key Components

### Authentication System
- Session-based authentication with secure cookie handling
- User registration with email verification support
- Password reset functionality
- Role-based access control (admin/regular users)
- Token-based quota management for API usage

### Chat System
- Real-time conversation management
- Support for multiple AI providers (OpenAI, Anthropic, Qwen, DeepSeek)
- File upload and processing capabilities
- Conversation history with persistent storage
- Token usage tracking and quota enforcement

### Admin Panel
- Comprehensive user management interface
- API configuration management for different providers
- User quota and status management
- System-wide settings control

### UI Components
- Modern, responsive design using Shadcn/UI
- Dark/light theme support
- Mobile-optimized interface
- Accessibility features built-in
- Professional sidebar navigation

## Data Flow

### Authentication Flow
1. User registration/login through secure forms
2. Session creation and storage in PostgreSQL
3. Middleware validation for protected routes
4. Role-based access control for admin features

### Chat Flow
1. User input processing and validation
2. File upload handling and document processing
3. AI provider selection based on admin configuration
4. Streaming response handling from AI APIs
5. Message storage and conversation management
6. Token usage tracking and quota validation

### Admin Flow
1. Admin authentication and authorization
2. Configuration management for AI providers
3. User management operations
4. System monitoring and settings control

## External Dependencies

### AI Provider APIs
- **OpenAI**: Primary AI provider with GPT models
- **Anthropic**: Claude models for alternative AI capabilities
- **Qwen**: Chinese AI provider with specialized models
- **DeepSeek**: Additional AI provider for model diversity

### Development Tools
- **Replit**: Development environment with built-in PostgreSQL
- **Vite**: Fast development server with HMR
- **TypeScript**: Type safety across the entire stack
- **TailwindCSS**: Utility-first CSS framework

### Production Services
- **PostgreSQL**: Primary database for production deployment
- **Session Store**: PostgreSQL-based session management
- **File Storage**: Local file system with configurable upload limits

## Deployment Strategy

### Development Environment
- Replit-based development with auto-provisioned PostgreSQL
- Hot module replacement for rapid development
- Environment variable configuration for API keys
- SQLite fallback for local development

### Production Deployment
- Node.js server with Express framework
- PostgreSQL database with connection pooling
- Static file serving for React build
- Environment-based configuration management

### Build Process
1. TypeScript compilation and type checking
2. Vite build for optimized React bundle
3. Server bundling with esbuild
4. Database schema migration with Drizzle

### Environment Configuration
- Separate configurations for development/production
- Secure API key management
- Database connection string configuration
- Session secret and security settings

## Recent Changes
- June 24, 2025: Fixed session management for SQLite - replaced PostgreSQL session store with SQLite-compatible store
- June 24, 2025: Updated email validation to accept localhost domains for local development
- June 24, 2025: Migrated database from PostgreSQL to SQLite with MS SQL compatible schema
- June 24, 2025: Initial setup and migration from Replit Agent environment

## User Preferences

Preferred communication style: Simple, everyday language.