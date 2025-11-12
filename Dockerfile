FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 5000

# Start the app
ENV NODE_ENV=production
# Use shell form to ensure cross-env and other commands work
CMD npm start
