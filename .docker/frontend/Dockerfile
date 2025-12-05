# OJT Master Frontend - Development Dockerfile
# Multi-stage build for development with hot reload

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app/src-vite

# Copy package files
COPY src-vite/package*.json ./

# Install dependencies
RUN npm ci

# ============================================
# Stage 2: Development
# ============================================
FROM node:20-alpine AS dev

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/src-vite/node_modules ./src-vite/node_modules

# Copy source code
COPY src-vite ./src-vite

WORKDIR /app/src-vite

# Expose Vite dev server port
EXPOSE 5173

# Run Vite dev server with host binding for Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
