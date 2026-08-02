FROM node:20-alpine
WORKDIR /app
COPY backend .
RUN npm install
EXPOSE 5001
CMD ["node", "server.js"]
