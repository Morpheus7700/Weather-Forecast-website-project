# World Weather & Time 🌦️⏱️

A minimal, fast Flask application that provides real-time weather forecasts and current local times for major cities around the globe.

## ✨ Features
- **Live Weather Data:** Fetches real-time weather conditions using the Open-Meteo API (no API key required).
- **Accurate Time Zones:** Uses WorldTimeAPI to display exact local times across different global regions.
- **User Authentication:** Simple session-based login and registration system.
- **Clean Interface:** Responsive HTML/CSS frontend with a straightforward, easy-to-read dashboard.

## 🛠️ Tech Stack
- **Backend:** Python, Flask, Requests
- **Frontend:** HTML templates, CSS, Vanilla JS
- **Deployment:** Docker, Gunicorn ready

## ⚙️ Run Locally
```bash
python -m venv venv
venv\Scriptsctivate
pip install -r requirements.txt
set FLASK_APP=app.py
flask run
```
