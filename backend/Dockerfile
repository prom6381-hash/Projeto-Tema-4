FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY backend ./backend
RUN npm install

COPY certs ./certs
COPY servidor-ca ./servidor-ca

EXPOSE 4000

CMD ["node", "backend/server.js"]
