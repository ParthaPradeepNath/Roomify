FROM node:22-alpine AS runtime
WORKDIR /app/server
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma.config.ts ./
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# Prisma only needs a syntactically valid URL at generate time.
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/roomify
ENV DATABASE_URL=$DATABASE_URL
RUN npm run db:generate

ENV NODE_ENV=production
ENV PORT=4000
ENV UPLOAD_DIR=/app/server/uploads
EXPOSE 4000
CMD ["sh", "-c", "npm run db:push && npm run start"]
