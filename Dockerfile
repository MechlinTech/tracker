# Use official Node.js Alpine image for smaller size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json* ./

# Install dependencies with clean cache and error handling
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  else npm install; fi && \
  npm cache clean --force && \
  rm -rf /tmp/*

# Copy environment files (if exists)
COPY .env* ./

# Copy application files
COPY . .

# Set production environment
ENV NODE_ENV=production
ENV VITE_APP_ENV=development

# Build the application (if needed)
# RUN npm run build

# Expose port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:5173 || exit 1

# Run the application
CMD ["npm", "run", "dev", "--", "--host"]