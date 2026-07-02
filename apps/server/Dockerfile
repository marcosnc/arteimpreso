FROM node:22-alpine AS builder
WORKDIR /app/apps/server
COPY apps/server/package.json ./
COPY apps/server/prisma ./prisma
RUN npm install
COPY apps/server ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app/apps/server
RUN apk add --no-cache openssl
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/node_modules ./node_modules
COPY --from=builder /app/apps/server/package.json ./
COPY --from=builder /app/apps/server/prisma ./prisma
COPY apps/server/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
RUN mkdir -p /app/uploads
EXPOSE 3001
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
