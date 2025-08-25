# Use the official Playwright image with Node.js and browsers pre-installed
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first (for better Docker layer caching)
# This allows Docker to cache the npm install step if dependencies haven't changed
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Install Playwright browsers and system dependencies
# --with-deps ensures all system dependencies are installed
RUN npx playwright install --with-deps

# Copy all project files to the container
COPY . .

# Make the shell script executable
# This is crucial - without this, Docker can't execute the script
RUN chmod +x run_test.sh

# Create directories that your test will need
RUN mkdir -p chatbot-temp test-results

# Set the default command to run when container starts
CMD ["./run_test.sh"]