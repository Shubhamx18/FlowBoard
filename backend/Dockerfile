FROM node:18-alpine

WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install all dependencies (including agora-access-token)
RUN npm install --omit=dev

# Copy source code
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
