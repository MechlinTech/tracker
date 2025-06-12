# Use official Node.js Alpine image for smaller size
FROM node:18-alpine

# Set working directory and user (avoid root)
WORKDIR /app
RUN chown -R node:node /app
USER node

# Install dependencies first for better caching
COPY --chown=node:node package.json package-lock.json* ./

# Install dependencies with error handling and verbose logging
RUN \
  if [ -f package-lock.json ]; then \
    npm ci --no-optional --loglevel=verbose; \
  else \
    npm install --no-optional --loglevel=verbose; \
  fi \
  && npm cache clean --force

# Copy environment files (if exists)
COPY --chown=node:node .env* ./

# Copy application files
COPY --chown=node:node . .

# Set production environment (but allow overrides)
ENV NODE_ENV=production
ENV VITE_APP_ENV=${VITE_APP_ENV:-development}

# Build the application (uncomment if needed)
# RUN npm run build

# Expose port
EXPOSE 5173

# Health check (adjust for your app)
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:5173 || exit 1

# Run the application
CMD ["npm", "run", "dev", "--", "--host"]