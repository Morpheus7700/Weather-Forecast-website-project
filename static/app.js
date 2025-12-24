let cityTimes = {};
let cityTimezones = {};

let currentUnits = document.getElementById("user-units").value; // 'celsius' or 'fahrenheit'

const WEATHER_ICONS = {
    0: "fa-sun", 1: "fa-cloud-sun", 2: "fa-cloud-sun", 3: "fa-cloud",
    45: "fa-smog", 48: "fa-smog", 51: "fa-cloud-rain", 53: "fa-cloud-rain",
    55: "fa-cloud-showers-heavy", 61: "fa-cloud-rain", 63: "fa-cloud-rain",
    65: "fa-cloud-showers-heavy", 80: "fa-cloud-showers-heavy",
    81: "fa-cloud-showers-heavy", 82: "fa-cloud-showers-heavy", 95: "fa-bolt",
};

function getDayOfWeek(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function getWeatherIcon(weatherCode) {
    return WEATHER_ICONS[weatherCode] || "fa-question-circle";
}

async function fetchData(){
  try{
    const r = await fetch('/api/data'); // Backend now handles unit conversion
    if(!r.ok) return;
    const data = await r.json();
    data.forEach(c=>{
      const card = document.getElementById('card-'+c.id);
      if(!card) return;
      
      const tempValue = card.querySelector('.temp-value');
      const windValue = card.querySelector('.wind-value');
      const uvValue = card.querySelector('.uv-value');
      const dewpointValue = card.querySelector('.dewpoint-value');
      const visibilityValue = card.querySelector('.visibility-value');
      const aqiValue = card.querySelector('.aqi-value');
      const pm25Value = card.querySelector('.pm25-value');
      const pm10Value = card.querySelector('.pm10-value');
      const pollenGrassValue = card.querySelector('.pollen-grass-value');
      const pollenTreeValue = card.querySelector('.pollen-tree-value');
      const pollenWeedValue = card.querySelector('.pollen-weed-value');

      tempValue.textContent = c.weather && c.weather.temperature!=null ? c.weather.temperature.toFixed(1) : '—';
      windValue.textContent = c.weather && c.weather.windspeed!=null ? c.weather.windspeed.toFixed(1) : '—';
      dewpointValue.textContent = c.weather && c.weather.dewpoint!=null ? c.weather.dewpoint.toFixed(1) : '—';
      visibilityValue.textContent = c.weather && c.weather.visibility!=null ? (c.weather.visibility / 1000).toFixed(1) : '—'; // Convert meters to km
      uvValue.textContent = c.forecast && c.forecast.length > 0 && c.forecast[0].uv_index != null ? c.forecast[0].uv_index.toFixed(1) : '—';
      aqiValue.textContent = c.air_quality && c.air_quality.european_aqi != null ? c.air_quality.european_aqi : '—';
      pm25Value.textContent = c.air_quality && c.air_quality.pm25 != null ? c.air_quality.pm25.toFixed(1) : '—';
      pm10Value.textContent = c.air_quality && c.air_quality.pm10 != null ? c.air_quality.pm10.toFixed(1) : '—';
      pollenGrassValue.textContent = c.air_quality && c.air_quality.pollen_grass != null ? c.air_quality.pollen_grass : '—';
      pollenTreeValue.textContent = c.air_quality && c.air_quality.pollen_tree != null ? c.air_quality.pollen_tree : '—';
      pollenWeedValue.textContent = c.air_quality && c.air_quality.pollen_weed != null ? c.air_quality.pollen_weed : '—';
      
      const cityAlertsContainer = card.querySelector('.city-alerts');
      if (cityAlertsContainer) {
          cityAlertsContainer.innerHTML = ''; // Clear previous alerts
          if (c.alerts && c.alerts.length > 0) {
              c.alerts.forEach(alert => {
                  const alertDiv = document.createElement('div');
                  alertDiv.classList.add('alert-item');
                  alertDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <strong>${alert.event}</strong>: ${alert.description}`;
                  cityAlertsContainer.appendChild(alertDiv);
              });
          }
      }

      const outfitRecommendationValue = card.querySelector('.outfit-recommendation-value');
      outfitRecommendationValue.textContent = c.outfit_recommendation || '—';

      const activityRecommendationValue = card.querySelector('.activity-recommendation-value');
      activityRecommendationValue.textContent = c.activity_recommendation || '—';

      const weatherTipValue = card.querySelector('.weather-tip-value');
      weatherTipValue.textContent = c.weather_tip || '—';

      if(c.datetime && c.timezone){
        cityTimes[c.id] = new Date(c.datetime);
        cityTimezones[c.id] = c.timezone;
      } else {
        cityTimes[c.id] = null;
        cityTimezones[c.id] = null;
      }
      
      updateForecast(card, c.forecast);
    });
  } catch(e) {
    console.error('update failed', e);
  }
}

function updateForecast(card, forecast) {
    const forecastContainer = card.querySelector('.forecast-container');
    if (!forecastContainer || !forecast || forecast.length === 0) {
        if(forecastContainer) forecastContainer.innerHTML = '';
        return;
    }

    let forecastHTML = '';
    const unitSymbol = currentUnits === 'celsius' ? 'C' : 'F';
    forecast.forEach(day => {
        forecastHTML += `
            <div class="forecast-day">
                <div class="forecast-date">${getDayOfWeek(day.date)}</div>
                <div class="forecast-icon"><i class="fas ${getWeatherIcon(day.weathercode)}"></i></div>
                <div class="forecast-temp">
                    <span class="temp-max">${day.temp_max.toFixed(0)}°${unitSymbol}</span> / <span class="temp-min">${day.temp_min.toFixed(0)}°${unitSymbol}</span>
                </div>
                <div class="forecast-uv">UV: ${day.uv_index.toFixed(1)}</div>
            </div>
        `;
    });
    forecastContainer.innerHTML = forecastHTML;
}

function updateTimes(){
  Object.keys(cityTimes).forEach(id=>{
    const initialTime = cityTimes[id];
    const tz = cityTimezones[id];
    if(!initialTime || !tz) return;
    const card = document.getElementById('card-'+id);
    if(!card) return;
    const timeValue = card.querySelector('.time-value');
    
    // Use Intl.DateTimeFormat for reliable time formatting
    try {
        timeValue.textContent = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: tz
        }).format(new Date());
    } catch (e) {
        // Fallback for invalid timezones
        timeValue.textContent = new Date().toLocaleTimeString('en-US', {hour12: false});
        console.error("Time formatting failed for timezone:", tz)
    }
  });
}

// initial fetch and every 60s
fetchData();
setInterval(fetchData, 60000);

// update times every second
setInterval(updateTimes, 1000);

const weatherMap = document.getElementById("weather-map");

const WINDY_BASE_URL = "https://www.windy.com/embed2.html";
let currentMapLayer = "wind"; // Default map layer

function generateWindyUrl(lat, lon, zoom = 5, layer = "wind") {
    let windyLayer = "wind";
    if (layer === "temperature") {
        windyLayer = "temp";
    } else if (layer === "precipitation") {
        windyLayer = "rain";
    }

    return `${WINDY_BASE_URL}?lat=${lat}&lon=${lon}&zoom=${zoom}&points=one&overlay=${windyLayer}&product=ecmwf&metric_temp=c&metric_wind=km/h&detailLat=${lat}&detailLon=${lon}&detail=true&marker=true&message=true&calendar=false&actualGrid=false&radarRange=-1`;
}

function updateMap(lat, lon, layer = currentMapLayer) {
    if (weatherMap) {
        weatherMap.src = generateWindyUrl(lat, lon, 5, layer);
    }
}

const mapWindBtn = document.getElementById("map-wind-btn");
const mapTempBtn = document.getElementById("map-temp-btn");
const mapPrecipBtn = document.getElementById("map-precip-btn");

mapWindBtn.addEventListener("click", () => {
    currentMapLayer = "wind";
    updateMap(selectedCities[0]?.lat || 0, selectedCities[0]?.lon || 0, currentMapLayer); // Use first selected city or default
});

mapTempBtn.addEventListener("click", () => {
    currentMapLayer = "temperature";
    updateMap(selectedCities[0]?.lat || 0, selectedCities[0]?.lon || 0, currentMapLayer);
});

mapPrecipBtn.addEventListener("click", () => {
    currentMapLayer = "precipitation";
    updateMap(selectedCities[0]?.lat || 0, selectedCities[0]?.lon || 0, currentMapLayer);
});


// City Management Modal
const modal = document.getElementById("city-modal");
const editCitiesBtn = document.getElementById("edit-cities-btn");
const closeBtn = document.querySelector(".close-btn");
const citySearch = document.getElementById("city-search");
const cityList = document.getElementById("city-list");
const citiesGrid = document.querySelector(".cities-grid");

let allCities = [];
let selectedCities = [];

const toggleTempUnitBtn = document.getElementById("toggle-temp-unit");
const currentUnitDisplay = document.getElementById("current-unit-display");
const toggleThemeBtn = document.getElementById("toggle-theme-btn");

// Theme switching
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    toggleThemeBtn.innerHTML = '<i class="fas fa-moon"></i>';
}

toggleThemeBtn.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    const isLightMode = document.body.classList.contains("light-mode");
    localStorage.setItem("theme", isLightMode ? "light" : "dark");
    toggleThemeBtn.innerHTML = isLightMode ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
});


function renderDashboard() {
    citiesGrid.innerHTML = '';
    const unitSymbol = currentUnits === 'celsius' ? 'C' : 'F';
    selectedCities.forEach(city => {
        const cityCard = document.createElement('div');
        cityCard.classList.add('city-card');
        cityCard.id = `card-${city.id}`;
        cityCard.innerHTML = `
            <h3>${city.name}</h3>
            <div class="time"><i class="fas fa-clock"></i> <span class="time-value">—</span></div>
            <div class="temp"><i class="fas fa-thermometer-half"></i> <span class="temp-value">—</span> °${unitSymbol}</div>
            <div class="dewpoint"><i class="fas fa-tint"></i> Dewpoint: <span class="dewpoint-value">—</span> °${unitSymbol}</div>
            <div class="visibility"><i class="fas fa-eye"></i> Visibility: <span class="visibility-value">—</span> km</div>
            <div class="wind"><i class="fas fa-wind"></i> <span class="wind-value">—</span> m/s</div>
            <div class="uv"><i class="fas fa-sun"></i> UV Index: <span class="uv-value">—</span></div>
            <div class="aqi"><i class="fas fa-smog"></i> AQI: <span class="aqi-value">—</span></div>
            <div class="pm25"><i class="fas fa-smog"></i> PM2.5: <span class="pm25-value">—</span> µg/m³</div>
            <div class="pm10"><i class="fas fa-smog"></i> PM10: <span class="pm10-value">—</span> µg/m³</div>
            <div class="pollen-grass"><i class="fas fa-leaf"></i> Pollen (Grass): <span class="pollen-grass-value">—</span></div>
            <div class="pollen-tree"><i class="fas fa-tree"></i> Pollen (Tree): <span class="pollen-tree-value">—</span></div>
            <div class="pollen-weed"><i class="fas fa-seedling"></i> Pollen (Weed): <span class="pollen-weed-value">—</span></div>
            <div class="city-alerts"></div>
            <div class="outfit-recommendation"><i class="fas fa-tshirt"></i> Outfit: <span class="outfit-recommendation-value">—</span></div>
            <div class="activity-recommendation"><i class="fas fa-running"></i> Activity: <span class="activity-recommendation-value">—</span></div>
            <div class="weather-tip"><i class="fas fa-lightbulb"></i> Tip: <span class="weather-tip-value">—</span></div>
            <div class="forecast-container"></div>
        `;
        cityCard.addEventListener('click', () => {
            updateMap(city.lat, city.lon, currentMapLayer);
            fetchHistoricalData(city.lat, city.lon);
        });
        citiesGrid.appendChild(cityCard);
    });
    fetchData();
}

async function openModal() {
    await Promise.all([fetchAllCities(), fetchSelectedCities()]);
    renderCityList();
    modal.style.display = "block";
}

function closeModal() {
    modal.style.display = "none";
}

async function fetchAllCities() {
    try {
        const r = await fetch('/api/cities');
        if (r.ok) {
            allCities = await r.json();
        }
    } catch (e) {
        console.error('Failed to fetch all cities', e);
    }
}

async function fetchSelectedCities() {
    try {
        const r = await fetch('/api/user/cities');
        if (r.ok) {
            selectedCities = await r.json();
        }
    } catch (e) {
        console.error('Failed to fetch selected cities', e);
    }
}

function renderCityList() {
    const searchTerm = citySearch.value.toLowerCase();
    cityList.innerHTML = '';
    
    const filteredCities = allCities.filter(city =>
        city.name.toLowerCase().includes(searchTerm) ||
        (city.country && city.country.toLowerCase().includes(searchTerm))
    );

    filteredCities.forEach(city => {
        const li = document.createElement("li");
        const isSelected = selectedCities.some(sc => sc.id === city.id);
        
        li.innerHTML = `
            <span>${city.name}, ${city.country}</span>
            <button class="${isSelected ? 'remove-btn' : 'add-btn'}" data-city-id="${city.id}">
                ${isSelected ? 'Remove' : 'Add'}
            </button>
        `;
        
        const button = li.querySelector('button');
        button.addEventListener('click', () => {
            if (isSelected) {
                removeCity(city);
            }
            else {
                addCity(city);
            }
        });
        
        cityList.appendChild(li);
    });
}

async function addCity(city) {
    try {
        const r = await fetch('/api/user/cities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(city)
        });
        if (r.ok) {
            selectedCities.push(city);
            renderCityList();
            renderDashboard(); 
        }
    } catch (e) {
        console.error('Failed to add city', e);
    }
}

async function removeCity(city) {
    try {
        const r = await fetch('/api/user/cities', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(city)
        });
        if (r.ok) {
            selectedCities = selectedCities.filter(sc => sc.id !== city.id);
            renderCityList();
            renderDashboard();
        }
    } catch (e) {
        console.error('Failed to remove city', e);
    }
}


editCitiesBtn.addEventListener("click", openModal);
closeBtn.addEventListener("click", closeModal);
citySearch.addEventListener("input", renderCityList);
window.addEventListener("click", (event) => {
    if (event.target == modal) {
        closeModal();
    }
});

toggleTempUnitBtn.addEventListener("click", async () => {
    const newUnits = currentUnits === 'celsius' ? 'fahrenheit' : 'celsius';
    try {
        const r = await fetch('/api/user/units', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ units: newUnits })
        });
        if (r.ok) {
            currentUnits = newUnits;
            currentUnitDisplay.textContent = currentUnits.toUpperCase();
            renderDashboard();
            getCurrentLocationWeather();
            // Re-render chart if visible
            const activeCard = document.querySelector('.city-card.active'); // Assuming an 'active' class for the selected city
            if (activeCard) {
                const cityId = activeCard.id.split('-')[1];
                const city = selectedCities.find(c => c.id == cityId);
                if (city) {
                    fetchHistoricalData(city.lat, city.lon);
                }
            }
        }
    } catch (e) {
        console.error('Failed to update units', e);
    }
});

// Initial load
fetchSelectedCities().then(() => {
    renderDashboard();
    populateHistoricalCitySelect();
    if (selectedCities.length > 0) {
        updateMap(selectedCities[0].lat, selectedCities[0].lon, currentMapLayer); // Initial map view
    }
});
getCurrentLocationWeather();

const historicalCitySelect = document.getElementById("historical-city-select");
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const getHistoryBtn = document.getElementById("get-history-btn");

function populateHistoricalCitySelect() {
    historicalCitySelect.innerHTML = '';
    selectedCities.forEach(city => {
        const option = document.createElement('option');
        option.value = city.id;
        option.textContent = city.name;
        historicalCitySelect.appendChild(option);
    });
}

getHistoryBtn.addEventListener("click", () => {
    const cityId = historicalCitySelect.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const city = selectedCities.find(c => c.id == cityId);

    if (city && startDate && endDate) {
        fetchHistoricalData(city.lat, city.lon, startDate, endDate);
    }
});


let weatherChart;

function getCurrentLocationWeather() {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(position => {
            fetchCurrentLocationWeather(position.coords.latitude, position.coords.longitude);
        }, error => {
            const detailsDiv = document.getElementById('current-location-details');
            if (detailsDiv) {
                detailsDiv.innerHTML = '<p>Could not get your location. Please allow location access.</p>';
            }
        });
    } else {
        const detailsDiv = document.getElementById('current-location-details');
        if (detailsDiv) {
            detailsDiv.innerHTML = '<p>Geolocation is not supported by your browser.</p>';
        }
    }
}

async function fetchCurrentLocationWeather(lat, lon) {
    try {
        const [weatherResp, locationResp, airQualityResp, alertsResp] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,dewpoint_2m,visibility&hourly=uv_index&temperature_unit=${currentUnits}&forecast_days=1`),
            fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`),
            fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=european_aqi,pm10,pm2_5,pollen_grass,pollen_tree,pollen_weed&forecast_days=1&timezone=UTC`),
            fetch(`/api/weather_alerts?lat=${lat}&lon=${lon}`) // New API endpoint for alerts
        ]);

        if (weatherResp.ok && locationResp.ok && airQualityResp.ok && alertsResp.ok) {
            const weatherData = await weatherResp.json();
            const locationData = await locationResp.json();
            const airQualityData = await airQualityResp.json();
            const alertsData = await alertsResp.json();

            const cityName = locationData.city;
            const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            
            const currentHour = new Date().getHours();
            const uvIndex = weatherData.hourly.uv_index[currentHour];
            const aqi = airQualityData.hourly.european_aqi[currentHour];
            const pm25 = airQualityData.hourly.pm2_5[currentHour];
            const pm10 = airQualityData.hourly.pm10[currentHour];
            const pollenGrass = airQualityData.hourly.pollen_grass[currentHour];
            const pollenTree = airQualityData.hourly.pollen_tree[currentHour];
            const pollenWeed = airQualityData.hourly.pollen_weed[currentHour];
            const currentTemp = weatherData.current.temperature_2m;
            const currentWeatherCode = weatherData.current.weather_code;
            
            document.getElementById('current-location-name').textContent = cityName;
            document.getElementById('current-location-temp').textContent = `${weatherData.current.temperature_2m.toFixed(1)}°${currentUnits === 'celsius' ? 'C' : 'F'}`;
            document.getElementById('current-location-dewpoint').textContent = `${weatherData.current.dewpoint_2m.toFixed(1)}°${currentUnits === 'celsius' ? 'C' : 'F'}`;
            document.getElementById('current-location-visibility').textContent = `${(weatherData.current.visibility / 1000).toFixed(1)} km`;
            document.getElementById('current-location-uv-index').textContent = uvIndex.toFixed(1);
            document.getElementById('current-location-aqi').textContent = aqi != null ? aqi : '—';
            document.getElementById('current-location-pm25').textContent = pm25 != null ? pm25.toFixed(1) : '—';
            document.getElementById('current-location-pm10').textContent = pm10 != null ? pm10.toFixed(1) : '—';
            document.getElementById('current-location-pollen-grass').textContent = pollenGrass != null ? pollenGrass : '—';
            document.getElementById('current-location-pollen-tree').textContent = pollenTree != null ? pollenTree : '—';
            document.getElementById('current-location-pollen-weed').textContent = pollenWeed != null ? pollenWeed : '—';
            document.getElementById('current-location-outfit').textContent = weatherData.outfit_recommendation || '—'; // Assuming backend provides this
            document.getElementById('current-location-activity').textContent = weatherData.activity_recommendation || '—'; // Assuming backend provides this
            document.getElementById('current-location-weather-tip').textContent = weatherData.weather_tip || '—'; // Assuming backend provides this
            document.getElementById('current-location-date').textContent = date;

            const globalAlertsContainer = document.getElementById('global-alerts-container');
            globalAlertsContainer.innerHTML = ''; // Clear previous alerts
            if (alertsData.alerts && alertsData.alerts.length > 0) {
                alertsData.alerts.forEach(alert => {
                    const alertDiv = document.createElement('div');
                    alertDiv.classList.add('alert-item');
                    alertDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <strong>${alert.event}</strong>: ${alert.description}`;
                    globalAlertsContainer.appendChild(alertDiv);
                });
            }
        }
    } catch (e) {
        console.error('Failed to fetch current location weather', e);
    }
}


async function fetchHistoricalData(lat, lon, startStr, endStr) {
    if (!startStr || !endStr) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        startStr = startDate.toISOString().split('T')[0];
        endStr = endDate.toISOString().split('T')[0];
    }

    try {
        const r = await fetch(`/api/historical_weather?lat=${lat}&lon=${lon}&start_date=${startStr}&end_date=${endStr}&temperature_unit=${currentUnits}`);
        if (r.ok) {
            const data = await r.json();
            renderWeatherChart(data);
        }
    } catch (e) {
        console.error('Failed to fetch historical data', e);
    }
}

function renderWeatherChart(data) {
    const ctx = document.getElementById('weather-chart').getContext('2d');
    
    if (weatherChart) {
        weatherChart.destroy();
    }

    const unitSymbol = currentUnits === 'celsius' ? 'C' : 'F';
    weatherChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.daily.time,
            datasets: [
                {
                    label: `Max Temperature (°${unitSymbol})`,
                    data: data.daily.temperature_2m_max,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                },
                {
                    label: `Min Temperature (°${unitSymbol})`,
                    data: data.daily.temperature_2m_min,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                },
                {
                    label: 'Precipitation (mm)', // Precipitation is always in mm, regardless of temp unit
                    data: data.daily.precipitation_sum,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

