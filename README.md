# Route Optimization & Emissions Calculator

**Deployed Application:** [https://astute-strategy-463309-f9.wm.r.appspot.com/](https://astute-strategy-463309-f9.wm.r.appspot.com/)

## Project Overview
This project is a cloud-native web platform for optimizing travel routes and calculating carbon emissions. It leverages Google Cloud Platform (GCP) services for scalable deployment and microservices architecture. The application allows users to input origins, destinations, and waypoints, select travel modes and vehicle types, and receive optimized routes along with detailed environmental impact reports.

## Features
- Interactive web interface for route planning and optimization
- Support for multiple travel modes (driving, walking, cycling, transit)
- Waypoint management and route order optimization
- Real-time route visualization using Google Maps
- Carbon emissions estimation for each route
- Detailed emissions breakdown via a dedicated microservice
- Responsive, modern UI with clear environmental impact reporting

## Architecture
- **Frontend & Main Backend:**
  - Built with Flask and deployed on **Google App Engine** for managed, scalable hosting.
  - Handles user interface, route requests, and integrates with Google Maps APIs.
- **Emissions Calculator Microservice:**
  - Implemented as a **Google Cloud Function** for independent scaling and stateless execution.
  - Receives route and vehicle data, returns detailed emissions analysis via a REST API.
- **API Services:**
  - All core functionalities (route optimization, emissions calculation) are exposed via RESTful APIs for easy integration and extensibility.

## Directory Structure
```
cloud-proj/
  ├── app.yaml (root deployment config)
  └── route-optimization/
      ├── app/
      │   ├── main.py (Flask app)
      │   ├── requirements.txt
      │   ├── static/
      │   ├── templates/
      ├── emissions-calculator/
      │   ├── main.py (Cloud Function)
      │   ├── requirements.txt
      ├── app.yaml (App Engine service config)
      └── ...
```

## Setup & Deployment

### Prerequisites
- Python 3.9+ (App Engine) and Python 3.11+ (root config)
- Google Cloud SDK
- Google Cloud project with App Engine and Cloud Functions enabled

### Local Development
1. Clone the repository:
   ```sh
   git clone <your-repo-url>
   cd cloud-proj/route-optimization/app
   ```
2. Install dependencies:
   ```sh
   pip install -r requirements.txt
   ```
3. Set up environment variables (see `app.sample.yaml` for structure):
   - Do **not** commit real API keys. Use a `.env` file or export variables in your shell.
4. Run the Flask app locally:
   ```sh
   python main.py
   ```

### Deploying to Google Cloud
1. **App Engine (Main App):**
   ```sh
   gcloud app deploy app.yaml
   ```
2. **Emissions Calculator (Cloud Function):**
   - Navigate to `emissions-calculator/` and deploy:
   ```sh
   gcloud functions deploy calculate_detailed_emissions \
     --runtime python311 \
     --trigger-http \
     --allow-unauthenticated \
     --entry-point calculate_detailed_emissions
   ```

