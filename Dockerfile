# Use Node.js 20 slim as the base image
FROM node:20-slim

# Install ffmpeg and other dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsqlite3-dev \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Ensure upload directories exist
RUN mkdir -p uploads/clips uploads/vlogs uploads/music uploads/tmp

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/tapestry.db

# Create a directory for persistent data
RUN mkdir -p /app/data

# Use a non-root user for security (optional but recommended)
# RUN useradd -m appuser && chown -R appuser /app
# USER appuser

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); })"

# Use a startup script
COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["entrypoint.sh"]
CMD ["npm", "start"]
