# ============================================
# Stage 1: Build the React/Vite application
# ============================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build-time env vars (baked into the JS bundle by Vite)
ARG VITE_API_URL
ARG VITE_BACKEND_URL
ARG VITE_SOCKET_URL
ARG VITE_AGORA_APP_ID

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_AGORA_APP_ID=$VITE_AGORA_APP_ID

# Build production bundle
RUN npm run build

# ============================================
# Stage 2: Serve with nginx
# ============================================
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React app
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
