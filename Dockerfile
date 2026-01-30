# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Install system dependencies (build-essential for potential C-extensions)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Ensure users.json exists so the app doesn't crash on load
RUN if [ ! -f users.json ]; then echo "{}" > users.json; fi

# Cloud Run expects the app to listen on the port defined by $PORT
ENV PORT 8080

# Command to run the application using Gunicorn
# exec allows signals to be handled correctly by the process
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app
