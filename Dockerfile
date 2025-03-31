FROM node:18-alpine

WORKDIR /usr/src/app

# Install Python and build tools for native modules
RUN apk add --no-cache python3 build-base

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "start"]