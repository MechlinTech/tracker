# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (including your .env if needed)
COPY package*.json ./
COPY .env ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the port your app runs on (Vite default is 5173)
EXPOSE 5173

# Set environment variable for Vite development
ENV VITE_APP_ENV=development

# Command to run the app (for Vite development server)
CMD ["npm", "run", "dev", "--", "--host"]