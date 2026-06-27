# NYC Traffic Risk Analysis — Frontend

React PWA frontend for the NYC Traffic Risk Analysis system.
Provides route safety analysis, interactive risk map and citizen reporting.

> **Related Repositories:**
> [ML & Data Analysis](https://github.com/cagan-hatun/nyc-traffic-risk-analysis) |
> [Backend (Spring Boot)](https://github.com/cagan-hatun/nyc-traffic-backend)

## Features

**User Panel**
- Route analysis with 3 alternatives (fastest / safest / balanced)
- Real-time risk scoring via Wang formula
- Interactive heatmap with 3,408 grid cells
- Driving simulation with proximity alerts
- Future date forecasting with weather integration
- Citizen incident reporting (VGI) with photo upload

**Admin Dashboard**
- KPI cards (avg risk score, high-risk grid count, report stats)
- Grid heatmap with hourly intensity slider
- 7-day and 90-day Prophet forecast charts
- Borough-based risk distribution (donut chart)
- Report management (approve / reject / delete / export CSV)

## Tech Stack

React · MapLibre GL · Recharts · Axios · React Router ·
react-hot-toast · Lucide React · PWA (Service Worker)

**External APIs:** TomTom · Open-Meteo · Nominatim · Stadia Maps · OSRM

## Setup

### Requirements
- Node.js 18+

### Installation

```bash
git clone https://github.com/cagan-hatun/nyc-traffic-frontend.git
cd nyc-traffic-frontend

npm install

cp .env.example .env
# Edit .env with your API keys

npm start
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

```
REACT_APP_API_URL=http://localhost:8080
REACT_APP_TOMTOM_KEY=your_key
```

### Requirements
- Backend running on port 8080
- FastAPI ML service running on port 8000

## Project Structure

```
src/
├── components/
│   ├── UserApp.js          → User panel (route analysis, simulation)
│   ├── AdminDashboard.js   → Admin panel (KPI, map, reports)
│   ├── RiskMap.js          → MapLibre GL interactive map
│   ├── ReportForm.js       → 4-step VGI reporting form
│   ├── ForecastChart.js    → 90-day Prophet chart
│   ├── HourlyRiskChart.js  → Hourly risk bar chart
│   └── ProfilePage.js      → User profile & report history
├── pages/
│   ├── LoginPage.js
│   ├── ForgotPassword.js
│   └── ResetPassword.js
├── App.js                  → Routing & auth state
├── App.css                 → Global styles & CSS variables
└── api.js                  → Axios API client
```

## PWA

This app is configured as a Progressive Web App.
On Android/iOS, open in Chrome/Safari and select "Add to Home Screen"
to install as a standalone application.