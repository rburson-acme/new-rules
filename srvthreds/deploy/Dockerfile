# Stage 1: Build the application
FROM node:22 AS builder

WORKDIR /usr/src/app

# Create a .dockerignore file to reduce the context size
# Copy application dependency manifests to the container
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Create the production image
FROM node:22-slim

WORKDIR /usr/src/app

# Copy dependency manifests and install only production dependencies
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy the built application from the builder stage
COPY --from=builder /usr/src/app/dist-server ./dist-server
COPY --from=builder /usr/src/app/run-config ./run-config

# Expose the application port (assuming 3000 as a default, can be reconfigured)
EXPOSE 3000

# Command to run the application
CMD [ "node", "./dist-server/index.js", "-d" ]