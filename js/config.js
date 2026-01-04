// ================================================
// FIREBASE CONFIGURATION
// Nala Project Management System - UPDATED
// ================================================

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBI5T3ZVyHXSRFikTjSlnW9P04cO1UDAwg",
    authDomain: "databasebesar.firebaseapp.com",
    projectId: "databasebesar",
    storageBucket: "databasebesar.firebasestorage.app",
    messagingSenderId: "253231829334",
    appId: "1:253231829334:web:8de5d690cb4fb61bc546f7",
    measurementId: "G-7LL38NC8PM"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Collections
const COLLECTIONS = {
    PROJECTS: 'nala_projects',
    CUSTOMERS: 'customers',
    KPI: 'kpi_teknisi',
    DASHBOARD: 'nala_dashboard_projects'
};

// Storage Paths
const STORAGE_PATHS = {
    PHOTOS: 'nala_projects/{projectId}/photos/',
    DOCUMENTS: 'nala_projects/{projectId}/documents/',
    PENAWARAN: 'nala_projects/{projectId}/documents/penawaran/',
    BAST: 'nala_projects/{projectId}/documents/bast/',
    INVOICE: 'nala_projects/{projectId}/documents/invoice/',
    GALLERY: 'nala_projects/{projectId}/documents/gallery/'
};

// Constants
const MAX_PHOTOS = 10;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

// Project Status
const PROJECT_STATUS = {
    PROSPEK: 'prospek',
    SURVEY: 'survey',
    PENGERJAAN: 'pengerjaan',
    DITOLAK: 'ditolak'
};

// Default Materials - UPDATED WITH BREAKDOWN
const DEFAULT_MATERIALS = [
    // Pipa - 3 Types
    { name: 'Pipa 1/4" - 3/8"', unit: 'm', quotationPrice: 0, quotationQty: 0, realPrice: 0, realQty: 0 },
    { name: 'Pipa 1/4" - 1/2"', unit: 'm', quotationPrice: 0, quotationQty: 0, realPrice: 0, realQty: 0 },
    { name: 'Pipa 3/8" - 5/8"', unit: 'm', quotationPrice: 0, quotationQty: 0, realPrice: 0, realQty: 0 },
    // Kabel - 4 Types
    { name: 'Kabel 2x1.5', unit: 'm', quotationPrice: 0, quotationQty: 0, realPrice: 0, realQty: 0 },
    { name: 'Kabel 2x2.5', unit: 'm', quotationPrice: 0, quotationQty: 0, realPrice: 0, realQty: 0 },
    { name: 'Kabel 3x2.5', unit: 'm', quotationPrice: 0, quotationQty: 0, realPrice: 0, realQty: 0 },
    { name: 'Kabel 4x2.5', unit: 'm', quotationPrice: 0, quotationQty: 0, realPrice: 0, realQty: 0 },
    // Other Materials
    { name: 'Bracket', unit: 'pcs', quotationPrice: 0, quotationQty: 0, realPrice: 0, realQty: 0 },
    { name: 'Ducktip', unit: 'pcs', quotationPrice: 0, quotationQty: 0, realPrice: 0, realQty: 0 },
    { name: 'Isolasi Listrik', unit: 'roll', quotationPrice: 0, quotationQty: 0, realPrice: 0, realQty: 0 },
    { name: 'Sadel', unit: 'pcs', quotationPrice: 0, quotationQty: 0, realPrice: 0, realQty: 0 },
    { name: 'Duckting', unit: 'm', quotationPrice: 0, quotationQty: 0, realPrice: 0, realQty: 0 },
    { name: 'Armaflex', unit: 'm', quotationPrice: 0, quotationQty: 0, realPrice: 0, realQty: 0 }
];

// Default Services
const DEFAULT_SERVICES = [
    { name: 'Jasa Pasang', unit: 'unit', quotationPrice: 0, quotationQty: 0, realPrice: 0, realQty: 0 },
    { name: 'Jasa Tarik Pipa', unit: 'unit', quotationPrice: 0, quotationQty: 0, realPrice: 0, realQty: 0 },
    { name: 'Jasa Bobok', unit: 'unit', quotationPrice: 0, quotationQty: 0, realPrice: 0, realQty: 0 }
];

// Default Map Center (Makassar, South Sulawesi)
const DEFAULT_MAP_CENTER = {
    lat: -5.1477,
    lng: 119.4327
};

const DEFAULT_MAP_ZOOM = 12;

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyAgJ1XyeNAym-SibOsJG57gE5WXWJgzDA4';

// Utility Functions
const utils = {
    // Format currency to IDR
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    },

    // Format date
    formatDate: (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
    },

    // Format date with time
    formatDateTime: (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },

    // Show toast notification
    showToast: (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Validate file size
    validateFileSize: (file, maxSize) => {
        return file.size <= maxSize;
    },

    // Validate file type
    validateFileType: (file, allowedTypes) => {
        return allowedTypes.some(type => file.type.includes(type));
    },

    // Generate unique ID
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

// Export for use in other files
window.firebaseConfig = firebaseConfig;
window.auth = auth;
window.db = db;
window.storage = storage;
window.COLLECTIONS = COLLECTIONS;
window.STORAGE_PATHS = STORAGE_PATHS;
window.MAX_PHOTOS = MAX_PHOTOS;
window.MAX_PHOTO_SIZE = MAX_PHOTO_SIZE;
window.MAX_DOCUMENT_SIZE = MAX_DOCUMENT_SIZE;
window.PROJECT_STATUS = PROJECT_STATUS;
window.DEFAULT_MATERIALS = DEFAULT_MATERIALS;
window.DEFAULT_SERVICES = DEFAULT_SERVICES;
window.DEFAULT_MAP_CENTER = DEFAULT_MAP_CENTER;
window.DEFAULT_MAP_ZOOM = DEFAULT_MAP_ZOOM;
window.GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_API_KEY;
window.utils = utils;

console.log('🔥 Firebase initialized successfully');
