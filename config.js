// =============================================
// CONFIGURACIÓN - Wealth Portfolio
// =============================================

// IMPORTANTE: Reemplaza esta URL con la URL de tu Google Apps Script
// Después de publicar tu script, copia la URL aquí
const CONFIG = {
    // URL del Google Apps Script (Web App)
    // Ejemplo: 'https://script.google.com/macros/s/AKfycbx.../exec'
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyYX2gHtCtjt4rqBOcOdi81FMYNG1-0PRhQuX-Wj-xOv-NS2qrAkwYYomHCN_fSOKKg/exec',
    
    // Símbolos para mostrar en el ticker del mercado
    MARKET_SYMBOLS: ['GGAL', 'YPF', 'AAPL', 'GOOGL', 'MSFT', 'MELI'],
    
    // Moneda local
    LOCAL_CURRENCY: 'ARS',
    
    // Configuración de caché (en minutos)
    CACHE_DURATION: 5,
    
    // Modo demo (usar datos de ejemplo sin conexión)
    DEMO_MODE: false
};

// Datos de ejemplo para modo demo
const DEMO_DATA = {
    users: [
        { user: 'demo', password: 'demo123' }
    ],
    transactions: [
        {
            id: '1',
            userId: 'demo',
            ticker: 'GGAL.BA',
            tickerName: 'Grupo Galicia',
            date: '2024-01-15',
            quantity: 100,
            priceARS: 150000,
            exchangeRate: 850,
            priceUSD: 176.47
        },
        {
            id: '2',
            userId: 'demo@demo.com',
            ticker: 'YPF.BA',
            tickerName: 'YPF S.A.',
            date: '2024-02-20',
            quantity: 50,
            priceARS: 200000,
            exchangeRate: 900,
            priceUSD: 222.22
        },
        {
            id: '3',
            userId: 'demo@demo.com',
            ticker: 'AAPL.BA',
            tickerName: 'Apple',
            date: '2024-03-10',
            quantity: 25,
            priceARS: 300000,
            exchangeRate: 950,
            priceUSD: 315.79
        }
    ],
    // Precios de respaldo si las APIs fallan
    currentPrices: {
        'GGAL.BA': { price: 2150, change: 3.2 },
        'GGAL': { price: 2150, change: 3.2 },
        'YPF.BA': { price: 5200, change: -0.8 },
        'YPF': { price: 5200, change: -0.8 },
        'AAPL.BA': { price: 18500, change: 1.5 },
        'AAPL': { price: 18500, change: 1.5 },
        'GOOGL.BA': { price: 14200, change: 0.9 },
        'GOOGL': { price: 14200, change: 0.9 },
        'MSFT.BA': { price: 16800, change: 1.2 },
        'MSFT': { price: 16800, change: 1.2 },
        'MELI.BA': { price: 62000, change: 2.1 },
        'MELI': { price: 62000, change: 2.1 },
        'PAMP.BA': { price: 3400, change: -0.5 },
        'TXAR.BA': { price: 1850, change: 0.3 },
        'ALUA.BA': { price: 980, change: 1.1 },
        'BBAR.BA': { price: 1320, change: 2.4 },
        'BMA.BA': { price: 4100, change: 1.8 }
    },
    currentUSD: 1200
};
