FROM node:lts

# Set working directory
WORKDIR /app

# Copy everything (if using a monorepo, adjust)
COPY . .

# Install dependencies
RUN npm install

# Build Astro site
RUN npm run build

# Expose the dist folder as static (Fleek picks this up automatically)
