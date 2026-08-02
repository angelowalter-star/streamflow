FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package*.json ./

RUN npm install

COPY backend/ .

EXPOSE 5001

CMD ["node", "server.js"]
