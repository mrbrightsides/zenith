FROM node:22

WORKDIR /app

COPY package*.json ./
# Install semua termasuk tsx
RUN npm install

COPY . .

# Build frontend (Vite)
RUN npm run build

ENV NODE_ENV=production
# Biarkan port dinamis dari Cloud Run
# CMD di bawah ini bakal manggil 'tsx server.ts' sesuai package.json
ENV NODE_ENV=production
ENV PORT=8080
CMD ["npm", "start"]
