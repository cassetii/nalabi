// ================================================
// NALABI ADD PROJECT - JavaScript
// Features: Form handling, Map selection, Validation
// ================================================

// ============ GLOBAL STATE ============
let map = null;
let marker = null;

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        initAddProject();
    });
});

function initAddProject() {
    console.log('🚀 Initializing Add Project page...');
    
    // Initialize map
    initMap();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('✅ Add Project page initialized');
}

// ============ MAP FUNCTIONS (Leaflet) ============
function initMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;
    
    // Initialize Leaflet map
    map = L.map('map', {
        center: [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng],
        zoom: DEFAULT_MAP_ZOOM,
        zoomControl: true
    });
    
    // Light theme tile layer (CartoDB Positron)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
    
    // Click to place marker
    map.on('click', (e) => {
        placeMarker(e.latlng);
        getAddressFromLatLng(e.latlng.lat, e.latlng.lng);
    });
    
    console.log('🗺️ Leaflet map initialized');
}

function placeMarker(latlng) {
    // Remove existing marker
    if (marker) {
        map.removeLayer(marker);
    }
    
    // Custom marker icon
    const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="background: #4988C4; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
    
    // Create new marker
    marker = L.marker(latlng, { icon: markerIcon }).addTo(map);
    
    // Update hidden inputs
    document.getElementById('latitude').value = latlng.lat;
    document.getElementById('longitude').value = latlng.lng;
}

async function getAddressFromLatLng(lat, lng) {
    try {
        // Use Nominatim for reverse geocoding (FREE!)
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
        const data = await response.json();
        
        if (data && data.display_name) {
            const address = data.display_name;
            
            document.getElementById('address').value = address;
            document.getElementById('displayAddress').textContent = address;
            document.getElementById('displayCoords').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            document.getElementById('locationDisplay').style.display = 'block';
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        // Still show coordinates even if address lookup fails
        document.getElementById('displayCoords').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        document.getElementById('locationDisplay').style.display = 'block';
    }
}

async function searchLocation() {
    const address = document.getElementById('searchAddress').value.trim();
    
    if (!address) {
        showToast('Masukkan alamat untuk dicari', 'error');
        return;
    }
    
    showToast('Mencari lokasi...', 'info');
    
    try {
        // Use Nominatim for geocoding (FREE!)
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const result = data[0];
            const lat = parseFloat(result.lat);
            const lng = parseFloat(result.lon);
            const latlng = L.latLng(lat, lng);
            
            map.setView(latlng, 16);
            placeMarker(latlng);
            
            document.getElementById('address').value = result.display_name;
            document.getElementById('displayAddress').textContent = result.display_name;
            document.getElementById('displayCoords').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            document.getElementById('locationDisplay').style.display = 'block';
            
            showToast('Lokasi ditemukan!', 'success');
        } else {
            showToast('Lokasi tidak ditemukan', 'error');
        }
    } catch (error) {
        console.error('Search error:', error);
        showToast('Gagal mencari lokasi', 'error');
    }
}

function getCurrentLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation tidak didukung browser', 'error');
        return;
    }
    
    showToast('Mendapatkan lokasi...', 'info');
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const latlng = L.latLng(lat, lng);
            
            map.setView(latlng, 16);
            placeMarker(latlng);
            getAddressFromLatLng(lat, lng);
            
            showToast('Lokasi ditemukan!', 'success');
        },
        (error) => {
            console.error('Geolocation error:', error);
            showToast('Gagal mendapatkan lokasi', 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000
        }
    );
}

// ============ FORM HANDLING ============
async function saveProject() {
    // Get form values
    const projectName = document.getElementById('projectName').value.trim();
    const clientName = document.getElementById('clientName').value.trim();
    const clientPhone = document.getElementById('clientPhone').value.trim();
    const projectStatus = document.getElementById('projectStatus').value;
    const projectDescription = document.getElementById('projectDescription').value.trim();
    const latitude = parseFloat(document.getElementById('latitude').value);
    const longitude = parseFloat(document.getElementById('longitude').value);
    const address = document.getElementById('address').value;
    
    // Validation
    if (!projectName) {
        showToast('Nama project wajib diisi', 'error');
        document.getElementById('projectName').focus();
        return;
    }
    
    if (!clientName) {
        showToast('Nama client wajib diisi', 'error');
        document.getElementById('clientName').focus();
        return;
    }
    
    if (!clientPhone) {
        showToast('No. telepon wajib diisi', 'error');
        document.getElementById('clientPhone').focus();
        return;
    }
    
    if (!latitude || !longitude) {
        showToast('Pilih lokasi di peta', 'error');
        return;
    }
    
    // Show loading
    showLoading('Menyimpan project...');
    
    try {
        // Create project data
        const projectData = {
            projectName: projectName,
            client: clientName,
            phone: clientPhone,
            status: projectStatus,
            description: projectDescription,
            location: {
                lat: latitude,
                lng: longitude,
                address: address
            },
            materials: DEFAULT_MATERIALS,
            services: DEFAULT_SERVICES,
            acUnits: [],
            photos: [],
            documents: {
                penawaran: [],
                bast: [],
                invoice: [],
                gallery: []
            },
            source: 'manual',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Save to Firestore
        await db.collection(COLLECTIONS.PROJECTS).add(projectData);
        
        hideLoading();
        showToast('Project berhasil disimpan!', 'success');
        
        // Redirect to dashboard after delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error saving project:', error);
        hideLoading();
        showToast('Gagal menyimpan: ' + error.message, 'error');
    }
}

// ============ EVENT LISTENERS ============
function setupEventListeners() {
    // Search on Enter key
    const searchInput = document.getElementById('searchAddress');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchLocation();
            }
        });
    }
}

// ============ UTILITIES ============
function showLoading(message) {
    const overlay = document.getElementById('loadingOverlay');
    const text = document.getElementById('loadingText');
    
    if (text) text.textContent = message || 'Loading...';
    if (overlay) overlay.classList.remove('hidden');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

// ============ EXPORTS ============
window.searchLocation = searchLocation;
window.getCurrentLocation = getCurrentLocation;
window.saveProject = saveProject;
window.logout = logout;
