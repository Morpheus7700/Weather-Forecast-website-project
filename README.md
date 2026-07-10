# Weather-Forecast-website-project

> A minimal Flask web app that shows real-time weather and local time for major cities.

A small Flask application that fetches live weather from the Open-Meteo API (no API key required) and displays local times using IANA timezone data, behind a simple session-based login.

## Features
- Live weather via the Open-Meteo API
- Local times for cities across regions using timezone data
- Session-based login and registration
- Responsive HTML/CSS frontend

## Tech Stack
- **Backend:** Python, Flask, Requests
- **Frontend:** HTML templates, CSS, vanilla JS
- **Deploy:** Docker and Gunicorn ready

## Getting Started
```bash
python -m venv venv
# Windows: venv\Scripts\activate  |  macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
flask run
```
