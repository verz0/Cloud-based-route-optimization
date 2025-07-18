import json
import math
from flask import jsonify
from google.cloud import storage
import requests

def calculate_detailed_emissions(request):
    """
    Cloud Function for detailed emissions calculations.
    
    Args:
        request: Flask request object with the following expected parameters:
            - route: Object containing route details (legs, distance, duration)
            - vehicle_type: Type of vehicle being used (economy, midsize, suv, electric, hybrid, etc.)
            - mode: Mode of transportation (driving, transit, bicycling, walking)
    
    Returns:
        JSON response with detailed emissions breakdown
    """
    # Set CORS headers for preflight requests
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)
    
    # Set CORS headers for the main request
    headers = {'Access-Control-Allow-Origin': '*'}
    
    try:
        request_json = request.get_json()
        if not request_json:
            return jsonify({'error': 'No request data provided'}), 400, headers
        
        route = request_json.get('route')
        vehicle_type = request_json.get('vehicle_type', 'midsize')
        mode = request_json.get('mode', 'driving')
        
        if not route:
            return jsonify({'error': 'Route data is required'}), 400, headers
        
        # Calculate detailed emissions
        emissions_data = calculate_emissions(route, vehicle_type, mode)
        
        return jsonify(emissions_data), 200, headers
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500, headers

def calculate_emissions(route, vehicle_type, mode):
    """
    Calculate detailed emissions based on route, vehicle type, and transportation mode.
    """
    # Base emission factors (kg CO2 per km)
    base_emission_factors = {
        'driving': {
            'economy': 0.15,
            'midsize': 0.19,
            'suv': 0.26,
            'truck': 0.31,
            'hybrid': 0.10,
            'electric': 0.05,  # Accounts for electricity generation emissions
            'motorcycle': 0.09
        },
        'transit': {
            'bus': 0.04,
            'train': 0.02,
            'subway': 0.01,
            'tram': 0.01,
            'ferry': 0.12
        },
        'bicycling': 0,
        'walking': 0
    }
    
    # Extract route details
    distance_meters = 0
    duration_seconds = 0
    legs = route.get('legs', [])
    
    for leg in legs:
        distance_meters += leg.get('distance', {}).get('value', 0)
        duration_seconds += leg.get('duration', {}).get('value', 0)
    
    distance_km = distance_meters / 1000
    
    # Get base emission factor based on mode and vehicle type
    if mode == 'driving':
        emission_factor = base_emission_factors['driving'].get(vehicle_type, base_emission_factors['driving']['midsize'])
    elif mode == 'transit':
        # For transit, we'll use a mix of transit types
        if vehicle_type in base_emission_factors['transit']:
            emission_factor = base_emission_factors['transit'][vehicle_type]
        else:
            emission_factor = base_emission_factors['transit']['bus']  # Default to bus
    else:
        emission_factor = base_emission_factors.get(mode, 0)
    
    # Calculate base emissions
    base_emissions = emission_factor * distance_km
    
    # Traffic factor (increases emissions in traffic)
    traffic_factor = 1.0
    if duration_seconds > 0 and 'duration_in_traffic' in route.get('legs', [{}])[0]:
        traffic_duration = route['legs'][0]['duration_in_traffic']['value']
        traffic_ratio = traffic_duration / duration_seconds
        if traffic_ratio > 1:
            # Traffic increases emissions
            traffic_factor = 1.0 + (traffic_ratio - 1) * 0.5  # Up to 50% increase
    
    # Calculate elevation impact
    elevation_factor = 1.0
    # In a real implementation, we would query elevation data
    # For simulation, we'll use a random factor
    elevation_factor = 1.0 + (hash(str(route)) % 20) / 100  # ±10% impact
    
    # Weather impact (simulated)
    weather_factor = 1.0 + (hash(str(route) + "weather") % 10) / 100  # ±5% impact
    
    # Calculate total emissions
    total_emissions = base_emissions * traffic_factor * elevation_factor * weather_factor
    
    # Calculate emissions per person (assuming average occupancy)
    occupancy = {
        'driving': 1.5,  # Average car occupancy
        'transit': 20,   # Average bus/train occupancy
        'bicycling': 1,
        'walking': 1
    }
    
    emissions_per_person = total_emissions / occupancy.get(mode, 1)
    
    # Calculate equivalent activities
    tree_days = total_emissions * 1.2  # Days needed for one tree to absorb this CO2
    light_bulb_hours = total_emissions * 33  # Hours of 60W light bulb usage
    smartphone_charges = total_emissions * 5000  # Number of smartphone charges
    
    # Calculate savings compared to other vehicle types
    savings = {}
    if mode == 'driving':
        for vtype, factor in base_emission_factors['driving'].items():
            if vtype != vehicle_type:
                savings[vtype] = (factor - emission_factor) * distance_km
    
    # Create response with detailed breakdown
    return {
        'total_emissions_kg': round(total_emissions, 2),
        'emissions_per_person_kg': round(emissions_per_person, 2),
        'distance_km': round(distance_km, 2),
        'breakdown': {
            'base_emissions_kg': round(base_emissions, 2),
            'traffic_impact_kg': round(base_emissions * (traffic_factor - 1), 2),
            'elevation_impact_kg': round(base_emissions * (elevation_factor - 1), 2),
            'weather_impact_kg': round(base_emissions * (weather_factor - 1), 2)
        },
        'factors': {
            'base_emission_factor': emission_factor,
            'traffic_factor': round(traffic_factor, 2),
            'elevation_factor': round(elevation_factor, 2),
            'weather_factor': round(weather_factor, 2)
        },
        'equivalents': {
            'tree_days': round(tree_days, 1),
            'light_bulb_hours': round(light_bulb_hours, 1),
            'smartphone_charges': round(smartphone_charges, 1)
        },
        'potential_savings': {
            vehicle: round(saved, 2) for vehicle, saved in savings.items() if saved > 0
        },
        'annual_impact': {
            'commute_emissions': round(total_emissions * 250, 2),  # Assuming 250 workdays
            'trees_needed': round(total_emissions * 250 / 21, 1)  # Trees needed to offset annual emissions
        }
    }