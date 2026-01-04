// ================================================
// NALABI DASHBOARD - Main JavaScript
// Features: Filter, Pagination, Map Popup, Charts
// ================================================

// ============ GLOBAL STATE ============
let allProjects = [];
let filteredProjects = [];
let currentFilter = 'all';
let currentMonth = 'all';
let currentPage = 1;
const itemsPerPage = 15;

let dashboardMap = null;
let mapMarkers = [];
let statusChart = null;
let sourceChart = null;

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    // Auth state observer
    auth.onAuthStateChanged(handleAuthState);
    
    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

function handleAuthState(user) {
    const loginModal = document.getElementById('loginModal');
    
    if (user) {
        // User is logged in
        if (loginModal) loginModal.classList.add('hidden');
        initDashboard();
        
        // Update avatar
        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            const initials = (user.email || 'NA').substring(0, 2).toUpperCase();
            avatar.querySelector('span').textContent = initials;
        }
    } else {
        // User is not logged in
        if (loginModal) loginModal.classList.remove('hidden');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Login berhasil!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        if (errorDiv) {
            errorDiv.textContent = 'Email atau password salah';
            errorDiv.style.display = 'block';
        }
    }
}

// ============ DASHBOARD INIT ============
async function initDashboard() {
    console.log('🚀 Initializing NalaBI Dashboard...');
    
    // Set current date
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
    
    // Initialize Map
    initDashboardMap();
    
    // Load Projects
    await loadProjects();
    
    // Setup Event Listeners
    setupEventListeners();
    
    console.log('✅ Dashboard initialized');
}

// ============ MAP FUNCTIONS (Leaflet) ============
function initDashboardMap() {
    const mapElement = document.getElementById('dashboardMap');
    if (!mapElement) return;
    
    // Initialize Leaflet map
    dashboardMap = L.map('dashboardMap', {
        center: [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng],
        zoom: DEFAULT_MAP_ZOOM,
        zoomControl: true
    });
    
    // Light theme tile layer (CartoDB Positron)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(dashboardMap);
    
    console.log('🗺️ Dashboard map initialized');
}

function addMapMarker(project) {
    if (!dashboardMap || !project.location?.lat || !project.location?.lng) {
        return null;
    }
    
    const colors = {
        'prospek': '#4988C4',
        'survey': '#10b981',
        'pengerjaan': '#a855f7',
        'selesai': '#10b981',
        'ditolak': '#ef4444'
    };
    
    const color = colors[project.status] || '#8eb8d6';
    
    // Custom marker icon with status color (with shadow for visibility)
    const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); cursor: pointer;"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });
    
    const marker = L.marker([project.location.lat, project.location.lng], { 
        icon: markerIcon,
        title: project.projectName
    }).addTo(dashboardMap);
    
    // Click listener to show popup
    marker.on('click', () => {
        showProjectPopup(project);
    });
    
    mapMarkers.push(marker);
    return marker;
}

function clearMapMarkers() {
    mapMarkers.forEach(marker => {
        if (dashboardMap) {
            dashboardMap.removeLayer(marker);
        }
    });
    mapMarkers = [];
}

function loadMapMarkers() {
    clearMapMarkers();
    
    const bounds = [];
    
    filteredProjects.forEach(project => {
        if (project.location?.lat && project.location?.lng) {
            addMapMarker(project);
            bounds.push([project.location.lat, project.location.lng]);
        }
    });
    
    // Fit bounds if we have markers
    if (bounds.length > 0 && dashboardMap) {
        const leafletBounds = L.latLngBounds(bounds);
        dashboardMap.fitBounds(leafletBounds, { padding: [30, 30], maxZoom: 14 });
    }
    
    console.log(`📍 Added ${mapMarkers.length} markers to map`);
}

// ============ PROJECT POPUP ============
function showProjectPopup(project) {
    // Calculate financials
    const items = [
        ...(project.materials || []),
        ...(project.services || []),
        ...(project.acUnits || [])
    ];
    
    let totalQuotation = 0;
    let totalReal = 0;
    
    items.forEach(item => {
        totalQuotation += (item.quotationPrice || 0) * (item.quotationQty || 0);
        totalReal += (item.realPrice || 0) * (item.realQty || 0);
    });
    
    const profitLoss = totalQuotation - totalReal;
    const isProfit = profitLoss >= 0;
    
    // Status text mapping
    const statusText = {
        'prospek': 'Prospek',
        'survey': 'Survey',
        'pengerjaan': 'On Progress',
        'selesai': 'Selesai',
        'ditolak': 'Rejected'
    };
    
    // Update popup content
    document.getElementById('popupStatus').textContent = statusText[project.status] || project.status;
    document.getElementById('popupTitle').textContent = project.projectName || 'Untitled';
    document.getElementById('popupClient').textContent = project.client || '-';
    document.getElementById('popupQuotation').textContent = formatCurrency(totalQuotation);
    document.getElementById('popupPLLabel').textContent = isProfit ? 'Profit' : 'Loss';
    
    const plValue = document.getElementById('popupProfitLoss');
    plValue.textContent = formatCurrency(Math.abs(profitLoss));
    plValue.className = `popup-info-value ${isProfit ? 'profit' : 'loss'}`;
    
    document.getElementById('popupAddress').textContent = project.location?.address || 'Alamat tidak tersedia';
    
    // Set view button action
    document.getElementById('popupViewBtn').onclick = () => {
        window.location.href = `project-detail.html?id=${project.id}`;
    };
    
    // Show popup
    document.getElementById('popupOverlay').classList.add('show');
    document.getElementById('projectPopup').classList.add('show');
}

function closeProjectPopup() {
    document.getElementById('popupOverlay').classList.remove('show');
    document.getElementById('projectPopup').classList.remove('show');
}

// ============ DATA LOADING ============
async function loadProjects() {
    try {
        console.log('📂 Loading projects...');
        
        const snapshot = await db.collection(COLLECTIONS.PROJECTS)
            .orderBy('createdAt', 'desc')
            .get();
        
        allProjects = [];
        
        snapshot.forEach(doc => {
            allProjects.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ Loaded ${allProjects.length} projects`);
        
        // Update nav badge
        const navBadge = document.getElementById('navProjectCount');
        if (navBadge) {
            navBadge.textContent = allProjects.length;
        }
        
        // Apply filters and update UI
        applyFilters();
        
    } catch (error) {
        console.error('❌ Error loading projects:', error);
        showToast('Gagal memuat project', 'error');
    }
}

// ============ FILTERING ============
function applyFilters() {
    let result = [...allProjects];
    
    // Apply month filter
    if (currentMonth !== 'all') {
        const monthIndex = parseInt(currentMonth);
        result = result.filter(project => {
            if (!project.createdAt) return false;
            const projectDate = project.createdAt.toDate();
            return projectDate.getMonth() === monthIndex;
        });
    }
    
    // Apply status filter
    if (currentFilter !== 'all') {
        result = result.filter(project => project.status === currentFilter);
    }
    
    filteredProjects = result;
    currentPage = 1; // Reset to first page
    
    // Update all UI components
    updateFilterCounts();
    updateStats();
    updateCharts();
    renderProjectsTable();
    loadMapMarkers();
}

function updateFilterCounts() {
    // Get base projects (filtered by month only)
    let baseProjects = allProjects;
    if (currentMonth !== 'all') {
        const monthIndex = parseInt(currentMonth);
        baseProjects = allProjects.filter(project => {
            if (!project.createdAt) return false;
            return project.createdAt.toDate().getMonth() === monthIndex;
        });
    }
    
    // Update counts
    const countAll = document.getElementById('countAll');
    const countProspek = document.getElementById('countProspek');
    const countSurvey = document.getElementById('countSurvey');
    const countPengerjaan = document.getElementById('countPengerjaan');
    const countDitolak = document.getElementById('countDitolak');
    
    if (countAll) countAll.textContent = baseProjects.length;
    if (countProspek) countProspek.textContent = baseProjects.filter(p => p.status === 'prospek').length;
    if (countSurvey) countSurvey.textContent = baseProjects.filter(p => p.status === 'survey').length;
    if (countPengerjaan) countPengerjaan.textContent = baseProjects.filter(p => p.status === 'pengerjaan').length;
    if (countDitolak) countDitolak.textContent = baseProjects.filter(p => p.status === 'ditolak').length;
}

// ============ STATISTICS ============
function updateStats() {
    let totalQuotation = 0;
    let totalReal = 0;
    
    filteredProjects.forEach(project => {
        const items = [
            ...(project.materials || []),
            ...(project.services || []),
            ...(project.acUnits || [])
        ];
        
        items.forEach(item => {
            totalQuotation += (item.quotationPrice || 0) * (item.quotationQty || 0);
            totalReal += (item.realPrice || 0) * (item.realQty || 0);
        });
    });
    
    const profitLoss = totalQuotation - totalReal;
    const isProfit = profitLoss >= 0;
    
    // Update stat cards
    const statTotal = document.getElementById('statTotal');
    const statActive = document.getElementById('statActive');
    const statRevenue = document.getElementById('statRevenue');
    const statProfit = document.getElementById('statProfit');
    const statProfitLabel = document.getElementById('statProfitLabel');
    
    if (statTotal) statTotal.textContent = filteredProjects.length;
    if (statActive) statActive.textContent = filteredProjects.filter(p => p.status === 'pengerjaan').length;
    if (statRevenue) statRevenue.textContent = formatCurrency(totalQuotation);
    if (statProfit) statProfit.textContent = formatCurrency(Math.abs(profitLoss));
    if (statProfitLabel) statProfitLabel.textContent = isProfit ? 'Total Profit' : 'Total Loss';
}

// ============ CHARTS ============
function updateCharts() {
    updateStatusChart();
    updateSourceChart();
}

function updateStatusChart() {
    const canvas = document.getElementById('statusChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    const counts = {
        prospek: filteredProjects.filter(p => p.status === 'prospek').length,
        survey: filteredProjects.filter(p => p.status === 'survey').length,
        pengerjaan: filteredProjects.filter(p => p.status === 'pengerjaan').length,
        ditolak: filteredProjects.filter(p => p.status === 'ditolak').length
    };
    
    if (statusChart) statusChart.destroy();
    
    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Prospek', 'Survey', 'Progress', 'Rejected'],
            datasets: [{
                data: [counts.prospek, counts.survey, counts.pengerjaan, counts.ditolak],
                backgroundColor: ['#4988C4', '#10b981', '#a855f7', '#ef4444'],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    display: false
                }
            },
            animation: {
                animateRotate: true,
                duration: 800
            }
        }
    });
}

function updateSourceChart() {
    const canvas = document.getElementById('sourceChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    const surveyAppCount = filteredProjects.filter(p => p.source === 'survey_app').length;
    const manualCount = filteredProjects.length - surveyAppCount;
    
    if (sourceChart) sourceChart.destroy();
    
    sourceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Survey App', 'Manual'],
            datasets: [{
                data: [surveyAppCount, manualCount],
                backgroundColor: ['#BDE8F5', '#4988C4'],
                borderRadius: 8,
                barThickness: 50
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(189, 232, 245, 0.1)'
                    },
                    ticks: {
                        color: '#8eb8d6',
                        font: { weight: 600 }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#8eb8d6',
                        font: { weight: 600 }
                    }
                }
            },
            animation: {
                duration: 800
            }
        }
    });
}

// ============ TABLE RENDERING ============
function renderProjectsTable() {
    const tbody = document.getElementById('projectsTableBody');
    const table = document.getElementById('projectsTable');
    const pagination = document.getElementById('pagination');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    
    // Hide loading
    if (loadingState) loadingState.style.display = 'none';
    
    // Check for empty state
    if (filteredProjects.length === 0) {
        if (table) table.style.display = 'none';
        if (pagination) pagination.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    // Show table
    if (emptyState) emptyState.style.display = 'none';
    if (table) table.style.display = 'table';
    if (pagination) pagination.style.display = 'flex';
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, filteredProjects.length);
    const paginatedProjects = filteredProjects.slice(startIdx, endIdx);
    
    // Update pagination info
    const showingStart = document.getElementById('showingStart');
    const showingEnd = document.getElementById('showingEnd');
    const totalItems = document.getElementById('totalItems');
    
    if (showingStart) showingStart.textContent = startIdx + 1;
    if (showingEnd) showingEnd.textContent = endIdx;
    if (totalItems) totalItems.textContent = filteredProjects.length;
    
    // Clear and render rows
    tbody.innerHTML = '';
    
    paginatedProjects.forEach((project, index) => {
        const row = createProjectRow(project, index);
        tbody.appendChild(row);
    });
    
    // Render pagination buttons
    renderPaginationButtons(totalPages);
}

function createProjectRow(project, index) {
    // Calculate financials
    const items = [
        ...(project.materials || []),
        ...(project.services || []),
        ...(project.acUnits || [])
    ];
    
    let totalQuotation = 0;
    let totalReal = 0;
    
    items.forEach(item => {
        totalQuotation += (item.quotationPrice || 0) * (item.quotationQty || 0);
        totalReal += (item.realPrice || 0) * (item.realQty || 0);
    });
    
    const profitLoss = totalQuotation - totalReal;
    const isProfit = profitLoss >= 0;
    
    // Status mapping
    const statusMap = {
        'prospek': 'Prospek',
        'survey': 'Survey',
        'pengerjaan': 'Progress',
        'selesai': 'Selesai',
        'ditolak': 'Rejected'
    };
    
    // Thumbnail
    const thumbnail = project.photos && project.photos.length > 0
        ? `<img src="${project.photos[0].url}" alt="">`
        : '<i class="fas fa-snowflake"></i>';
    
    // Date
    const dateStr = project.createdAt
        ? project.createdAt.toDate().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
        : '-';
    
    // Source
    const isFromSurvey = project.source === 'survey_app';
    
    // Create row
    const tr = document.createElement('tr');
    tr.style.animation = `fadeInUp 0.4s ease ${index * 0.03}s forwards`;
    tr.style.opacity = '0';
    
    tr.innerHTML = `
        <td>
            <div class="project-info">
                <div class="project-thumb">${thumbnail}</div>
                <div>
                    <div class="project-name">${project.projectName || 'Untitled'}</div>
                    <div class="project-client">${project.client || '-'}</div>
                </div>
            </div>
        </td>
        <td>
            <span class="status-badge ${project.status}">${statusMap[project.status] || project.status}</span>
        </td>
        <td>
            <span class="source-badge ${isFromSurvey ? 'survey-app' : 'manual'}">
                <i class="fas ${isFromSurvey ? 'fa-mobile-alt' : 'fa-keyboard'}"></i>
                ${isFromSurvey ? 'Survey App' : 'Manual'}
            </span>
        </td>
        <td>
            <span class="amount">${formatCurrency(totalQuotation)}</span>
        </td>
        <td>
            <span class="amount ${isProfit ? 'profit' : 'loss'}">
                ${isProfit ? '+' : '-'} ${formatCurrency(Math.abs(profitLoss))}
            </span>
        </td>
        <td>${dateStr}</td>
        <td>
            <div class="actions-cell">
                <button class="btn-icon" onclick="viewProject('${project.id}')" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" onclick="viewProject('${project.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        </td>
    `;
    
    return tr;
}

function renderPaginationButtons(totalPages) {
    const container = document.getElementById('paginationButtons');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderProjectsTable();
        }
    };
    container.appendChild(prevBtn);
    
    // Page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => {
            currentPage = i;
            renderProjectsTable();
        };
        container.appendChild(btn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderProjectsTable();
        }
    };
    container.appendChild(nextBtn);
}

// ============ SEARCH ============
function searchProjects(query) {
    query = query.toLowerCase().trim();
    
    if (!query) {
        applyFilters();
        return;
    }
    
    // Search in all projects first
    let searchResults = allProjects.filter(project =>
        (project.projectName && project.projectName.toLowerCase().includes(query)) ||
        (project.client && project.client.toLowerCase().includes(query)) ||
        (project.phone && project.phone.includes(query))
    );
    
    // Apply month filter
    if (currentMonth !== 'all') {
        const monthIndex = parseInt(currentMonth);
        searchResults = searchResults.filter(project => {
            if (!project.createdAt) return false;
            return project.createdAt.toDate().getMonth() === monthIndex;
        });
    }
    
    // Apply status filter
    if (currentFilter !== 'all') {
        searchResults = searchResults.filter(project => project.status === currentFilter);
    }
    
    filteredProjects = searchResults;
    currentPage = 1;
    
    updateStats();
    updateCharts();
    renderProjectsTable();
    loadMapMarkers();
}

// ============ EVENT LISTENERS ============
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchProjects(e.target.value);
            }, 300);
        });
    }
    
    // Month filter
    const monthFilter = document.getElementById('monthFilter');
    if (monthFilter) {
        monthFilter.addEventListener('change', (e) => {
            currentMonth = e.target.value;
            applyFilters();
        });
    }
    
    // Status filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active state
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Apply filter
            currentFilter = tab.dataset.filter;
            applyFilters();
        });
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Logout dari NalaBI?')) {
                await auth.signOut();
                showToast('Logout berhasil', 'success');
            }
        });
    }
    
    // Popup overlay click to close
    const popupOverlay = document.getElementById('popupOverlay');
    if (popupOverlay) {
        popupOverlay.addEventListener('click', closeProjectPopup);
    }
    
    // Escape key to close popup
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProjectPopup();
        }
    });
}

// ============ NAVIGATION ============
function viewProject(id) {
    window.location.href = `project-detail.html?id=${id}`;
}

function scrollToProjects() {
    const el = document.getElementById('projectsSection');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function scrollToStats() {
    const el = document.getElementById('statsSection');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function scrollToMap() {
    const el = document.getElementById('mapSection');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// ============ UTILITIES ============
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// ============ EXPORTS ============
window.viewProject = viewProject;
window.closeProjectPopup = closeProjectPopup;
window.scrollToProjects = scrollToProjects;
window.scrollToStats = scrollToStats;
window.scrollToMap = scrollToMap;
