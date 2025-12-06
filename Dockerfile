# Stage 1: Build with Node 22 & Bun
FROM node:22-alpine AS builder

WORKDIR /app

# Install Bun globally using npm (since we are on a Node image)
RUN npm install -g bun

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build the app
RUN bun run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy the build output (usually 'dist' for Vite/React) to Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose internal port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
