# syntax=docker/dockerfile:1
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then npm -g i pnpm@9 && pnpm install --frozen-lockfile; \
    else npm install; fi

COPY . .

EXPOSE 3030

# Use dev server and bind to all interfaces
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
