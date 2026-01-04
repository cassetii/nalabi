// ================================================
// NALABI REPORTS - JavaScript
// Features: Charts, Analytics, Export PDF/Excel
// ================================================

// ============ GLOBAL STATE ============
let allProjects = [];
let filteredProjects = [];
let currentYear = new Date().getFullYear();
let currentMonth = 'all';

let revenueChart = null;
let statusChart = null;
let projectsChart = null;

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged((user) => {
        if (user) {
            initReports();
        } else {
            window.location.href = 'index.html';
        }
    });
});

async function initReports() {
    console.log('🚀 Initializing Reports...');
    
    // Set current year in filter
    document.getElementById('yearFilter').value = currentYear;
    
    // Load projects
    await loadProjects();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('✅ Reports initialized');
}

// ============ DATA LOADING ============
async function loadProjects() {
    showLoading('Memuat data...');
    
    try {
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
        
        applyFilters();
        hideLoading();
        
    } catch (error) {
        console.error('Error loading projects:', error);
        hideLoading();
        showToast('Gagal memuat data', 'error');
    }
}

// ============ FILTERING ============
function applyFilters() {
    // Filter by year
    filteredProjects = allProjects.filter(project => {
        if (!project.createdAt) return false;
        const projectDate = project.createdAt.toDate();
        return projectDate.getFullYear() === parseInt(currentYear);
    });
    
    // Filter by month if specified
    if (currentMonth !== 'all') {
        const monthIndex = parseInt(currentMonth);
        filteredProjects = filteredProjects.filter(project => {
            const projectDate = project.createdAt.toDate();
            return projectDate.getMonth() === monthIndex;
        });
    }
    
    // Update UI
    updateReportPeriod();
    updateSummaryStats();
    updateCharts();
    updateTopProjects();
    updateMonthlyTable();
}

function updateReportPeriod() {
    let periodText = `Laporan Tahun ${currentYear}`;
    if (currentMonth !== 'all') {
        periodText = `Laporan ${MONTHS[parseInt(currentMonth)]} ${currentYear}`;
    }
    document.getElementById('reportPeriod').textContent = periodText;
}

// ============ CALCULATIONS ============
function calculateProjectTotals(project) {
    let quotation = 0;
    let real = 0;
    
    // AC Units
    (project.acUnits || []).forEach(unit => {
        quotation += (unit.price || 0) * (unit.qty || 0);
    });
    
    // Materials & Services
    const items = [...(project.materials || []), ...(project.services || [])];
    items.forEach(item => {
        quotation += (item.quotationPrice || 0) * (item.quotationQty || 0);
        real += (item.realPrice || 0) * (item.realQty || 0);
    });
    
    return {
        quotation,
        real,
        profit: quotation - real
    };
}

function getMonthlyData() {
    const monthlyData = Array(12).fill(null).map(() => ({
        projects: 0,
        completed: 0,
        quotation: 0,
        real: 0,
        profit: 0
    }));
    
    // Only filter by year for monthly breakdown
    const yearProjects = allProjects.filter(project => {
        if (!project.createdAt) return false;
        return project.createdAt.toDate().getFullYear() === parseInt(currentYear);
    });
    
    yearProjects.forEach(project => {
        const month = project.createdAt.toDate().getMonth();
        const totals = calculateProjectTotals(project);
        
        monthlyData[month].projects++;
        if (project.status === 'selesai') {
            monthlyData[month].completed++;
        }
        monthlyData[month].quotation += totals.quotation;
        monthlyData[month].real += totals.real;
        monthlyData[month].profit += totals.profit;
    });
    
    return monthlyData;
}

// ============ UPDATE UI ============
function updateSummaryStats() {
    let totalQuotation = 0;
    let totalReal = 0;
    let completed = 0;
    
    filteredProjects.forEach(project => {
        const totals = calculateProjectTotals(project);
        totalQuotation += totals.quotation;
        totalReal += totals.real;
        
        if (project.status === 'selesai') {
            completed++;
        }
    });
    
    const profit = totalQuotation - totalReal;
    const isProfit = profit >= 0;
    
    document.getElementById('statTotalProjects').textContent = filteredProjects.length;
    document.getElementById('statCompleted').textContent = completed;
    document.getElementById('statTotalRevenue').textContent = formatCurrency(totalQuotation);
    document.getElementById('statTotalProfit').textContent = formatCurrency(Math.abs(profit));
    document.getElementById('profitLossLabel').textContent = isProfit ? 'Total Profit' : 'Total Loss';
}

// ============ CHARTS ============
function updateCharts() {
    updateRevenueChart();
    updateStatusChart();
    updateProjectsChart();
}

function updateRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    const monthlyData = getMonthlyData();
    
    if (revenueChart) revenueChart.destroy();
    
    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: MONTHS.map(m => m.substring(0, 3)),
            datasets: [
                {
                    label: 'Pendapatan',
                    data: monthlyData.map(d => d.quotation),
                    borderColor: '#4988C4',
                    backgroundColor: 'rgba(73, 136, 196, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3
                },
                {
                    label: 'Biaya Real',
                    data: monthlyData.map(d => d.real),
                    borderColor: '#a855f7',
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3
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
                    ticks: {
                        color: '#8eb8d6',
                        font: { weight: 600 },
                        callback: value => formatCompact(value)
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#8eb8d6', font: { weight: 600 } }
                }
            }
        }
    });
}

function updateStatusChart() {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    
    const statusCounts = {
        prospek: 0,
        survey: 0,
        pengerjaan: 0,
        selesai: 0,
        ditolak: 0
    };
    
    filteredProjects.forEach(p => {
        if (statusCounts.hasOwnProperty(p.status)) {
            statusCounts[p.status]++;
        }
    });
    
    if (statusChart) statusChart.destroy();
    
    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Prospek', 'Survey', 'Progress', 'Selesai', 'Ditolak'],
            datasets: [{
                data: [
                    statusCounts.prospek,
                    statusCounts.survey,
                    statusCounts.pengerjaan,
                    statusCounts.selesai,
                    statusCounts.ditolak
                ],
                backgroundColor: ['#4988C4', '#10b981', '#a855f7', '#059669', '#ef4444'],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#8eb8d6',
                        font: { weight: 600 },
                        padding: 15
                    }
                }
            }
        }
    });
}

function updateProjectsChart() {
    const ctx = document.getElementById('projectsChart');
    if (!ctx) return;
    
    const monthlyData = getMonthlyData();
    
    if (projectsChart) projectsChart.destroy();
    
    projectsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: MONTHS.map(m => m.substring(0, 3)),
            datasets: [{
                label: 'Total Projects',
                data: monthlyData.map(d => d.projects),
                backgroundColor: 'rgba(73, 136, 196, 0.8)',
                borderRadius: 6,
                barThickness: 20
            }, {
                label: 'Selesai',
                data: monthlyData.map(d => d.completed),
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderRadius: 6,
                barThickness: 20
            }]
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
                    ticks: { color: '#8eb8d6', font: { weight: 600 }, stepSize: 1 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#8eb8d6', font: { weight: 600 } }
                }
            }
        }
    });
}

// ============ TOP PROJECTS ============
function updateTopProjects() {
    const container = document.getElementById('topProjectsList');
    if (!container) return;
    
    // Sort by quotation value
    const sorted = [...filteredProjects].map(p => ({
        ...p,
        totals: calculateProjectTotals(p)
    })).sort((a, b) => b.totals.quotation - a.totals.quotation).slice(0, 5);
    
    container.innerHTML = sorted.map((project, idx) => {
        const rankClass = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : 'default';
        return `
            <div class="top-project-item" onclick="viewProject('${project.id}')">
                <div class="top-project-rank ${rankClass}">${idx + 1}</div>
                <div class="top-project-info">
                    <div class="top-project-name">${project.projectName || 'Untitled'}</div>
                    <div class="top-project-client">${project.client || '-'}</div>
                </div>
                <div class="top-project-value">${formatCurrency(project.totals.quotation)}</div>
            </div>
        `;
    }).join('');
    
    if (sorted.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Tidak ada data</p>';
    }
}

// ============ MONTHLY TABLE ============
function updateMonthlyTable() {
    const tbody = document.getElementById('monthlyTableBody');
    const tfoot = document.getElementById('monthlyTableFoot');
    if (!tbody || !tfoot) return;
    
    const monthlyData = getMonthlyData();
    
    let totalProjects = 0;
    let totalCompleted = 0;
    let totalQuotation = 0;
    let totalReal = 0;
    let totalProfit = 0;
    
    tbody.innerHTML = monthlyData.map((data, idx) => {
        totalProjects += data.projects;
        totalCompleted += data.completed;
        totalQuotation += data.quotation;
        totalReal += data.real;
        totalProfit += data.profit;
        
        const margin = data.quotation > 0 ? ((data.profit / data.quotation) * 100).toFixed(1) : 0;
        const isProfit = data.profit >= 0;
        
        return `
            <tr>
                <td style="font-weight: 600; color: var(--text-white);">${MONTHS[idx]}</td>
                <td>${data.projects}</td>
                <td>${data.completed}</td>
                <td>${formatCurrency(data.quotation)}</td>
                <td>${formatCurrency(data.real)}</td>
                <td class="${isProfit ? 'trend-up' : 'trend-down'}">
                    ${isProfit ? '+' : ''}${formatCurrency(data.profit)}
                </td>
                <td class="${margin >= 0 ? 'trend-up' : 'trend-down'}">${margin}%</td>
            </tr>
        `;
    }).join('');
    
    const totalMargin = totalQuotation > 0 ? ((totalProfit / totalQuotation) * 100).toFixed(1) : 0;
    const isTotalProfit = totalProfit >= 0;
    
    tfoot.innerHTML = `
        <tr style="background: var(--bg-card-hover); font-weight: 700;">
            <td style="color: var(--text-white);">TOTAL</td>
            <td style="color: var(--primary-light);">${totalProjects}</td>
            <td style="color: var(--success);">${totalCompleted}</td>
            <td style="color: var(--primary-light);">${formatCurrency(totalQuotation)}</td>
            <td style="color: var(--purple);">${formatCurrency(totalReal)}</td>
            <td class="${isTotalProfit ? 'trend-up' : 'trend-down'}">${isTotalProfit ? '+' : ''}${formatCurrency(totalProfit)}</td>
            <td class="${totalMargin >= 0 ? 'trend-up' : 'trend-down'}">${totalMargin}%</td>
        </tr>
    `;
}

// ============ EXPORT PDF ============
function exportReportPDF() {
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
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        let periodText = `Laporan Tahun ${currentYear}`;
        if (currentMonth !== 'all') {
            periodText = `Laporan ${MONTHS[parseInt(currentMonth)]} ${currentYear}`;
        }
        doc.text(periodText, 20, 30);
        
        // Summary
        let totalQuotation = 0, totalReal = 0, completed = 0;
        filteredProjects.forEach(p => {
            const totals = calculateProjectTotals(p);
            totalQuotation += totals.quotation;
            totalReal += totals.real;
            if (p.status === 'selesai') completed++;
        });
        const profit = totalQuotation - totalReal;
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Ringkasan', 20, 55);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Projects: ${filteredProjects.length}`, 20, 65);
        doc.text(`Projects Selesai: ${completed}`, 20, 72);
        doc.text(`Total Pendapatan: ${formatCurrencyPlain(totalQuotation)}`, 20, 79);
        doc.text(`Total Biaya Real: ${formatCurrencyPlain(totalReal)}`, 20, 86);
        doc.text(`Profit/Loss: ${formatCurrencyPlain(profit)}`, 20, 93);
        
        // Monthly Breakdown Table
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Breakdown Bulanan', 20, 110);
        
        const monthlyData = getMonthlyData();
        
        doc.autoTable({
            startY: 115,
            head: [['Bulan', 'Projects', 'Selesai', 'Pendapatan', 'Biaya Real', 'Profit/Loss']],
            body: monthlyData.map((d, idx) => [
                MONTHS[idx],
                d.projects,
                d.completed,
                formatCurrencyPlain(d.quotation),
                formatCurrencyPlain(d.real),
                formatCurrencyPlain(d.profit)
            ]),
            theme: 'striped',
            headStyles: { fillColor: [28, 77, 141] }
        });
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Generated by NalaBI - ${new Date().toLocaleDateString('id-ID')}`, 20, 290);
            doc.text(`Page ${i} of ${pageCount}`, 180, 290);
        }
        
        doc.save(`Report_${currentYear}_${Date.now()}.pdf`);
        
        hideLoading();
        showToast('PDF berhasil di-export!', 'success');
        
    } catch (error) {
        console.error('PDF error:', error);
        hideLoading();
        showToast('Gagal generate PDF', 'error');
    }
}

// ============ EXPORT EXCEL ============
function exportReportExcel() {
    showLoading('Generating Excel...');
    
    try {
        const monthlyData = getMonthlyData();
        
        // Prepare data
        const wsData = [
            ['NALA AIRCON - Report'],
            [`Tahun ${currentYear}`],
            [],
            ['Bulan', 'Projects', 'Selesai', 'Pendapatan', 'Biaya Real', 'Profit/Loss', 'Margin %']
        ];
        
        let totalProjects = 0, totalCompleted = 0, totalQ = 0, totalR = 0, totalPL = 0;
        
        monthlyData.forEach((d, idx) => {
            totalProjects += d.projects;
            totalCompleted += d.completed;
            totalQ += d.quotation;
            totalR += d.real;
            totalPL += d.profit;
            
            const margin = d.quotation > 0 ? ((d.profit / d.quotation) * 100).toFixed(1) : 0;
            
            wsData.push([
                MONTHS[idx],
                d.projects,
                d.completed,
                d.quotation,
                d.real,
                d.profit,
                margin + '%'
            ]);
        });
        
        const totalMargin = totalQ > 0 ? ((totalPL / totalQ) * 100).toFixed(1) : 0;
        wsData.push(['TOTAL', totalProjects, totalCompleted, totalQ, totalR, totalPL, totalMargin + '%']);
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 15 }, { wch: 10 }, { wch: 10 },
            { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 }
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, 'Report');
        
        // Add projects detail sheet
        const projectsData = [
            ['DAFTAR PROJECT'],
            [],
            ['Nama Project', 'Client', 'Status', 'Tanggal', 'Pendapatan', 'Profit/Loss']
        ];
        
        filteredProjects.forEach(p => {
            const totals = calculateProjectTotals(p);
            const date = p.createdAt ? p.createdAt.toDate().toLocaleDateString('id-ID') : '-';
            projectsData.push([
                p.projectName || 'Untitled',
                p.client || '-',
                p.status || '-',
                date,
                totals.quotation,
                totals.profit
            ]);
        });
        
        const ws2 = XLSX.utils.aoa_to_sheet(projectsData);
        ws2['!cols'] = [
            { wch: 30 }, { wch: 20 }, { wch: 15 },
            { wch: 15 }, { wch: 18 }, { wch: 18 }
        ];
        XLSX.utils.book_append_sheet(wb, ws2, 'Projects');
        
        // Save
        XLSX.writeFile(wb, `Report_${currentYear}_${Date.now()}.xlsx`);
        
        hideLoading();
        showToast('Excel berhasil di-export!', 'success');
        
    } catch (error) {
        console.error('Excel error:', error);
        hideLoading();
        showToast('Gagal generate Excel', 'error');
    }
}

// ============ EVENT LISTENERS ============
function setupEventListeners() {
    document.getElementById('yearFilter').addEventListener('change', (e) => {
        currentYear = e.target.value;
        applyFilters();
    });
    
    document.getElementById('monthFilter').addEventListener('change', (e) => {
        currentMonth = e.target.value;
        applyFilters();
    });
}

// ============ UTILITIES ============
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatCurrencyPlain(amount) {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(amount);
}

function formatCompact(value) {
    if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'B';
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
    return value;
}

function viewProject(id) {
    window.location.href = `project-detail.html?id=${id}`;
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
window.exportReportPDF = exportReportPDF;
window.exportReportExcel = exportReportExcel;
window.viewProject = viewProject;
window.logout = logout;
