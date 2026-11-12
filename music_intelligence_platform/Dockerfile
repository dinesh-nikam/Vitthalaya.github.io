# Music Composition & Lyrics Intelligence Platform - Production Dockerfile
FROM python:3.11-slim

# Install system dependencies for build, lxml, and browser execution
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libxml2-dev \
    libxslt-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency specifications
COPY requirements.txt pyproject.toml ./

# Install python dependencies including Scrapling with fetchers
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Install Playwright browser dependencies if dynamic JavaScript rendering is required
RUN playwright install --with-deps chromium || true

# Copy project source code
COPY . .

# Expose FastAPI application port
EXPOSE 8000

# Environment defaults
ENV PYTHONUNBUFFERED=1
ENV APP_HOST=0.0.0.0
ENV APP_PORT=8000

# Run FastAPI backend via Uvicorn
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
