# Imagem base: Node.js 20 em Alpine Linux
FROM node:20-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os ficheiros de dependências antes do código fonte
# Aproveita o cache do Docker — só reinstala se o package.json mudar
COPY package*.json ./

# Copia o código fonte do backend
COPY backend ./backend

# Instala as dependências definidas no package.json
RUN npm install

# Copia os certificados SSL/TLS para comunicação segura
COPY certs ./certs

# Copia os ficheiros da Autoridade Certificadora (CA) do servidor
COPY servidor-ca ./servidor-ca

# Expõe a porta 4000 para comunicação externa com o container
EXPOSE 4000

# Comando executado ao iniciar o container — arranca o servidor principal
CMD ["node", "backend/server.js"]