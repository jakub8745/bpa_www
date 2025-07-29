FROM node:alpine

WORKDIR /app

# Copy package.json and lockfile first for faster build cache
COPY package*.json ./
# (Optional: add this line if you use pnpm/yarn, or copy the right lock file)
# COPY pnpm-lock.yaml* yarn.lock* ./

RUN npm install

# Copy the rest of your files
COPY . .

RUN npm run build

CMD ["npx", "serve", "dist"]
