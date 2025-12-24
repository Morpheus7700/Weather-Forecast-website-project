World Weather & Time — Minimal Flask Demo

Overview
- Small Flask app with a simple login and a homepage that shows current time and weather for several major world cities.
- Weather fetched from Open-Meteo (no API key). Time fetched from WorldTimeAPI.

Quick start (Windows)
1. Create a virtual env and install:

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

2. Run the app:

```powershell
set FLASK_APP=app.py
set FLASK_ENV=development
flask run
```

3. Open http://127.0.0.1:5000, login with:
- username: `user`
- password: `password`

Files
- `app.py`: Flask backend (login, API for cities)
- `templates/login.html`, `templates/index.html`
- `static/style.css`, `static/app.js`

Notes
- This demo uses a single hard-coded demo user for simplicity. Do not use this approach in production.
- If you prefer different cities, edit the `CITIES` list in `app.py`.

**Troubleshooting Geolocation in Chrome:**
If geolocation is blocked, you might see a message like "Geolocation permission has been blocked...". To reset this:
1. Click the "tune" icon (looks like a small padlock or 'i' in a circle) next to the URL in your browser's address bar.
2. In the "Page info" or "Site settings" panel, find the "Location" permission.
3. Change it from "Blocked" to "Ask" or "Allow".
4. Refresh the page.
