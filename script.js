const searchForm = document.querySelector("[data-searchForm]");
const searchInput = document.querySelector("[data-searchInput]");
const grantAccessBtn = document.querySelector("[data-grantAccess]");
const loader = document.querySelector(".loading-container");
const mainContent = document.querySelector(".main-content");
const forecastContainer = document.querySelector("[data-forecastContainer]");

const API_KEY = "d1845658f92b31c64bd94f06f7188c9c";
let currentUnit = "metric"; // default to Celsius
let globalForecastData = null; // Store forecast data globally for tab switching

// Initialize
getFromSessionStorage();
updateTime();
setInterval(updateTime, 60000); // update time every minute

function getFromSessionStorage() {
    const localCoordinates = sessionStorage.getItem("user-coordinates");
    if (!localCoordinates) {
        // Default city
        fetchWeatherByCity("London"); 
    } else {
        const coordinates = JSON.parse(localCoordinates);
        fetchWeatherByCoords(coordinates);
    }
}

// Fetch Current Weather & Forecast by City
async function fetchWeatherByCity(city) {
    showLoader();
    try {
        const resWeather = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${currentUnit}`);
        const resForecast = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=${currentUnit}`);
        
        if (!resWeather.ok) throw new Error("City not found");
        
        const weatherData = await resWeather.json();
        globalForecastData = await resForecast.json(); 
        
        renderCurrentWeather(weatherData);
        checkActiveTabAndRender(); 
        hideLoader();
    } catch (error) {
        hideLoader();
        alert("City not found. Please try again.");
    }
}

// Fetch Current Weather & Forecast by Coordinates (Geolocation)
async function fetchWeatherByCoords(coords) {
    const { lat, lon } = coords;
    showLoader();
    try {
        const resWeather = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`);
        const resForecast = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`);
        
        const weatherData = await resWeather.json();
        globalForecastData = await resForecast.json(); 
        
        renderCurrentWeather(weatherData);
        checkActiveTabAndRender(); 
        hideLoader();
    } catch (error) {
        hideLoader();
        alert("Failed to fetch location weather data.");
    }
}

function showLoader() { loader.style.display = "block"; }
function hideLoader() { loader.style.display = "none"; }

function updateTime() {
    const now = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    document.querySelector("[data-day]").innerText = days[now.getDay()];
    document.querySelector("[data-time]").innerText = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getWindDirection(degree) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return directions[Math.round(degree / 22.5) % 16];
}

function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function renderCurrentWeather(data) {
    // Left Sidebar Elements
    document.querySelector("[data-temp]").innerText = Math.round(data.main.temp);
    document.querySelector("[data-weatherIcon]").src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
    document.querySelector("[data-weatherDesc]").innerText = data.weather[0].description;
    document.querySelector("[data-cityName]").innerText = `${data.name}, ${data.sys.country}`;
    document.querySelector("[data-rainChance]").innerText = data.clouds.all;

    // Highlights Elements
    document.querySelector("[data-feelsLike]").innerText = Math.round(data.main.feels_like);
    
    // Wind
    let windSpeedVal = currentUnit === 'metric' ? Math.round(data.wind.speed * 3.6) : Math.round(data.wind.speed);
    document.querySelector("[data-windSpeed]").innerText = windSpeedVal;
    document.querySelector("[data-windDir]").innerText = getWindDirection(data.wind.deg);

    // Sun
    document.querySelector("[data-sunrise]").innerText = formatTime(data.sys.sunrise);
    document.querySelector("[data-sunset]").innerText = formatTime(data.sys.sunset);

    // Humidity
    const humidity = data.main.humidity;
    document.querySelector("[data-humidity]").innerText = humidity;
    document.querySelector("[data-humidityBar]").style.height = `${humidity}%`;
    document.querySelector("[data-humidityStatus]").innerText = humidity > 60 ? "High 💧" : humidity < 30 ? "Low 🌵" : "Normal 👍";

    // Visibility
    const visKm = (data.visibility / 1000).toFixed(1);
    document.querySelector("[data-visibility]").innerText = visKm;
    document.querySelector("[data-visStatus]").innerText = visKm > 8 ? "Good 😃" : visKm > 4 ? "Average 😕" : "Poor 🌫️";

    // Pressure
    const pressure = data.main.pressure;
    document.querySelector("[data-pressure]").innerText = pressure;
    document.querySelector("[data-pressureStatus]").innerText = pressure > 1020 ? "High 📈" : pressure < 1000 ? "Low 📉" : "Normal 👍";
}

// Function to check which tab is currently active and render the correct data
function checkActiveTabAndRender() {
    if (!globalForecastData) return;
    const activeTab = document.querySelector(".tab.active").innerText.trim();
    if (activeTab === "Today") {
        renderTodayForecast(globalForecastData);
    } else {
        renderWeekForecast(globalForecastData);
    }
}

// Render "Today" Tab (Next 24 hours, every 3 hours)
function renderTodayForecast(data) {
    forecastContainer.innerHTML = "";
    const todayData = data.list.slice(0, 8); // Next 24 hrs

    todayData.forEach(item => {
        const time = new Date(item.dt * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        const temp = Math.round(item.main.temp);
        
        const card = document.createElement("div");
        card.classList.add("forecast-card");
        card.innerHTML = `
            <p class="f-day">${time}</p>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png" class="f-icon">
            <div class="f-temps">
                <span class="f-max">${temp}°</span>
            </div>
        `;
        forecastContainer.appendChild(card);
    });
}

// Render "Week" Tab (Daily forecast)
function renderWeekForecast(data) {
    forecastContainer.innerHTML = "";
    const dailyData = [];
    const addedDays = new Set();
    
    data.list.forEach(item => {
        const dateObj = new Date(item.dt * 1000);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        
        if (!addedDays.has(dayName) && addedDays.size < 7) {
            dailyData.push({
                day: dayName,
                max: Math.round(item.main.temp_max),
                min: Math.round(item.main.temp_min),
                icon: item.weather[0].icon
            });
            addedDays.add(dayName);
        }
    });

    dailyData.forEach(day => {
        const card = document.createElement("div");
        card.classList.add("forecast-card");
        card.innerHTML = `
            <p class="f-day">${day.day}</p>
            <img src="https://openweathermap.org/img/wn/${day.icon}@2x.png" class="f-icon">
            <div class="f-temps">
                <span class="f-max">${day.max}°</span>
                <span class="f-min">${day.min}°</span>
            </div>
        `;
        forecastContainer.appendChild(card);
    });
}

// Event Listeners for Search & Location
searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    let city = searchInput.value;
    if (city !== "") fetchWeatherByCity(city);
});

grantAccessBtn.addEventListener("click", () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const userCoords = { lat: position.coords.latitude, lon: position.coords.longitude };
            sessionStorage.setItem("user-coordinates", JSON.stringify(userCoords));
            fetchWeatherByCoords(userCoords);
        }, () => alert("Geolocation access denied."));
    }
});

// Event Listeners for Tabs ("Today" and "Week")
const tabs = document.querySelectorAll(".tab");
tabs.forEach(tab => {
    tab.addEventListener("click", (e) => {
        tabs.forEach(t => t.classList.remove("active"));
        e.target.classList.add("active");
        checkActiveTabAndRender();
    });
});

// Unit Toggle 
const unitBtns = document.querySelectorAll(".unit-btn");
unitBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        unitBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentUnit = btn.getAttribute("data-unit");
        
        let city = document.querySelector("[data-cityName]").innerText.split(",")[0];
        if (city) {
            fetchWeatherByCity(city);
        } else {
            getFromSessionStorage();
        }
    });
});

// --- THEME TOGGLE (DARK/LIGHT MODE) ---
const themeToggleBtn = document.querySelector(".profile-pic");
const themeIcon = document.querySelector(".theme-icon"); 
const body = document.body;

// Check if user already saved a theme preference in LocalStorage
const savedTheme = localStorage.getItem("weather-theme");
if (savedTheme === "dark") {
    body.classList.add("dark-mode");
    themeIcon.innerText = "🌙"; 
} else {
    themeIcon.innerText = "☀️"; 
}

// Listen for clicks on the theme toggle button
themeToggleBtn.addEventListener("click", () => {
    body.classList.toggle("dark-mode");
    
    if (body.classList.contains("dark-mode")) {
        localStorage.setItem("weather-theme", "dark");
        themeIcon.innerText = "🌙"; 
    } else {
        localStorage.setItem("weather-theme", "light");
        themeIcon.innerText = "☀️"; 
    }
});