const searchForm = document.querySelector("[data-searchForm]");
const searchInput = document.querySelector("[data-searchInput]");
const grantAccessBtn = document.querySelector("[data-grantAccess]");
const loader = document.querySelector(".loading-container");
const mainContent = document.querySelector(".main-content");
const forecastContainer = document.querySelector("[data-forecastContainer]");

const API_KEY = "d1845658f92b31c64bd94f06f7188c9c";
let currentUnit = "metric"; // default to Celsius

// NEW: Global variable to store forecast data so we can switch tabs without re-fetching
let globalForecastData = null; 

// Initialize
getFromSessionStorage();
updateTime();
setInterval(updateTime, 60000); // update time every minute

function getFromSessionStorage() {
    const localCoordinates = sessionStorage.getItem("user-coordinates");
    if (!localCoordinates) {
        fetchWeatherByCity("London"); 
    } else {
        const coordinates = JSON.parse(localCoordinates);
        fetchWeatherByCoords(coordinates);
    }
}

async function fetchWeatherByCity(city) {
    showLoader();
    try {
        const resWeather = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${currentUnit}`);
        const resForecast = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=${currentUnit}`);
        
        if (!resWeather.ok) throw new Error("City not found");
        
        const weatherData = await resWeather.json();
        globalForecastData = await resForecast.json(); // Save globally
        
        renderCurrentWeather(weatherData);
        checkActiveTabAndRender(); // Decide which forecast to render
        hideLoader();
    } catch (error) {
        hideLoader();
        alert("City not found. Please try again.");
    }
}

async function fetchWeatherByCoords(coords) {
    const { lat, lon } = coords;
    showLoader();
    try {
        const resWeather = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`);
        const resForecast = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`);
        
        const weatherData = await resWeather.json();
        globalForecastData = await resForecast.json(); // Save globally
        
        renderCurrentWeather(weatherData);
        checkActiveTabAndRender(); // Decide which forecast to render
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
    document.querySelector("[data-temp]").innerText = Math.round(data.main.temp);
    document.querySelector("[data-weatherIcon]").src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
    document.querySelector("[data-weatherDesc]").innerText = data.weather[0].description;
    document.querySelector("[data-cityName]").innerText = `${data.name}, ${data.sys.country}`;
    document.querySelector("[data-rainChance]").innerText = data.clouds.all;
    document.querySelector("[data-feelsLike]").innerText = Math.round(data.main.feels_like);
    
    let windSpeedVal = currentUnit === 'metric' ? Math.round(data.wind.speed * 3.6) : Math.round(data.wind.speed);
    document.querySelector("[data-windSpeed]").innerText = windSpeedVal;
    document.querySelector("[data-windDir]").innerText = getWindDirection(data.wind.deg);

    document.querySelector("[data-sunrise]").innerText = formatTime(data.sys.sunrise);
    document.querySelector("[data-sunset]").innerText = formatTime(data.sys.sunset);

    const humidity = data.main.humidity;
    document.querySelector("[data-humidity]").innerText = humidity;
    document.querySelector("[data-humidityBar]").style.height = `${humidity}%`;
    document.querySelector("[data-humidityStatus]").innerText = humidity > 60 ? "High 💧" : humidity < 30 ? "Low 🌵" : "Normal 👍";

    const visKm = (data.visibility / 1000).toFixed(1);
    document.querySelector("[data-visibility]").innerText = visKm;
    document.querySelector("[data-visStatus]").innerText = visKm > 8 ? "Good 😃" : visKm > 4 ? "Average 😕" : "Poor 🌫️";

    const pressure = data.main.pressure;
    document.querySelector("[data-pressure]").innerText = pressure;
    document.querySelector("[data-pressureStatus]").innerText = pressure > 1020 ? "High 📈" : pressure < 1000 ? "Low 📉" : "Normal 👍";
}

// NEW: Function to check which tab is currently active and render the correct data
function checkActiveTabAndRender() {
    if (!globalForecastData) return;
    const activeTab = document.querySelector(".tab.active").innerText.trim();
    if (activeTab === "Today") {
        renderTodayForecast(globalForecastData);
    } else {
        renderWeekForecast(globalForecastData);
    }
}

// NEW: Function specifically for the "Today" tab (Next 24 hours, every 3 hours)
function renderTodayForecast(data) {
    forecastContainer.innerHTML = "";
    
    // Grab the first 8 items (8 items * 3 hours = 24 hours)
    const todayData = data.list.slice(0, 8);

    todayData.forEach(item => {
        const time = new Date(item.dt * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        const temp = Math.round(item.main.temp);
        
        const card = document.createElement("div");
        card.classList.add("forecast-card");
        card.innerHTML = `
            <p class="f-day">${time}</p>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png" class="f-icon">
            <div class="f-temps">
                <span class="f-max" style="color: #110E3C;">${temp}°</span>
            </div>
        `;
        forecastContainer.appendChild(card);
    });
}

// RENAMED: Function specifically for the "Week" tab (Daily forecast)
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

// NEW: Event Listeners for Tabs ("Today" and "Week")
const tabs = document.querySelectorAll(".tab");
tabs.forEach(tab => {
    tab.addEventListener("click", (e) => {
        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove("active"));
        // Add active class to clicked tab
        e.target.classList.add("active");
        // Re-render the forecast based on the new active tab
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
const body = document.body;

// 1. Check if user already saved a theme preference in LocalStorage
const savedTheme = localStorage.getItem("weather-theme");
if (savedTheme === "dark") {
    body.classList.add("dark-mode");
    themeToggleBtn.innerText = "🌙"; // Switch to moon icon for dark mode
}

// 2. Listen for clicks on the profile pic button
themeToggleBtn.addEventListener("click", () => {
    // Toggle the dark-mode class on the body
    body.classList.toggle("dark-mode");
    
    // Check if dark mode is now active
    if (body.classList.contains("dark-mode")) {
        // Save preference and change icon
        localStorage.setItem("weather-theme", "dark");
        themeToggleBtn.innerText = "🌙"; 
    } else {
        // Save preference and revert icon
        localStorage.setItem("weather-theme", "light");
        themeToggleBtn.innerText = "☀️"; // Or use "☀️" for light mode
    }
});