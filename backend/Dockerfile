# syntax=docker/dockerfile:1
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then npm -g i pnpm@9 && pnpm install --frozen-lockfile; \
    else npm install; fi

COPY tsconfig.json ./
COPY src ./src

ENV PORT=3001
EXPOSE 3001

CMD ["npm", "run", "dev"]

