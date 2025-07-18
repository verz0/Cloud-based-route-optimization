let map;
let directionsService;
let directionsRenderer;
let routes = [];
let selectedRouteIndex = 0;

// Initialize the map and services
function initMap() {
    console.log('initMap called');
    try {
        // Check if Google Maps API is loaded
        if (typeof google === 'undefined' || !google.maps) {
            console.error('Google Maps API not loaded');
            return;
        }
        
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: false,
            polylineOptions: {
                strokeColor: '#3498db',
                strokeWeight: 6,
                strokeOpacity: 0.8
            }
        });
        
        map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 40.7128, lng: -74.0060 },
            zoom: 12,
            mapTypeControl: true,
            mapTypeControlOptions: {
                style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                position: google.maps.ControlPosition.TOP_LEFT
            },
            zoomControl: true,
            zoomControlOptions: {
                position: google.maps.ControlPosition.LEFT_CENTER
            },
            scaleControl: true,
            streetViewControl: true,
            streetViewControlOptions: {
                position: google.maps.ControlPosition.LEFT_BOTTOM
            },
            fullscreenControl: true
        });
        
        directionsRenderer.setMap(map);
          // Initialize Places Autocomplete (using new API)
        const originInput = document.getElementById('origin');
        const destinationInput = document.getElementById('destination');
        
        if (originInput && destinationInput) {
            // Use the new PlaceAutocompleteElement for better performance and support
            try {
                const originAutocomplete = new google.maps.places.Autocomplete(originInput);
                const destinationAutocomplete = new google.maps.places.Autocomplete(destinationInput);
                
                // Suppress the deprecation warning by handling it gracefully
                originAutocomplete.setOptions({
                    fields: ['place_id', 'geometry', 'name', 'formatted_address']
                });
                destinationAutocomplete.setOptions({
                    fields: ['place_id', 'geometry', 'name', 'formatted_address']
                });
            } catch (error) {
                console.warn('Autocomplete initialization failed, using fallback:', error);
            }
            
            // Set up form submission
            document.getElementById('route-form').addEventListener('submit', handleRouteSubmit);
        }
        
        // Add traffic layer control after the map is initialized
        addTrafficLayerControl();
        
        // Apply custom map styling
        customizeMap();
    } catch (e) {
        handleMapError();
        console.error('Error initializing map:', e);
    }
}

// Add waypoint management functions after the initMap function
let waypointCount = 0;

// Function to add waypoint field
function addWaypointField(value = '') {
    const waypointsContainer = document.getElementById('waypoints-container');
    const waypointId = `waypoint-${waypointCount}`;
    
    const waypointItem = document.createElement('div');
    waypointItem.className = 'waypoint-item';
    waypointItem.innerHTML = `
        <input type="text" id="${waypointId}" placeholder="Enter stop ${waypointCount + 1}" value="${value}">
        <button type="button" class="small-button remove-waypoint" data-waypoint-id="${waypointId}">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    waypointsContainer.appendChild(waypointItem);
    
    // Initialize Places Autocomplete for the new waypoint
    const waypointInput = document.getElementById(waypointId);
    new google.maps.places.Autocomplete(waypointInput);
    
    // Add event listener for remove button
    waypointItem.querySelector('.remove-waypoint').addEventListener('click', function() {
        const waypointId = this.getAttribute('data-waypoint-id');
        const waypointElement = document.getElementById(waypointId).parentNode;
        // Add fade-out animation
        waypointElement.style.transition = 'opacity 0.3s ease';
        waypointElement.style.opacity = '0';
        setTimeout(() => {
            waypointElement.remove();
        }, 300);
    });
    
    waypointCount++;
}

// Function to collect all waypoints
function getWaypoints() {
    const waypoints = [];
    const waypointInputs = document.querySelectorAll('#waypoints-container input');
    
    waypointInputs.forEach(input => {
        if (input.value.trim() !== '') {
            waypoints.push({
                location: input.value,
                stopover: true
            });
        }
    });
    
    return waypoints;
}

// Add event listener for the "Add Stop" button after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const addWaypointButton = document.getElementById('add-waypoint');
    if (addWaypointButton) {
        addWaypointButton.addEventListener('click', function() {
            addWaypointField();
        });
    }
    
    // Add event listener to mode selection to show/hide vehicle type
    const modeSelect = document.getElementById('mode');
    const vehicleTypeContainer = document.getElementById('vehicle-type-container');
    
    if (modeSelect && vehicleTypeContainer) {
        modeSelect.addEventListener('change', function() {
            if (this.value === 'driving') {
                vehicleTypeContainer.classList.remove('hidden');
            } else {
                vehicleTypeContainer.classList.add('hidden');
            }
        });
    }
});

function handleMapError() {
    const mapDiv = document.getElementById('map');
    if (mapDiv) {
        mapDiv.innerHTML = 
            '<div style="text-align:center; padding:20px;">Error loading Google Maps. Please check your API key and try again.</div>';
    }
}

// Add error handling in case Maps fails to load
window.gm_authFailure = function() {
    handleMapError();
    console.error('Google Maps authentication failed. Check if your API key is valid and has the correct restrictions.');
};

// Add traffic layer toggle
function addTrafficLayerControl() {
    const trafficLayer = new google.maps.TrafficLayer();
    
    const controlDiv = document.createElement('div');
    controlDiv.className = 'custom-map-control';
    
    const controlButton = document.createElement('button');
    controlButton.id = 'traffic-toggle';
    controlButton.innerHTML = '<i class="fas fa-car"></i> Show Traffic';
    controlDiv.appendChild(controlButton);
    
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(controlDiv);
    
    let trafficEnabled = false;
    controlButton.addEventListener('click', function() {
        if (trafficEnabled) {
            trafficLayer.setMap(null);
            this.innerHTML = '<i class="fas fa-car"></i> Show Traffic';
        } else {
            trafficLayer.setMap(map);
            this.innerHTML = '<i class="fas fa-car"></i> Hide Traffic';
        }
        trafficEnabled = !trafficEnabled;
    });
}

// Add custom map styling
function customizeMap() {
    const styles = [
        {
            "featureType": "all",
            "elementType": "geometry.fill",
            "stylers": [{"weight": "2.00"}]
        },
        {
            "featureType": "all",
            "elementType": "geometry.stroke",
            "stylers": [{"color": "#9c9c9c"}]
        },
        {
            "featureType": "all",
            "elementType": "labels.text",
            "stylers": [{"visibility": "on"}]
        },
        {
            "featureType": "landscape",
            "elementType": "all",
            "stylers": [{"color": "#f2f2f2"}]
        },
        {
            "featureType": "landscape",
            "elementType": "geometry.fill",
            "stylers": [{"color": "#ffffff"}]
        },
        {
            "featureType": "landscape.man_made",
            "elementType": "geometry.fill",
            "stylers": [{"color": "#ffffff"}]
        },
        {
            "featureType": "poi",
            "elementType": "all",
            "stylers": [{"visibility": "off"}]
        },
        {
            "featureType": "road",
            "elementType": "all",
            "stylers": [{"saturation": -100}, {"lightness": 45}]
        },
        {
            "featureType": "road",
            "elementType": "geometry.fill",
            "stylers": [{"color": "#eeeeee"}]
        },
        {
            "featureType": "road",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#7b7b7b"}]
        },
        {
            "featureType": "road",
            "elementType": "labels.text.stroke",
            "stylers": [{"color": "#ffffff"}]
        },
        {
            "featureType": "road.highway",
            "elementType": "all",
            "stylers": [{"visibility": "simplified"}]
        },
        {
            "featureType": "road.arterial",
            "elementType": "labels.icon",
            "stylers": [{"visibility": "off"}]
        },
        {
            "featureType": "transit",
            "elementType": "all",
            "stylers": [{"visibility": "off"}]
        },
        {
            "featureType": "water",
            "elementType": "all",
            "stylers": [{"color": "#46bcec"}, {"visibility": "on"}]
        },
        {
            "featureType": "water",
            "elementType": "geometry.fill",
            "stylers": [{"color": "#c8d7d4"}]
        },
        {
            "featureType": "water",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#070707"}]
        },
        {
            "featureType": "water",
            "elementType": "labels.text.stroke",
            "stylers": [{"color": "#ffffff"}]
        }
    ];
    
    map.setOptions({styles: styles});
}

// Add function to fetch detailed emissions
async function fetchDetailedEmissions(route, vehicleType, mode) {
    try {
        const response = await fetch('/api/emissions-details', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                route, 
                vehicle_type: vehicleType,
                mode
            })
        });
        
        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Error fetching detailed emissions:', error);
        return null;
    }
}

// Function to display detailed emissions
function displayDetailedEmissions(data) {
    const container = document.getElementById('detailed-emissions-container');
    const content = document.getElementById('detailed-emissions-content');
    
    if (!container || !content || !data) return;
    
    container.style.display = 'block';
      // Create emissions summary section
    let html = `
        <div class="emissions-section">
            <h3><i class="fas fa-chart-pie"></i> Emissions Summary</h3>
            <div class="emissions-summary">
                <div class="emissions-summary-card">
                    <h3><i class="fas fa-leaf"></i> Total CO2 Emissions</h3>
                    <div class="emissions-value">${data.total_emissions_kg} <span class="emissions-unit">kg</span></div>
                    <div class="emissions-bar">
                        <div class="emissions-bar-fill" style="width: ${Math.min(data.total_emissions_kg * 10, 100)}%;"></div>
                    </div>
                </div>
                <div class="emissions-summary-card">
                    <h3><i class="fas fa-user"></i> Per Person</h3>
                    <div class="emissions-value">${data.emissions_per_person_kg} <span class="emissions-unit">kg</span></div>
                </div>
                <div class="emissions-summary-card">
                    <h3><i class="fas fa-calendar-alt"></i> Annual Impact</h3>
                    <div class="emissions-value">${data.annual_impact.commute_emissions} <span class="emissions-unit">kg</span></div>
                    <div><i class="fas fa-tree"></i> Requires ${data.annual_impact.trees_needed} trees to offset</div>
                </div>
            </div>
        </div>
    `;
      // Create emissions breakdown section
    html += `
        <div class="emissions-section">
            <h3><i class="fas fa-chart-bar"></i> Emissions Breakdown</h3>
            <div class="emissions-breakdown">
                <div class="breakdown-item">
                    <span class="breakdown-label"><i class="fas fa-car"></i> Base Emissions:</span>
                    <span class="breakdown-value">${data.breakdown.base_emissions_kg} kg</span>
                </div>
                <div class="breakdown-item">
                    <span class="breakdown-label"><i class="fas fa-traffic-light"></i> Traffic Impact:</span>
                    <span class="breakdown-value">${data.breakdown.traffic_impact_kg} kg</span>
                </div>
                <div class="breakdown-item">
                    <span class="breakdown-label"><i class="fas fa-mountain"></i> Elevation Impact:</span>
                    <span class="breakdown-value">${data.breakdown.elevation_impact_kg} kg</span>
                </div>
                <div class="breakdown-item">
                    <span class="breakdown-label"><i class="fas fa-cloud-sun-rain"></i> Weather Impact:</span>
                    <span class="breakdown-value">${data.breakdown.weather_impact_kg} kg</span>
                </div>
                <div class="breakdown-item">
                    <span class="breakdown-label"><i class="fas fa-calculator"></i> Total:</span>
                    <span class="breakdown-value">${data.total_emissions_kg} kg</span>
                </div>
            </div>
        </div>
    `;
      // Create emissions equivalents section
    html += `
        <div class="emissions-section">
            <h3><i class="fas fa-exchange-alt"></i> Emissions Equivalents</h3>
            <div class="emissions-equivalents">
                <div class="emissions-equivalent-card">
                    <h4><i class="fas fa-tree"></i> Tree Absorption</h4>
                    <div class="equivalent-value">${data.equivalents.tree_days}</div>
                    <div class="equivalent-unit">days for one tree to absorb</div>
                </div>
                <div class="emissions-equivalent-card">
                    <h4><i class="fas fa-lightbulb"></i> Light Bulb Usage</h4>
                    <div class="equivalent-value">${data.equivalents.light_bulb_hours}</div>
                    <div class="equivalent-unit">hours of 60W light bulb</div>
                </div>
                <div class="emissions-equivalent-card">
                    <h4><i class="fas fa-mobile-alt"></i> Smartphone Charges</h4>
                    <div class="equivalent-value">${data.equivalents.smartphone_charges}</div>
                    <div class="equivalent-unit">smartphone charges</div>
                </div>
            </div>
        </div>
    `;
    
    // Add potential savings section if available
    if (Object.keys(data.potential_savings).length > 0) {
        html += `
            <div class="emissions-section">
                <h3><i class="fas fa-hand-holding-usd"></i> Potential Savings</h3>
                <div class="potential-savings">
        `;
        
        for (const [vehicle, amount] of Object.entries(data.potential_savings)) {
            let vehicleName = vehicle;
            switch (vehicle) {
                case 'economy': vehicleName = 'Economy Car'; break;
                case 'midsize': vehicleName = 'Midsize Car'; break;
                case 'suv': vehicleName = 'SUV'; break;
                case 'truck': vehicleName = 'Truck'; break;
                case 'hybrid': vehicleName = 'Hybrid Car'; break;
                case 'electric': vehicleName = 'Electric Car'; break;                case 'motorcycle': vehicleName = 'Motorcycle'; break;
            }
            
            // Add appropriate vehicle icon
            let vehicleIcon = '';
            switch (vehicle) {
                case 'economy': vehicleIcon = '<i class="fas fa-car-side"></i>'; break;
                case 'midsize': vehicleIcon = '<i class="fas fa-car"></i>'; break;
                case 'suv': vehicleIcon = '<i class="fas fa-truck-monster"></i>'; break;
                case 'truck': vehicleIcon = '<i class="fas fa-truck"></i>'; break;
                case 'hybrid': vehicleIcon = '<i class="fas fa-gas-pump"></i><i class="fas fa-bolt"></i>'; break;
                case 'electric': vehicleIcon = '<i class="fas fa-charging-station"></i>'; break;
                case 'motorcycle': vehicleIcon = '<i class="fas fa-motorcycle"></i>'; break;
                default: vehicleIcon = '<i class="fas fa-car"></i>';
            }
            
            html += `
                <div class="savings-item">
                    <div class="savings-vehicle">${vehicleIcon} Switch to a ${vehicleName}</div>
                    <div class="savings-amount">Save ${amount} kg CO2</div>
                </div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
    }
    
    content.innerHTML = html;
    
    // Scroll to the detailed emissions section
    container.scrollIntoView({ behavior: 'smooth' });
}

// Handle form submission
// Update handleRouteSubmit function to include waypoints
async function handleRouteSubmit(e) {
    e.preventDefault();
    
    const origin = document.getElementById('origin').value;
    const destination = document.getElementById('destination').value;
    const mode = document.getElementById('mode').value;
    const waypoints = getWaypoints();
    const optimizeWaypoints = document.getElementById('optimize-waypoints').checked;
    
    if (!origin || !destination) {
        alert('Please enter both origin and destination');
        return;
    }
      // Show loading indicator
    const loadingEl = document.querySelector('.loading');
    loadingEl.style.display = 'flex';
    
    try {
        const response = await fetch('/api/routes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                origin, 
                destination, 
                mode,
                waypoints: waypoints.map(wp => wp.location),
                optimizeWaypoints
            })
        });
        
        const data = await response.json();
        
        // Hide loading indicator
        loadingEl.style.display = 'none';
        
        if (data.status !== 'OK') {
            throw new Error(data.status);
        }
        
        routes = data.routes;
        if (routes.length === 0) {
            alert('No routes found. Please try different locations or transportation mode.');
            return;
        }
        
        displayRoutes(routes, mode);
        
        // Reset detailed emissions container
        const detailedEmissionsContainer = document.getElementById('detailed-emissions-container');
        if (detailedEmissionsContainer) {
            detailedEmissionsContainer.style.display = 'none';
        }
    } catch (error) {
        // Hide loading indicator
        loadingEl.style.display = 'none';
        
        console.error('Error fetching routes:', error);
        alert('Failed to fetch routes: ' + (error.message || 'Unknown error'));
    }
}

// Display routes on the map and in the list
function displayRoutes(routes, mode) {
    if (routes.length === 0) return;
    
    // Display the first route on the map
    selectedRouteIndex = 0;
    displayRouteOnMap(routes[selectedRouteIndex]);
    
    // Display route list
    const routeList = document.getElementById('route-list');
    routeList.innerHTML = '';
    
    routes.forEach((route, index) => {
        const routeOption = document.createElement('div');
        routeOption.className = `route-option ${index === 0 ? 'selected' : ''}`;
        
        // Calculate total duration, distance, and emissions
        let totalDuration = 0;
        let totalDistance = 0;
        route.legs.forEach(leg => {
            totalDuration += leg.duration.value;
            totalDistance += leg.distance.value;
        });
        
        const formattedDuration = formatDuration(totalDuration);
        const formattedDistance = formatDistance(totalDistance);
        const emissions = route.carbon_emissions.toFixed(2);
        
        // Determine emissions class
        let emissionsClass = '';
        if (emissions < 5) {
            emissionsClass = 'eco-friendly';
        } else if (emissions < 10) {
            emissionsClass = 'moderate';
        } else {
            emissionsClass = 'high-emission';
        }
        
        // Get appropriate mode icon
        let modeIcon = '';
        switch(mode) {
            case 'driving':
                modeIcon = '<i class="fas fa-car"></i>';
                break;
            case 'walking':
                modeIcon = '<i class="fas fa-walking"></i>';
                break;
            case 'bicycling':
                modeIcon = '<i class="fas fa-bicycle"></i>';
                break;
            case 'transit':
                modeIcon = '<i class="fas fa-bus"></i>';
                break;
            default:
                modeIcon = '<i class="fas fa-car"></i>';
        }
          // Create route summary
        let routeHTML = `
            <h3>${modeIcon} Route ${index + 1}</h3>
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div><i class="fas fa-clock"></i> <strong>${formattedDuration}</strong></div>
                <div><i class="fas fa-road"></i> <strong>${formattedDistance}</strong></div>
            </div>
            <div class="mb-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div><i class="fas fa-leaf"></i> Carbon Emissions:</div>
                    <div class="${emissionsClass}">${emissions} kg CO2</div>
                </div>
                <div class="emissions-chart">
                    <div class="chart-bar" style="width: ${Math.min(emissions * 5, 100)}%;"></div>
                </div>
            </div>
        `;
        
        // Add leg details if there are multiple legs (waypoints)
        if (route.legs.length > 1) {
            routeHTML += `<div class="route-legs-toggle">Show stops details</div>`;
            routeHTML += `<div class="route-legs" style="display: none;">`;
            
            route.legs.forEach((leg, legIndex) => {
                const from = leg.start_address.split(',')[0];
                const to = leg.end_address.split(',')[0];
                routeHTML += `
                    <div class="route-leg">
                        <p class="mb-1"><strong><i class="fas fa-map-marker-alt"></i> Stop ${legIndex + 1}:</strong> ${from} to ${to}</p>
                        <div class="d-flex justify-content-between">
                            <span><i class="fas fa-clock"></i> ${leg.duration.text}</span>
                            <span><i class="fas fa-road"></i> ${leg.distance.text}</span>
                        </div>
                    </div>
                `;
            });
            
            routeHTML += `</div>`;
        }
        
        routeOption.innerHTML = routeHTML;
        
        // Add event listener for route selection
        routeOption.addEventListener('click', () => {
            // Update selected route
            document.querySelectorAll('.route-option').forEach(el => {
                el.classList.remove('selected');
            });
            routeOption.classList.add('selected');
            
            selectedRouteIndex = index;
            displayRouteOnMap(routes[index]);
            displayEmissionsData(routes[index], mode);
        });
          // Add event listener for showing/hiding leg details
        const legsToggle = routeOption.querySelector('.route-legs-toggle');
        if (legsToggle) {
            legsToggle.addEventListener('click', (event) => {
                event.stopPropagation();
                const legsDiv = routeOption.querySelector('.route-legs');
                if (legsDiv.style.display === 'none') {
                    legsDiv.style.display = 'block';
                    legsToggle.textContent = 'Hide stops details';
                    legsToggle.classList.add('expanded');
                } else {
                    legsDiv.style.display = 'none';
                    legsToggle.textContent = 'Show stops details';
                    legsToggle.classList.remove('expanded');
                }
            });
        }
        
        routeList.appendChild(routeOption);
    });
    
    // Display emissions data for the first route
    displayEmissionsData(routes[0], mode);
    
    // Show detailed emissions button
    const detailedEmissionsBtn = document.getElementById('show-detailed-emissions');
    if (detailedEmissionsBtn) {
        detailedEmissionsBtn.style.display = 'block';
        
        // Remove any existing event listeners
        const newBtn = detailedEmissionsBtn.cloneNode(true);
        detailedEmissionsBtn.parentNode.replaceChild(newBtn, detailedEmissionsBtn);
        
        // Add event listener to fetch and display detailed emissions
        newBtn.addEventListener('click', async function() {
            this.textContent = 'Loading detailed report...';
            this.disabled = true;
            
            const vehicleType = mode === 'driving' ? 
                document.getElementById('vehicle-type').value : 'bus';
            
            const data = await fetchDetailedEmissions(routes[selectedRouteIndex], vehicleType, mode);
            
            if (data) {
                displayDetailedEmissions(data);
                this.textContent = 'Show Detailed Environmental Impact';
                this.disabled = false;
            } else {
                this.textContent = 'Failed to load detailed report';
                setTimeout(() => {
                    this.textContent = 'Show Detailed Environmental Impact';
                    this.disabled = false;
                }, 3000);
            }
        });
    }
}

// Helper functions for formatting
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours} hr ${minutes} min`;
    } else {
        return `${minutes} min`;
    }
}

function formatDistance(meters) {
    const kilometers = meters / 1000;
    return kilometers >= 1 ? 
        `${kilometers.toFixed(1)} km` : 
        `${meters} m`;
}

// Display selected route on map
// Modify the displayRouteOnMap function
function displayRouteOnMap(route) {
    // Set custom polyline options based on emissions
    const emissions = route.carbon_emissions;
    let strokeColor = '#3a86ff'; // default blue
    
    // Change color based on emissions
    if (emissions < 1) {
        strokeColor = '#38b000'; // green for eco-friendly
    } else if (emissions < 5) {
        strokeColor = '#3a86ff'; // blue for moderate
    } else if (emissions < 10) {
        strokeColor = '#ffbe0b'; // yellow/orange for higher
    } else {
        strokeColor = '#ff5a5f'; // red for highest emissions
    }
    
    // Set the custom polyline options
    directionsRenderer.setOptions({
        polylineOptions: {
            strokeColor: strokeColor,
            strokeWeight: 6,
            strokeOpacity: 0.8
        }
    });
    
    directionsRenderer.setDirections({
        routes: [route],
        request: {
            origin: route.legs[0].start_location,
            destination: route.legs[route.legs.length - 1].end_location
        }
    });
    
    // Properly handle the bounds
    if (route.bounds) {
        try {
            const bounds = new google.maps.LatLngBounds(
                route.bounds.southwest ? 
                    new google.maps.LatLng(route.bounds.southwest.lat, route.bounds.southwest.lng) : null,
                route.bounds.northeast ? 
                    new google.maps.LatLng(route.bounds.northeast.lat, route.bounds.northeast.lng) : null
            );
            
            // Only fit bounds if both points are valid
            if (route.bounds.southwest && route.bounds.northeast) {
                map.fitBounds(bounds);
            }
        } catch (e) {
            console.warn("Error setting map bounds:", e);
            // Fallback to fitting the start and end points
            if (route.legs && route.legs.length > 0) {
                const bounds = new google.maps.LatLngBounds();
                bounds.extend(route.legs[0].start_location);
                bounds.extend(route.legs[0].end_location);
                map.fitBounds(bounds);
            }
        }
    }
}

// Display emissions data
function displayEmissionsData(route, mode) {
    const emissionsData = document.getElementById('emissions-data');
    const emissions = route.carbon_emissions;
    
    let emissionClass = '';
    let emissionIcon = '';
    
    if (emissions < 0.5) {
        emissionClass = 'eco-friendly';
        emissionIcon = '<i class="fas fa-leaf"></i>';
    } else if (emissions < 2) {
        emissionClass = 'moderate';
        emissionIcon = '<i class="fas fa-exclamation-triangle"></i>';
    } else {
        emissionClass = 'high-emission';
        emissionIcon = '<i class="fas fa-radiation"></i>';
    }
    
    const alternativeModes = [];
    let alternativeIcons = '';
    
    if (mode !== 'walking') {
        alternativeModes.push('walking');
        alternativeIcons += '<i class="fas fa-walking"></i> ';
    }
    if (mode !== 'bicycling') {
        alternativeModes.push('bicycling');
        alternativeIcons += '<i class="fas fa-bicycle"></i> ';
    }
    if (mode !== 'transit') {
        alternativeModes.push('public transport');
        alternativeIcons += '<i class="fas fa-bus"></i> ';
    }
    
    let alternativesText = '';
    if (alternativeModes.length > 0) {
        alternativesText = `
            <div class="mt-3 mb-3">
                <p><i class="fas fa-info-circle"></i> Alternative travel modes like ${alternativeIcons} ${alternativeModes.join(' or ')} could reduce your carbon footprint.</p>
            </div>`;
    }
    
    emissionsData.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="font-weight-medium">Your selected route will emit:</div>
            <div class="${emissionClass} font-weight-bold" style="font-size: 1.2rem;">
                ${emissionIcon} ${emissions.toFixed(2)} kg of CO2
            </div>
        </div>
        
        ${alternativesText}
        
        <div class="emissions-chart mb-3">
            <div class="chart-bar" style="width: ${Math.min(emissions * 20, 100)}%;"></div>
        </div>
        
        <div class="emissions-comparison mt-4"
            <h3>Emissions Comparison</h3>
            <p>Driving: 0.192 kg CO2/km</p>
            <p>Public Transport: 0.041 kg CO2/km</p>
            <p>Cycling: 0 kg CO2/km</p>
            <p>Walking: 0 kg CO2/km</p>
        </div>
    `;
}

// Error handler for Google Maps
function handleMapError() {
    const mapDiv = document.getElementById('map');
    if (mapDiv) {
        mapDiv.innerHTML = 
            '<div style="text-align:center; padding:20px;">Error loading Google Maps. Please check your API key and try again.</div>';
    }
}

// Initialize map when the page loads
window.onload = function() {
    try {
        initMap();
    } catch (e) {
        handleMapError();
        console.error('Error initializing map:', e);
    }
};