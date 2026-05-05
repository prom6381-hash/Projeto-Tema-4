FROM node:20-alpine
WORKDIR /app/backend
COPY package*.json ./
RUN npm install
COPY backend ./
EXPOSE 3000
CMD ["node","server.js"]