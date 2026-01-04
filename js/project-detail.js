// ================================================
// NALABI PROJECT DETAIL - JavaScript
// Features: AC Units, Documents, Export PDF, Chart
// ================================================

// ============ GLOBAL STATE ============
let projectId = null;
let projectData = null;
let map = null;
let marker = null;
let plChart = null;

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    // Get project ID from URL
    const params = new URLSearchParams(window.location.search);
    projectId = params.get('id');
    
    if (!projectId) {
        alert('Project ID tidak ditemukan');
        window.location.href = 'index.html';
        return;
    }
    
    // Check auth
    auth.onAuthStateChanged((user) => {
        if (user) {
            loadProject();
        } else {
            window.location.href = 'index.html';
        }
    });
});

// ============ DATA LOADING ============
async function loadProject() {
    showLoading('Memuat project...');
    
    try {
        const doc = await db.collection(COLLECTIONS.PROJECTS).doc(projectId).get();
        
        if (!doc.exists) {
            hideLoading();
            showToast('Project tidak ditemukan', 'error');
            setTimeout(() => window.location.href = 'index.html', 1500);
            return;
        }
        
        projectData = {
            id: doc.id,
            ...doc.data()
        };
        
        // Ensure arrays exist
        if (!projectData.acUnits) projectData.acUnits = [];
        if (!projectData.materials) projectData.materials = [...DEFAULT_MATERIALS];
        if (!projectData.services) projectData.services = [...DEFAULT_SERVICES];
        if (!projectData.documents) {
            projectData.documents = {
                penawaran: [],
                bast: [],
                invoice: [],
                gallery: []
            };
        }
        
        console.log('✅ Project loaded:', projectData.projectName);
        
        renderProject();
        hideLoading();
        
    } catch (error) {
        console.error('Error loading project:', error);
        hideLoading();
        showToast('Gagal memuat project', 'error');
    }
}

// ============ RENDERING ============
function renderProject() {
    // Page title
    document.getElementById('pageTitle').textContent = projectData.projectName || 'Detail Project';
    document.getElementById('projectTitle').textContent = projectData.projectName || 'Untitled';
    
    // Project meta info
    document.getElementById('clientInfo').textContent = projectData.client || '-';
    document.getElementById('phoneInfo').textContent = projectData.phone || '-';
    document.getElementById('dateInfo').textContent = projectData.createdAt 
        ? projectData.createdAt.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        : '-';
    
    // Status badge
    const statusMap = {
        'prospek': 'Prospek',
        'survey': 'Survey',
        'pengerjaan': 'On Progress',
        'selesai': 'Selesai',
        'ditolak': 'Rejected'
    };
    
    const statusBadge = document.getElementById('statusBadge');
    statusBadge.textContent = statusMap[projectData.status] || projectData.status;
    statusBadge.className = `status-badge ${projectData.status}`;
    
    // Source badge
    const isFromSurvey = projectData.source === 'survey_app';
    document.getElementById('sourceBadge').innerHTML = `
        <i class="fas ${isFromSurvey ? 'fa-mobile-alt' : 'fa-keyboard'}"></i>
        ${isFromSurvey ? 'Survey App' : 'Manual'}
    `;
    
    // Form fields
    document.getElementById('editName').value = projectData.projectName || '';
    document.getElementById('editClient').value = projectData.client || '';
    document.getElementById('editPhone').value = projectData.phone || '';
    document.getElementById('editStatus').value = projectData.status || 'prospek';
    document.getElementById('editDesc').value = projectData.description || '';
    document.getElementById('editAddress').value = projectData.location?.address || '';
    
    // Update stats
    updateProjectStats();
    
    // Initialize components
    initMap();
    renderACUnits();
    renderMaterials();
    renderDocuments();
    renderPhotos();
    initChart();
    setupTabs();
}

function updateProjectStats() {
    // Calculate from AC Units
    let acTotal = 0;
    (projectData.acUnits || []).forEach(unit => {
        acTotal += (unit.price || 0) * (unit.qty || 0);
    });
    
    // Calculate from Materials & Services
    const items = [
        ...(projectData.materials || []),
        ...(projectData.services || [])
    ];
    
    let totalQuotation = acTotal;
    let totalReal = 0;
    
    items.forEach(item => {
        totalQuotation += (item.quotationPrice || 0) * (item.quotationQty || 0);
        totalReal += (item.realPrice || 0) * (item.realQty || 0);
    });
    
    const profitLoss = totalQuotation - totalReal;
    const isProfit = profitLoss >= 0;
    
    // Update display
    document.getElementById('statQuotation').textContent = formatCurrency(totalQuotation);
    document.getElementById('statPL').textContent = formatCurrency(Math.abs(profitLoss));
    document.getElementById('plLabel').textContent = isProfit ? 'Profit' : 'Loss';
    
    const plCard = document.getElementById('plCard');
    plCard.classList.remove('profit', 'loss');
    plCard.classList.add(isProfit ? 'profit' : 'loss');
}

// ============ MAP (Leaflet) ============
function initMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;
    
    const location = projectData.location || DEFAULT_MAP_CENTER;
    const center = [
        location.lat || DEFAULT_MAP_CENTER.lat,
        location.lng || DEFAULT_MAP_CENTER.lng
    ];
    
    // Initialize Leaflet map
    map = L.map('map', {
        center: center,
        zoom: 15,
        zoomControl: true
    });
    
    // Light theme tile layer (CartoDB Positron)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
    
    // Add marker if location exists
    if (location.lat && location.lng) {
        // Custom marker icon
        const markerIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="background: #4988C4; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        marker = L.marker(center, { icon: markerIcon }).addTo(map);
        
        // Add popup
        if (projectData.projectName) {
            marker.bindPopup(`<b>${projectData.projectName}</b><br>${location.address || ''}`);
        }
    }
}

// ============ AC UNITS ============
function renderACUnits() {
    const tbody = document.getElementById('acUnitsBody');
    if (!tbody) return;
    
    const units = projectData.acUnits || [];
    
    tbody.innerHTML = units.map((unit, idx) => {
        const total = (unit.price || 0) * (unit.qty || 0);
        return `
            <tr>
                <td>
                    <input type="text" value="${unit.brand || ''}" 
                           data-idx="${idx}" data-field="brand"
                           placeholder="Daikin, Panasonic..."
                           onchange="updateACUnit(this)">
                </td>
                <td>
                    <select data-idx="${idx}" data-field="pk" onchange="updateACUnit(this)">
                        <option value="0.5" ${unit.pk == 0.5 ? 'selected' : ''}>1/2 PK</option>
                        <option value="0.75" ${unit.pk == 0.75 ? 'selected' : ''}>3/4 PK</option>
                        <option value="1" ${unit.pk == 1 ? 'selected' : ''}>1 PK</option>
                        <option value="1.5" ${unit.pk == 1.5 ? 'selected' : ''}>1.5 PK</option>
                        <option value="2" ${unit.pk == 2 ? 'selected' : ''}>2 PK</option>
                        <option value="2.5" ${unit.pk == 2.5 ? 'selected' : ''}>2.5 PK</option>
                        <option value="3" ${unit.pk == 3 ? 'selected' : ''}>3 PK</option>
                        <option value="5" ${unit.pk == 5 ? 'selected' : ''}>5 PK</option>
                    </select>
                </td>
                <td>
                    <select data-idx="${idx}" data-field="type" onchange="updateACUnit(this)">
                        <option value="split" ${unit.type == 'split' ? 'selected' : ''}>Split Wall</option>
                        <option value="cassette" ${unit.type == 'cassette' ? 'selected' : ''}>Cassette</option>
                        <option value="standing" ${unit.type == 'standing' ? 'selected' : ''}>Standing</option>
                        <option value="ducting" ${unit.type == 'ducting' ? 'selected' : ''}>Ducting</option>
                    </select>
                </td>
                <td>
                    <input type="number" value="${unit.qty || 1}" min="1"
                           data-idx="${idx}" data-field="qty"
                           onchange="updateACUnit(this)">
                </td>
                <td>
                    <input type="number" value="${unit.price || 0}"
                           data-idx="${idx}" data-field="price"
                           onchange="updateACUnit(this)">
                </td>
                <td style="font-weight: 700; color: var(--primary-light);">
                    ${formatCurrency(total)}
                </td>
                <td>
                    <button class="btn-remove-row" onclick="removeACUnit(${idx})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Update total
    let grandTotal = 0;
    units.forEach(unit => {
        grandTotal += (unit.price || 0) * (unit.qty || 0);
    });
    document.getElementById('acUnitsTotal').textContent = formatCurrency(grandTotal);
}

function addACUnit() {
    projectData.acUnits.push({
        brand: '',
        pk: 1,
        type: 'split',
        qty: 1,
        price: 0
    });
    renderACUnits();
    updateProjectStats();
}

function updateACUnit(input) {
    const idx = parseInt(input.dataset.idx);
    const field = input.dataset.field;
    let value = input.value;
    
    // Convert numeric fields
    if (['pk', 'qty', 'price'].includes(field)) {
        value = parseFloat(value) || 0;
    }
    
    projectData.acUnits[idx][field] = value;
    renderACUnits();
    updateProjectStats();
}

function removeACUnit(idx) {
    if (!confirm('Hapus unit AC ini?')) return;
    projectData.acUnits.splice(idx, 1);
    renderACUnits();
    updateProjectStats();
}

// ============ MATERIALS TABLE ============
function renderMaterials() {
    const tbody = document.getElementById('materialsBody');
    if (!tbody) return;
    
    const materials = projectData.materials || [];
    const services = projectData.services || [];
    const allItems = [...materials, ...services];
    
    tbody.innerHTML = allItems.map((item, idx) => {
        const qTotal = (item.quotationPrice || 0) * (item.quotationQty || 0);
        const rTotal = (item.realPrice || 0) * (item.realQty || 0);
        const pl = qTotal - rTotal;
        const isProfit = pl >= 0;
        
        return `
            <tr>
                <td><strong style="color: var(--text-white)">${item.name}</strong></td>
                <td style="color: var(--text-light)">${item.unit}</td>
                <td>
                    <input type="number" value="${item.quotationQty || 0}" 
                           data-idx="${idx}" data-field="quotationQty" 
                           onchange="updateMaterial(this)">
                </td>
                <td>
                    <input type="number" value="${item.quotationPrice || 0}" 
                           data-idx="${idx}" data-field="quotationPrice" 
                           onchange="updateMaterial(this)">
                </td>
                <td>
                    <input type="number" value="${item.realQty || 0}" 
                           data-idx="${idx}" data-field="realQty" 
                           onchange="updateMaterial(this)">
                </td>
                <td>
                    <input type="number" value="${item.realPrice || 0}" 
                           data-idx="${idx}" data-field="realPrice" 
                           onchange="updateMaterial(this)">
                </td>
                <td style="color: ${isProfit ? 'var(--success)' : 'var(--danger)'}; font-weight: 700;">
                    ${isProfit ? '+' : ''}${formatCurrency(pl)}
                </td>
            </tr>
        `;
    }).join('');
}

function updateMaterial(input) {
    const idx = parseInt(input.dataset.idx);
    const field = input.dataset.field;
    const value = parseFloat(input.value) || 0;
    
    const materials = projectData.materials || [];
    const services = projectData.services || [];
    
    if (idx < materials.length) {
        projectData.materials[idx][field] = value;
    } else {
        projectData.services[idx - materials.length][field] = value;
    }
    
    renderMaterials();
    updateProjectStats();
    initChart();
}

// ============ DOCUMENTS ============
function renderDocuments() {
    const docTypes = ['penawaran', 'bast', 'invoice', 'gallery'];
    
    docTypes.forEach(type => {
        const listEl = document.getElementById(`${type}List`);
        if (!listEl) return;
        
        const docs = projectData.documents?.[type] || [];
        
        listEl.innerHTML = docs.map((doc, idx) => `
            <div class="document-item">
                <div class="document-item-info">
                    <i class="fas ${getDocIcon(doc.name)}"></i>
                    <span class="document-item-name">${doc.name}</span>
                </div>
                <div class="document-item-actions">
                    <button class="btn-view-doc" onclick="window.open('${doc.url}', '_blank')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-delete-doc" onclick="deleteDocument('${type}', ${idx})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    });
}

function getDocIcon(filename) {
    if (!filename) return 'fa-file';
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'pdf': 'fa-file-pdf',
        'doc': 'fa-file-word',
        'docx': 'fa-file-word',
        'jpg': 'fa-file-image',
        'jpeg': 'fa-file-image',
        'png': 'fa-file-image'
    };
    return icons[ext] || 'fa-file';
}

function triggerUpload(type) {
    const capitalType = type.charAt(0).toUpperCase() + type.slice(1);
    document.getElementById(`upload${capitalType}`).click();
}

async function uploadDocument(type, input) {
    const files = input.files;
    if (!files.length) return;
    
    showLoading('Mengupload dokumen...');
    
    try {
        for (const file of files) {
            // Upload to Cloudinary
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'nala_survey');
            formData.append('folder', `nala_projects/${projectId}/${type}`);
            
            const response = await fetch('https://api.cloudinary.com/v1_1/dsvsx9u2o/auto/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.secure_url) {
                if (!projectData.documents[type]) {
                    projectData.documents[type] = [];
                }
                
                projectData.documents[type].push({
                    name: file.name,
                    url: data.secure_url,
                    publicId: data.public_id,
                    uploadedAt: new Date().toISOString()
                });
            }
        }
        
        // Save to Firestore
        await db.collection(COLLECTIONS.PROJECTS).doc(projectId).update({
            documents: projectData.documents
        });
        
        hideLoading();
        renderDocuments();
        showToast('Dokumen berhasil diupload!', 'success');
        
    } catch (error) {
        console.error('Upload error:', error);
        hideLoading();
        showToast('Gagal upload dokumen', 'error');
    }
    
    // Reset input
    input.value = '';
}

async function deleteDocument(type, idx) {
    if (!confirm('Hapus dokumen ini?')) return;
    
    projectData.documents[type].splice(idx, 1);
    
    try {
        await db.collection(COLLECTIONS.PROJECTS).doc(projectId).update({
            documents: projectData.documents
        });
        
        renderDocuments();
        showToast('Dokumen dihapus', 'success');
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Gagal menghapus dokumen', 'error');
    }
}

// ============ PHOTOS ============
function renderPhotos() {
    const grid = document.getElementById('photosGrid');
    if (!grid) return;
    
    const photos = projectData.photos || [];
    
    grid.innerHTML = photos.map((photo, idx) => `
        <div class="photo-item">
            <img src="${photo.url}" alt="Project photo ${idx + 1}">
            <div class="photo-overlay">
                <button onclick="deletePhoto(${idx})">
                    <i class="fas fa-trash"></i> Hapus
                </button>
            </div>
        </div>
    `).join('');
}

async function uploadPhoto(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'nala_survey');
        formData.append('folder', `nala_projects/${projectId}`);
        
        const response = await fetch('https://api.cloudinary.com/v1_1/dsvsx9u2o/image/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.secure_url) {
            if (!projectData.photos) projectData.photos = [];
            projectData.photos.push({
                url: data.secure_url,
                publicId: data.public_id,
                uploadedAt: new Date().toISOString()
            });
            
            await db.collection(COLLECTIONS.PROJECTS).doc(projectId).update({
                photos: projectData.photos
            });
            
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Upload error:', error);
        return false;
    }
}

async function deletePhoto(index) {
    if (!confirm('Hapus foto ini?')) return;
    
    projectData.photos.splice(index, 1);
    
    try {
        await db.collection(COLLECTIONS.PROJECTS).doc(projectId).update({
            photos: projectData.photos
        });
        
        renderPhotos();
        showToast('Foto dihapus', 'success');
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Gagal menghapus foto', 'error');
    }
}

// ============ CHART ============
function initChart() {
    const canvas = document.getElementById('plChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const items = [...(projectData.materials || []), ...(projectData.services || [])];
    
    if (plChart) plChart.destroy();
    
    plChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: items.map(i => i.name.length > 15 ? i.name.substring(0, 15) + '...' : i.name),
            datasets: [
                {
                    label: 'Penawaran',
                    data: items.map(i => (i.quotationPrice || 0) * (i.quotationQty || 0)),
                    backgroundColor: 'rgba(73, 136, 196, 0.8)',
                    borderRadius: 6
                },
                {
                    label: 'Real',
                    data: items.map(i => (i.realPrice || 0) * (i.realQty || 0)),
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#8eb8d6',
                        font: { weight: 600 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(189, 232, 245, 0.1)' },
                    ticks: { color: '#8eb8d6', font: { weight: 600 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#8eb8d6', font: { weight: 600 }, maxRotation: 45, minRotation: 45 }
                }
            }
        }
    });
}

// ============ TABS ============
function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        });
    });
}

// ============ SAVE PROJECT ============
async function saveProject() {
    showLoading('Menyimpan...');
    
    try {
        const updateData = {
            projectName: document.getElementById('editName').value.trim(),
            client: document.getElementById('editClient').value.trim(),
            phone: document.getElementById('editPhone').value.trim(),
            status: document.getElementById('editStatus').value,
            description: document.getElementById('editDesc').value.trim(),
            acUnits: projectData.acUnits,
            materials: projectData.materials,
            services: projectData.services,
            documents: projectData.documents,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection(COLLECTIONS.PROJECTS).doc(projectId).update(updateData);
        
        hideLoading();
        showToast('Project berhasil disimpan!', 'success');
        
        // Update local data
        projectData = { ...projectData, ...updateData };
        renderProject();
        
    } catch (error) {
        console.error('Save error:', error);
        hideLoading();
        showToast('Gagal menyimpan: ' + error.message, 'error');
    }
}

// ============ DELETE PROJECT ============
async function deleteProject() {
    if (!confirm('Hapus project ini? Tindakan ini tidak dapat dibatalkan.')) return;
    
    showLoading('Menghapus...');
    
    try {
        await db.collection(COLLECTIONS.PROJECTS).doc(projectId).delete();
        
        hideLoading();
        showToast('Project dihapus!', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        console.error('Delete error:', error);
        hideLoading();
        showToast('Gagal menghapus project', 'error');
    }
}

// ============ EXPORT PDF ============
function exportPDF() {
    showLoading('Generating PDF...');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Header
        doc.setFillColor(15, 40, 84);
        doc.rect(0, 0, 220, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('NALA AIRCON', 20, 20);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Project Report', 20, 30);
        
        // Project Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(projectData.projectName || 'Untitled', 20, 55);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Client: ${projectData.client || '-'}`, 20, 65);
        doc.text(`Phone: ${projectData.phone || '-'}`, 20, 72);
        doc.text(`Status: ${projectData.status || '-'}`, 20, 79);
        doc.text(`Address: ${projectData.location?.address || '-'}`, 20, 86);
        
        // Calculate totals
        let acTotal = 0;
        (projectData.acUnits || []).forEach(u => {
            acTotal += (u.price || 0) * (u.qty || 0);
        });
        
        let matQ = 0, matR = 0;
        [...(projectData.materials || []), ...(projectData.services || [])].forEach(i => {
            matQ += (i.quotationPrice || 0) * (i.quotationQty || 0);
            matR += (i.realPrice || 0) * (i.realQty || 0);
        });
        
        const totalQuotation = acTotal + matQ;
        const profitLoss = totalQuotation - matR;
        
        // Summary Box
        doc.setFillColor(240, 240, 240);
        doc.rect(20, 95, 170, 25, 'F');
        
        doc.setFontSize(10);
        doc.text('Total Penawaran:', 25, 105);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrencyPlain(totalQuotation), 25, 113);
        
        doc.setFont('helvetica', 'normal');
        doc.text('Profit/Loss:', 100, 105);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(profitLoss >= 0 ? 0 : 200, profitLoss >= 0 ? 150 : 0, 0);
        doc.text(formatCurrencyPlain(profitLoss), 100, 113);
        
        // AC Units Table
        doc.setTextColor(0, 0, 0);
        if (projectData.acUnits && projectData.acUnits.length > 0) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Unit AC', 20, 135);
            
            doc.autoTable({
                startY: 140,
                head: [['Merk', 'PK', 'Tipe', 'Qty', 'Harga', 'Total']],
                body: projectData.acUnits.map(u => [
                    u.brand || '-',
                    u.pk + ' PK',
                    u.type || '-',
                    u.qty || 0,
                    formatCurrencyPlain(u.price || 0),
                    formatCurrencyPlain((u.price || 0) * (u.qty || 0))
                ]),
                theme: 'striped',
                headStyles: { fillColor: [28, 77, 141] }
            });
        }
        
        // Materials Table
        const materials = [...(projectData.materials || []), ...(projectData.services || [])].filter(m => m.quotationQty > 0 || m.realQty > 0);
        
        if (materials.length > 0) {
            const startY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 135;
            
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Materials & Services', 20, startY);
            
            doc.autoTable({
                startY: startY + 5,
                head: [['Item', 'Unit', 'Q.Qty', 'Q.Price', 'R.Qty', 'R.Price', 'P/L']],
                body: materials.map(m => {
                    const qT = (m.quotationPrice || 0) * (m.quotationQty || 0);
                    const rT = (m.realPrice || 0) * (m.realQty || 0);
                    return [
                        m.name,
                        m.unit,
                        m.quotationQty || 0,
                        formatCurrencyPlain(m.quotationPrice || 0),
                        m.realQty || 0,
                        formatCurrencyPlain(m.realPrice || 0),
                        formatCurrencyPlain(qT - rT)
                    ];
                }),
                theme: 'striped',
                headStyles: { fillColor: [28, 77, 141] },
                columnStyles: {
                    0: { cellWidth: 40 }
                }
            });
        }
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Generated by NalaBI - ${new Date().toLocaleDateString('id-ID')}`, 20, 290);
            doc.text(`Page ${i} of ${pageCount}`, 180, 290);
        }
        
        // Save
        doc.save(`Project_${projectData.projectName || 'Report'}_${Date.now()}.pdf`);
        
        hideLoading();
        showToast('PDF berhasil di-export!', 'success');
        
    } catch (error) {
        console.error('PDF error:', error);
        hideLoading();
        showToast('Gagal generate PDF', 'error');
    }
}

function formatCurrencyPlain(amount) {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(amount);
}

// ============ PRINT ============
function printProject() {
    window.print();
}

// ============ FILE UPLOAD HANDLERS ============
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const uploadZone = document.getElementById('uploadZone');
        const photoInput = document.getElementById('photoInput');
        
        if (uploadZone && photoInput) {
            uploadZone.addEventListener('click', () => {
                photoInput.click();
            });
            
            photoInput.addEventListener('change', async (e) => {
                const files = e.target.files;
                if (!files.length) return;
                
                showLoading('Mengupload foto...');
                
                let successCount = 0;
                for (const file of files) {
                    const success = await uploadPhoto(file);
                    if (success) successCount++;
                }
                
                hideLoading();
                renderPhotos();
                
                if (successCount > 0) {
                    showToast(`${successCount} foto berhasil diupload!`, 'success');
                } else {
                    showToast('Gagal upload foto', 'error');
                }
                
                photoInput.value = '';
            });
        }
    }, 500);
});

// ============ UTILITIES ============
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

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
    setTimeout(() => toast.classList.remove('show'), 3500);
}

function logout() {
    auth.signOut().then(() => window.location.href = 'index.html');
}

// ============ EXPORTS ============
window.addACUnit = addACUnit;
window.updateACUnit = updateACUnit;
window.removeACUnit = removeACUnit;
window.updateMaterial = updateMaterial;
window.triggerUpload = triggerUpload;
window.uploadDocument = uploadDocument;
window.deleteDocument = deleteDocument;
window.deletePhoto = deletePhoto;
window.saveProject = saveProject;
window.deleteProject = deleteProject;
window.exportPDF = exportPDF;
window.printProject = printProject;
window.logout = logout;
