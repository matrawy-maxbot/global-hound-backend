# ======================
# Builder stage
# ======================
FROM node:20-alpine AS builder

WORKDIR /app

# نسخ package.json من backend
COPY backend/package*.json ./

RUN npm install

# نسخ باقي ملفات backend
COPY backend .

# Build (TypeScript → dist)
RUN npm run build


# ======================
# Production stage
# ======================
FROM node:20-alpine AS production

WORKDIR /app

# نسخ package.json مرة تانية
COPY backend/package*.json ./

RUN npm install --omit=dev

# نسخ build الناتج
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# شغل السيرفر
CMD ["npm", "run", "start"]
