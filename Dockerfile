FROM node:20-alpine

WORKDIR /app

# Copy backend
COPY backend/ /app/backend/

WORKDIR /app/backend

# Install dependencies
RUN npm install

# Expose port
EXPOSE 5001

# Start server
CMD ["npm", "start"]
