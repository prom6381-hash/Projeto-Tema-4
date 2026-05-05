FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY backend/ ./backend/
COPY app/base_de_dados.js ./base_de_dados.js

EXPOSE 4000

CMD ["node", "backend/server.js"]