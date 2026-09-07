FROM node:22-alpine AS build-env
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./

ARG VITE_API_URL=http://localhost:4000
ARG VITE_PUTER_WORKER_URL=""
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PUTER_WORKER_URL=$VITE_PUTER_WORKER_URL
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build-env /app/build ./build
EXPOSE 3000
CMD ["npm", "run", "start"]
