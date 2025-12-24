FROM node:20

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies like concurrently/typescript)
RUN npm install

# Copy source code
COPY . .

# Expose API and Admin UI ports
EXPOSE 3000
EXPOSE 3002

# Start in development mode
CMD ["npm", "run", "dev"]