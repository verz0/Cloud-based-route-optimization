from flask import Flask, request, jsonify, render_template
import requests
import os

app = Flask(__name__, static_folder='static')

# Load environment variables
# For local development, fallback to direct values if env vars not set
MAPS_API_KEY = os.environ.get('MAPS_API_KEY')
EMISSIONS_FUNCTION_URL = os.environ.get('EMISSIONS_FUNCTION_URL')

# If running locally and env vars not set, use default values
if not MAPS_API_KEY:
    MAPS_API_KEY = 'AIzaSyAeAlC27KethNQBIkMNpx01vsz-6ALTes8'
    print("Using fallback API key for local development")

if not EMISSIONS_FUNCTION_URL:
    EMISSIONS_FUNCTION_URL = 'https://us-central1-astute-strategy-463309-f9.cloudfunctions.net/emissions-calculator'
    print("Using fallback function URL for local development")

print(f"MAPS_API_KEY loaded: {'Yes' if MAPS_API_KEY else 'No'}")
print(f"EMISSIONS_FUNCTION_URL loaded: {'Yes' if EMISSIONS_FUNCTION_URL else 'No'}")

@app.route('/')
def index():
    print(f"Rendering template with API key: {MAPS_API_KEY[:10]}..." if MAPS_API_KEY else "No API key")
    return render_template('index.html', api_key=MAPS_API_KEY)

@app.route('/api/routes', methods=['POST'])
def get_routes():
    data = request.json
    origin = data.get('origin')
    destination = data.get('destination')
    mode = data.get('mode', 'driving')
    waypoints = data.get('waypoints', [])
    optimize_waypoints = data.get('optimizeWaypoints', False)
    vehicle_type = data.get('vehicleType', 'midsize')

    # Build waypoints parameter
    waypoints_param = ""
    if waypoints:
        if optimize_waypoints:
            waypoints_param = "optimize:true|" + "|".join(waypoints)
        else:
            waypoints_param = "|".join(waypoints)

    # Call Google Directions API
    params = {
        'origin': origin,
        'destination': destination,
        'mode': mode,
        'alternatives': 'true',
        'departure_time': 'now',
        'key': MAPS_API_KEY
    }
    if waypoints_param:
        params['waypoints'] = waypoints_param

    response = requests.get(
        'https://maps.googleapis.com/maps/api/directions/json',
        params=params
    )

    directions_data = response.json()

    # Add carbon emissions data
    if 'routes' in directions_data and directions_data.get('status') == 'OK':
        for route in directions_data['routes']:
            distance_meters = sum(leg['distance']['value'] for leg in route['legs'])
            duration_seconds = sum(leg['duration']['value'] for leg in route['legs'])
            route['carbon_emissions'] = calculate_carbon_emissions(mode, distance_meters, vehicle_type)
            route['total_distance_meters'] = distance_meters
            route['total_duration_seconds'] = duration_seconds

    return jsonify(directions_data)

@app.route('/api/emissions-details', methods=['POST'])
def get_detailed_emissions():
    if not EMISSIONS_FUNCTION_URL:
        return jsonify({'error': 'Emissions function URL not configured'}), 400
    data = request.json
    route = data.get('route', {})
    vehicle_type = data.get('vehicleType', 'midsize')
    mode = data.get('mode', 'driving')
    emissions_request = {
        'route': route,
        'vehicle_type': vehicle_type,
        'mode': mode
    }
    try:
        response = requests.post(
            EMISSIONS_FUNCTION_URL,
            json=emissions_request,
            headers={'Content-Type': 'application/json'}
        )
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({'error': f'Error from emissions service: {response.text}', 'status_code': response.status_code}), response.status_code
    except Exception as e:
        return jsonify({'error': f'Failed to get detailed emissions: {str(e)}'}), 500

def calculate_carbon_emissions(mode, distance_meters, vehicle_type='midsize'):
    emission_factors = {
        'driving': {
            'economy': 0.15,
            'midsize': 0.19,
            'suv': 0.26,
            'truck': 0.31,
            'hybrid': 0.10,
            'electric': 0.05,
            'motorcycle': 0.09
        },
        'transit': 0.041,
        'bicycling': 0,
        'walking': 0
    }
    distance_km = distance_meters / 1000
    if mode == 'driving':
        return emission_factors['driving'].get(vehicle_type, emission_factors['driving']['midsize']) * distance_km
    elif mode == 'transit':
        return emission_factors['transit'] * distance_km
    else:
        return emission_factors.get(mode, 0) * distance_km

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)), debug=True)