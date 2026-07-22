FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
RUN if [ -f /usr/bin/chromium-browser ]; then ln -sf /usr/bin/chromium-browser /usr/bin/chromium; fi
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY .env.example ./.env.example
EXPOSE 8080
CMD ["node", "dist/index.js"]
