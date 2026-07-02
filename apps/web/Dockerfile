FROM node:22-alpine AS builder
WORKDIR /app
COPY apps/web/package.json ./apps/web/
WORKDIR /app/apps/web
RUN npm install
COPY apps/web ./
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
