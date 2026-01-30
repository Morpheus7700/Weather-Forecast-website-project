import os
import json
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
import requests
from dotenv import load_dotenv
from datetime import datetime
from cities import ALL_CITIES

try:
    from zoneinfo import ZoneInfo
except Exception:
    ZoneInfo = None

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET", "dev-secret-change-me")
OPENWEATHERMAP_API_KEY = os.getenv("OPENWEATHERMAP_API_KEY")

# WMO Weather code to Font Awesome icon mapping
WEATHER_ICONS = {
    0: "fa-sun", # Clear sky
    1: "fa-cloud-sun", # Mainly clear
    2: "fa-cloud-sun", # Partly cloudy
    3: "fa-cloud", # Overcast
    45: "fa-smog", # Fog
    48: "fa-smog", # Depositing rime fog
    51: "fa-cloud-rain", # Drizzle: Light
    53: "fa-cloud-rain", # Drizzle: Moderate
    55: "fa-cloud-showers-heavy", # Drizzle: Dense
    61: "fa-cloud-rain", # Rain: Slight
    63: "fa-cloud-rain", # Rain: Moderate
    65: "fa-cloud-showers-heavy", # Rain: Heavy
    80: "fa-cloud-showers-heavy", # Rain showers: Slight
    81: "fa-cloud-showers-heavy", # Rain showers: Moderate
    82: "fa-cloud-showers-heavy", # Rain showers: Violent
    95: "fa-bolt", # Thunderstorm
}

@app.template_filter('day_of_week')
def day_of_week_filter(date_str):
    if not date_str:
        return ""
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        return date_obj.strftime('%a')
    except ValueError:
        return ""

def load_users():
    if not os.path.exists("users.json"):
        return {}
    with open("users.json", "r") as f:
        return json.load(f)

def save_users(users):
    with open("users.json", "w") as f:
        json.dump(users, f, indent=4)

USERS = load_users()

# Default settings for new users
USER_DEFAULTS = {
    "selected_cities": [c for c in ALL_CITIES if c['name'] in ['New York', 'London', 'Paris', 'Tokyo', 'Sydney', 'Dubai']],
    "units": "celsius" # Default unit for new users
}


@app.template_filter('weather_icon')
def weather_icon_filter(weather_code):
    return WEATHER_ICONS.get(weather_code, "fa-question-circle")


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
OPENWEATHERMAP_URL = "https://api.openweathermap.org/data/3.0/onecall"


def get_weather_alerts(lat, lon):
    alerts = []
    if not OPENWEATHERMAP_API_KEY:
        app.logger.warning("OPENWEATHERMAP_API_KEY is not set. Skipping weather alerts.")
        return alerts
    try:
        params = {
            "lat": lat,
            "lon": lon,
            "appid": OPENWEATHERMAP_API_KEY,
            "exclude": "current,minutely,hourly,daily" # Only request alerts
        }
        app.logger.info(f"Requesting OpenWeatherMap Alerts API with params: {params}")
        owm_resp = requests.get(OPENWEATHERMAP_URL, params=params, timeout=5)
        app.logger.info(f"OpenWeatherMap Alerts API response status: {owm_resp.status_code}")
        if owm_resp.ok:
            owm_json = owm_resp.json()
            app.logger.info(f"OpenWeatherMap Alerts API response JSON: {owm_json}")
            alerts = owm_json.get("alerts", [])
    except Exception as e:
        app.logger.error(f"An error occurred in get_weather_alerts: {e}", exc_info=True)
    return alerts


def get_air_quality_data(lat, lon):
    air_quality = None
    try:
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "european_aqi,pm10,pm2_5,pollen_grass,pollen_tree,pollen_weed",
            "forecast_days": 1,
            "timezone": "UTC"
        }
        app.logger.info(f"Requesting Open-Meteo Air Quality API with params: {params}")
        aq_resp = requests.get(OPEN_METEO_AIR_QUALITY_URL, params=params, timeout=5)
        app.logger.info(f"Open-Meteo Air Quality API response status: {aq_resp.status_code}")
        if aq_resp.ok:
            aq_json = aq_resp.json()
            app.logger.info(f"Open-Meteo Air Quality API response JSON: {aq_json}")
            current_hour = datetime.utcnow().hour
            
            hourly_data = aq_json.get("hourly", {})
            if hourly_data and hourly_data.get("time") and len(hourly_data["time"]) > current_hour:
                air_quality = {
                    "european_aqi": hourly_data["european_aqi"][current_hour],
                    "pm10": hourly_data["pm10"][current_hour],
                    "pm2_5": hourly_data["pm2_5"][current_hour],
                    "pollen_grass": hourly_data["pollen_grass"][current_hour],
                    "pollen_tree": hourly_data["pollen_tree"][current_hour],
                    "pollen_weed": hourly_data["pollen_weed"][current_hour],
                }
    except Exception as e:
        app.logger.error(f"An error occurred in get_air_quality_data: {e}", exc_info=True)
    return air_quality


def get_outfit_recommendation(temperature, weather_code, unit):
    if temperature is None or weather_code is None:
        return "N/A"

    if unit == "fahrenheit":
        # Convert to Celsius for consistent logic
        temperature_c = (temperature - 32) * 5/9
    else:
        temperature_c = temperature

    if weather_code in [95]: # Thunderstorm
        return "Stay indoors or wear waterproof gear!"
    elif weather_code in [51, 53, 55, 61, 63, 65, 80, 81, 82]: # Drizzle, Rain showers
        return "Don't forget your umbrella and a waterproof jacket!"
    elif temperature_c < 0:
        return "Bundle up! Heavy coat, hat, gloves, and warm boots."
    elif 0 <= temperature_c < 10:
        return "Warm jacket, sweater, and long pants."
    elif 10 <= temperature_c < 20:
        return "Light jacket or sweater, long-sleeved shirt."
    elif 20 <= temperature_c < 25:
        return "T-shirt and shorts/light pants. Maybe a light cover-up."
    else: # temperature_c >= 25
        return "Light clothing, like shorts and a t-shirt. Stay cool!"

def get_activity_recommendation(temperature, weather_code, unit):
    if temperature is None or weather_code is None:
        return "N/A"

    if unit == "fahrenheit":
        temperature_c = (temperature - 32) * 5/9
    else:
        temperature_c = temperature
    
    # Rainy/Stormy
    if weather_code in [51, 53, 55, 61, 63, 65, 80, 81, 82, 95]:
        return "Great day for indoor activities: read a book, watch a movie, or visit a museum!"
    # Cold weather
    elif temperature_c < 5:
        return "Consider indoor sports, hot yoga, or a cozy cafe visit."
    # Cool/Mild weather
    elif 5 <= temperature_c < 18:
        return "Perfect weather for a walk, hiking, or cycling!"
    # Warm weather
    elif 18 <= temperature_c < 28:
        return "Enjoy outdoor activities like picnics, swimming, or park visits!"
    # Hot weather
    else: # temperature_c >= 28
        return "Head to the beach, go for a swim, or enjoy some ice cream!"

def get_weather_tip(weather_code, unit):
    if weather_code is None:
        return "N/A"
    
    if weather_code in [95]: # Thunderstorm
        return "Seek shelter immediately during a thunderstorm!"
    elif weather_code in [51, 53, 55, 61, 63, 65, 80, 81, 82]: # Drizzle, Rain showers
        return "Drive safely in wet conditions. Reduce speed and increase following distance."
    elif weather_code in [45, 48]: # Fog
        return "Visibility is low due to fog. Drive carefully and use fog lights."
    else:
        return "Check the forecast regularly and stay informed!"


def get_city_data(city, unit="celsius"):
    app.logger.info(f"Fetching data for city: {city['name']}, unit: {unit}")
    lat = city["lat"]
    lon = city["lon"]
    tz = city.get('tz', 'UTC')
    weather = None
    time_str = None
    forecast = []
    air_quality = get_air_quality_data(lat, lon) # Fetch air quality data
    alerts = get_weather_alerts(lat, lon) # Fetch weather alerts
    
    outfit_recommendation = None
    activity_recommendation = None

    try:
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,weather_code,windspeed_10m,winddirection_10m,dewpoint_2m,visibility",
            "daily": "weathercode,temperature_2m_max,temperature_2m_min,uv_index_max",
            "forecast_days": 6,
            "timezone": "UTC",
            "temperature_unit": unit
        }
        app.logger.info(f"Requesting Open-Meteo API with params: {params}")
        wresp = requests.get(OPEN_METEO_URL, params=params, timeout=5)
        app.logger.info(f"Open-Meteo API response status: {wresp.status_code}")
        if wresp.ok:
            wj = wresp.json()
            app.logger.info(f"Open-Meteo API response JSON: {wj}")
            cw = wj.get("current", {})
            
            # Get outfit recommendation
            current_temperature = cw.get("temperature_2m")
            current_weather_code = cw.get("weather_code")
            outfit_recommendation = get_outfit_recommendation(current_temperature, current_weather_code, unit)
            activity_recommendation = get_activity_recommendation(current_temperature, current_weather_code, unit)
            weather_tip = get_weather_tip(current_weather_code, unit)
            
            weather = {
                "temperature": current_temperature,
                "windspeed": cw.get("windspeed_10m"),
                "winddirection": cw.get("winddirection_10m"),
                "dewpoint": cw.get("dewpoint_2m"),
                "visibility": cw.get("visibility"),
                "weather_code": current_weather_code,
            }            
            daily_data = wj.get("daily", {})
            if daily_data:
                for i in range(1, 6): # 5-day forecast
                    forecast.append({
                        "date": daily_data["time"][i],
                        "weathercode": daily_data["weathercode"][i],
                        "temp_max": daily_data["temperature_2m_max"][i],
                        "temp_min": daily_data["temperature_2m_min"][i],
                        "uv_index": daily_data["uv_index_max"][i],
                    })
        else:
            app.logger.error(f"Open-Meteo API request failed with status code: {wresp.status_code}")
            app.logger.error(f"Response content: {wresp.text}")


    except Exception as e:
        app.logger.error(f"An error occurred in get_city_data: {e}", exc_info=True)
        weather = None
        forecast = []

    try:
        # Prefer server-side timezone conversion to avoid external API failures
        if ZoneInfo is not None:
            try:
                now = datetime.now(ZoneInfo(tz))
                time_str = now.isoformat()
            except Exception:
                # log details for diagnosis and fall back
                app.logger.exception(f"ZoneInfo failed for timezone: {tz}")
                time_str = None
        else:
            # Fallback: use UTC ISO timestamp
            time_str = datetime.utcnow().isoformat() + 'Z'
    except Exception:
        app.logger.exception('Unexpected error computing local time')
        time_str = None
    
    result = {
        "id": city["id"],
        "name": city["name"],
        "weather": weather,
        "datetime": time_str,
        "timezone": tz,
        "forecast": forecast,
        "air_quality": air_quality, # Add air quality data
        "alerts": alerts,
        "outfit_recommendation": outfit_recommendation, # Add outfit recommendation
        "activity_recommendation": activity_recommendation, # Add activity recommendation
        "weather_tip": weather_tip # Add weather tip
    }
    app.logger.info(f"Returning data for city {city['name']}: {result}")
    return result

def login_required(fn):
    from functools import wraps
    @wraps(fn)
    def wrapped(*args, **kwargs):
        app.logger.info(f"Checking login for route: {request.path}")
        if not session.get("user"):
            app.logger.info("User not logged in, redirecting to login.")
            return redirect(url_for("login", next=request.path))
        app.logger.info("User is logged in.")
        return fn(*args, **kwargs)
    return wrapped

@app.route("/login", methods=["GET", "POST"])
def login():
    app.logger.info(f"Accessed /login route with method: {request.method}")
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        app.logger.info(f"Attempting to log in user: {username}")
        
        user_data = USERS.get(username)
        if user_data:
            # Handle both old (string) and new (dict) user formats
            is_valid = False
            if isinstance(user_data, dict):
                is_valid = check_password_hash(user_data.get("password_hash"), password)
            elif isinstance(user_data, str):
                is_valid = check_password_hash(user_data, password)

            if is_valid:
                app.logger.info(f"User {username} logged in successfully.")
                session["user"] = username
                if isinstance(user_data, dict):
                    session["selected_cities"] = user_data.get("selected_cities", USER_DEFAULTS["selected_cities"])
                    session["units"] = user_data.get("units", USER_DEFAULTS["units"])
                else:
                    # Upgrade old user to new format
                    app.logger.info(f"Upgrading user {username} to new data format.")
                    USERS[username] = {
                        "password_hash": user_data,
                        "selected_cities": USER_DEFAULTS["selected_cities"],
                        "units": USER_DEFAULTS["units"]
                    }
                    save_users(USERS)
                    session["selected_cities"] = USER_DEFAULTS["selected_cities"]
                    session["units"] = USER_DEFAULTS["units"]

                nxt = request.args.get("next") or url_for("index")
                app.logger.info(f"Redirecting to: {nxt}")
                return redirect(nxt)
        
        app.logger.warning(f"Invalid login attempt for username: {username}")
        return render_template("login.html", error="Invalid credentials")
    return render_template("login.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    app.logger.info(f"Accessed /register route with method: {request.method}")
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        app.logger.info(f"Attempting to register user: {username}")
        if username in USERS:
            app.logger.warning(f"Registration failed for user {username}: username already exists.")
            return render_template("register.html", error="Username already exists")
        
        USERS[username] = {
            "password_hash": generate_password_hash(password),
            "selected_cities": USER_DEFAULTS["selected_cities"],
            "units": USER_DEFAULTS["units"]
        }
        save_users(USERS)
        app.logger.info(f"User {username} registered successfully.")
        
        session["user"] = username
        session["selected_cities"] = USERS[username]["selected_cities"]
        session["units"] = USERS[username]["units"]
        return redirect(url_for("index"))
    return render_template("register.html")

@app.route("/logout")
def logout():
    app.logger.info("Logging out user.")
    session.pop("user", None)
    session.pop("selected_cities", None)
    session.pop("units", None) # Clear units from session
    return redirect(url_for("login"))

@app.route("/")
@login_required
def index():
    app.logger.info("Accessed / route.")
    # fetch data for server-render
    data = [get_city_data(c, session.get("units")) for c in session.get("selected_cities", [])]
    return render_template("index.html", cities=data, units=session.get("units", USER_DEFAULTS["units"]))

@app.route("/api/data")
@login_required
def api_data():
    app.logger.info("Accessed /api/data route.")
    data = [get_city_data(c, session.get("units")) for c in session.get("selected_cities", [])]
    return jsonify(data)

@app.route("/api/user/units", methods=["GET", "POST"])
@login_required
def api_user_units():
    app.logger.info(f"Accessed /api/user/units route with method: {request.method}")
    if request.method == "GET":
        return jsonify({"units": session.get("units", USER_DEFAULTS["units"])})
    
    if request.method == "POST":
        new_units = request.json.get("units")
        app.logger.info(f"Updating units to: {new_units}")
        if new_units in ["celsius", "fahrenheit"]:
            session["units"] = new_units
            USERS[session["user"]]["units"] = new_units
            save_users(USERS)
            return jsonify({"units": new_units})
        app.logger.warning(f"Invalid unit provided: {new_units}")
        return jsonify({"error": "Invalid unit"}), 400

@app.route("/api/weather_alerts")
@login_required
def api_weather_alerts():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if not lat or not lon:
        return jsonify({"error": "Missing coordinates"}), 400
    alerts = get_weather_alerts(lat, lon)
    return jsonify({"alerts": alerts})


@app.route("/api/cities")
@login_required
def api_cities():
    app.logger.info("Accessed /api/cities route.")
    if not ALL_CITIES:
        app.logger.error("City data not loaded.")
        return jsonify({"error": "City data not loaded. Please check if 'worldcities.csv' is in the 'static' directory."}), 500
    return jsonify(ALL_CITIES)

@app.route("/api/user/cities", methods=["GET", "POST", "DELETE"])
@login_required
def api_user_cities():
    app.logger.info(f"Accessed /api/user/cities route with method: {request.method}")
    if request.method == "GET":
        return jsonify(session.get("selected_cities", []))
    
    if request.method == "POST":
        city = request.json
        app.logger.info(f"Adding city: {city}")
        if city:
            selected_cities = session.get("selected_cities", [])
            if city not in selected_cities:
                selected_cities.append(city)
                USERS[session["user"]]["selected_cities"] = selected_cities
                save_users(USERS)
            return jsonify(city)

    if request.method == "DELETE":
        city = request.json
        app.logger.info(f"Removing city: {city}")
        if city:
            selected_cities = session.get("selected_cities", [])
            if city in selected_cities:
                selected_cities.remove(city)
                USERS[session["user"]]["selected_cities"] = selected_cities
                save_users(USERS)
            return jsonify(city)

    return jsonify({"status": "ok"})


@app.route("/api/historical_weather")
@login_required
def api_historical_weather():
    app.logger.info("Accessed /api/historical_weather route.")
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    if not all([lat, lon, start_date, end_date]):
        app.logger.warning("Missing required parameters for historical weather.")
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date,
            "end_date": end_date,
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
        }
        app.logger.info(f"Requesting historical weather with params: {params}")
        resp = requests.get("https://archive-api.open-meteo.com/v1/era5", params=params, timeout=10)
        app.logger.info(f"Historical weather API response status: {resp.status_code}")
        if resp.ok:
            return jsonify(resp.json())
        else:
            app.logger.error(f"Failed to fetch historical data with status code: {resp.status_code}")
            return jsonify({"error": "Failed to fetch historical data"}), resp.status_code
    except Exception as e:
        app.logger.error(f"An error occurred in api_historical_weather: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch historical data"}), 500

if __name__ == "__main__":
    app.run(debug=True)
