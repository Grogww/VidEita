FROM node:20-alpine

WORKDIR /app
RUN npm config set registry https://registry.npmjs.org/

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./
RUN mkdir -p uploads

EXPOSE 3000
CMD ["node", "server.js"]
