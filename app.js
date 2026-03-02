function WeatherApp(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://api.openweathermap.org/data/2.5/weather';
    this.forecastUrl = 'https://api.openweathermap.org/data/2.5/forecast';

    this.searchBtn = document.getElementById('search-btn');
    this.cityInput = document.getElementById('city-input');
    this.weatherDisplay = document.getElementById('weather-display');

    this.recentSearchesSection = document.getElementById('recent-searches-section');
    this.recentSearchesContainer = document.getElementById('recent-searches-container');

    this.recentSearches = [];

    this.maxRecentSearches = 5;

    this.init();
}

/* ---------------- INIT ---------------- */

WeatherApp.prototype.init = function () {
    this.searchBtn.addEventListener(
        'click',
        this.handleSearch.bind(this)
    );

    this.cityInput.addEventListener(
        'keypress',
        function (event) {
            if (event.key === 'Enter') {
                this.handleSearch();
            }
        }.bind(this)
    );

    this.loadRecentSearches();
    this.loadLastCity();

    const clearBtn = document.getElementById('clear-history-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', this.clearHistory.bind(this));
    }

    this.showWelcome();
};

/* ---------------- WELCOME ---------------- */

WeatherApp.prototype.showWelcome = function () {
    const welcomeHTML = `
        <div class="welcome-message">
            <h2>🌤️ Welcome to SkyFetch!</h2>
            <p>Search for a city to get started.</p>
            <p id="sub-hp">Try: Paris, Tokyo, Bangalore</p>
        </div>
    `;
    this.weatherDisplay.innerHTML = welcomeHTML;
};

/* ---------------- HANDLE SEARCH ---------------- */

WeatherApp.prototype.handleSearch = function () {
    const city = this.cityInput.value.trim();

    if (!city) {
        this.showError('Please enter a valid city name.');
        return;
    }

    if (city.length < 2) {
        this.showError('City name is too short.');
        return;
    }

    this.getWeather(city);
    this.cityInput.value = '';
};

/* ---------------- GET WEATHER + FORECAST ---------------- */

WeatherApp.prototype.getWeather = async function (city) {
    this.showLoading();
    this.searchBtn.disabled = true;
    this.searchBtn.textContent = 'Searching...';

   const currentWeatherUrl = `${this.apiUrl}?q=${city}&appid=${this.apiKey}&units=metric`;

    try {
        const [currentWeather, forecastData] = await Promise.all([
            axios.get(currentWeatherUrl),
            this.getForecast(city)
        ]);
        this.saveRecentSearch(city);
        localStorage.setItem('lastCity', city);

        this.displayWeather(currentWeather.data);
        this.displayForecast(forecastData);

    } catch (error) {
        if (error.response && error.response.status === 404) {
            this.showError('City not found. Please check spelling.');
        } else {
            this.showError('Something went wrong. Please try again.');
        }
    } finally {
        this.searchBtn.disabled = false;
        this.searchBtn.textContent = 'Search';
    }
};

/* ---------------- DISPLAY CURRENT WEATHER ---------------- */

WeatherApp.prototype.displayWeather = function (data) {
    const cityName = data.name;
    const temperature = Math.round(data.main.temp);
    const description = data.weather[0].description;
    const icon = data.weather[0].icon;
    const iconUrl =
        `https://openweathermap.org/img/wn/${icon}@2x.png`;

    this.weatherDisplay.innerHTML = `
        <div class="weather-info">
            <h2 class="city-name">${cityName}</h2>
            <img src="${iconUrl}" class="weather-icon">
            <div class="temperature">${temperature}°C</div>
            <p class="description">${description}</p>
        </div>
    `;

    this.cityInput.focus();
};

/* ---------------- LOADING ---------------- */

WeatherApp.prototype.showLoading = function () {
    this.weatherDisplay.innerHTML = `
        <div class="loading-container">
            <div class="spinner"></div>
            <p>Loading weather data...</p>
        </div>
    `;
};

/* ---------------- ERROR ---------------- */

WeatherApp.prototype.showError = function (message) {
    this.weatherDisplay.innerHTML = `
        <div class="error-message">
            <strong>⚠️ Error</strong><br><br>
            ${message}
        </div>
    `;
};

/* ---------------- FORECAST ---------------- */

WeatherApp.prototype.getForecast = async function (city) {
   const url = `${this.forecastUrl}?q=${city}&appid=${this.apiKey}&units=metric`;

    const response = await axios.get(url);
    return response.data;
};

WeatherApp.prototype.processForecastData = function (data) {
    const dailyForecasts = data.list.filter(function (item) {
        return item.dt_txt.includes('12:00:00');
    });

    return dailyForecasts.slice(0, 5);
};

WeatherApp.prototype.displayForecast = function (data) {
    const dailyForecasts = this.processForecastData(data);

    const forecastHTML = dailyForecasts.map(function (day) {

        const date = new Date(day.dt * 1000);
        const dayName =
            date.toLocaleDateString('en-US', { weekday: 'short' });

        const temp = Math.round(day.main.temp);
        const description = day.weather[0].description;
        const icon = day.weather[0].icon;
        const iconUrl =
            `https://openweathermap.org/img/wn/${icon}@2x.png`;

        return `
            <div class="forecast-card">
                <h4>${dayName}</h4>
                <img src="${iconUrl}">
                <div>${temp}°C</div>
                <p>${description}</p>
            </div>
        `;
    }).join('');

    this.weatherDisplay.innerHTML += `
        <div class="forecast-section">
            <h3 class="forecast-title">5-Day Forecast</h3>
            <div class="forecast-container">
                ${forecastHTML}
            </div>
        </div>
    `;
};

/* -------------- LOAD RECENT SEARCHES -------------- */

WeatherApp.prototype.loadRecentSearches = function () {
    const saved = localStorage.getItem('recentSearches');

    if (saved) {
        this.recentSearches = JSON.parse(saved);
    }

    this.displayRecentSearches();
};

/* -------------- SAVE RECENT SEARCHES -------------- */

WeatherApp.prototype.saveRecentSearch = function (city) {
    const cityName = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();

    const index = this.recentSearches.indexOf(cityName);
    if (index > -1) {
        this.recentSearches.splice(index, 1);
    }

    this.recentSearches.unshift(cityName);

    if (this.recentSearches.length > this.maxRecentSearches) {
        this.recentSearches.pop(); // Remove last item
    }

    localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches));

    this.displayRecentSearches();
};

/* ------------ DISPLAY RECENT SEARCHES -------------- */

WeatherApp.prototype.displayRecentSearches = function () {
    this.recentSearchesContainer.innerHTML = '';

    if (this.recentSearches.length === 0) {
        this.recentSearchesSection.style.display = 'none';
        return;
    }

    this.recentSearchesSection.style.display = 'block';

    this.recentSearches.forEach(function(city) {
        const btn = document.createElement('button');
        btn.className = 'recent-search-btn';
        btn.textContent = city;
        
        btn.addEventListener('click', function() {
            this.cityInput.value = city;
            this.getWeather(city);
        }.bind(this));
        
        this.recentSearchesContainer.appendChild(btn);
    }.bind(this));
};

/* ----------- AUTO LOAD LAST SEARCHED CITY ----------- */

WeatherApp.prototype.loadLastCity = function () {
    const lastCity = localStorage.getItem('lastCity');

    if (lastCity) {
        this.getWeather(lastCity);
    } else {
        this.showWelcome();
    }
};

/* ------------------ CLEAR HISTORY ----------------- */

WeatherApp.prototype.clearHistory = function () {
    if (confirm('Clear all recent searches?')) {
        this.recentSearches = [];
        localStorage.removeItem('recentSearches');
        localStorage.removeItem('lastCity');
        this.displayRecentSearches();
    }
};

/* ---------------- CREATE INSTANCE ---------------- */

const app = new WeatherApp('32a09b92acaf9b09442e9baca05fe7db');