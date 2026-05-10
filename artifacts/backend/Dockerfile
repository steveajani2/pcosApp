# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app

# Install production dependencies only
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

# Copy source
COPY index.js .

# Required env vars at runtime: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY
# Cloud Run requires the app to listen on $PORT (defaults to 8080)
ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "index.js"]
