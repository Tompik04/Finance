// =============================================
// CONFIGURACIÓN - Wealth Portfolio
// =============================================

// IMPORTANTE: Reemplaza esta URL con la URL de tu Google Apps Script
// Después de publicar tu script, copia la URL aquí
const CONFIG = {
    // URL del Google Apps Script (Web App)
    // Ejemplo: 'https://script.google.com/macros/s/AKfycbx.../exec'
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwUYBPeo1VDgV-rk4VKy5W60rozGWX56MqU7aGCCMfuezPhAyjWW5tHWXFzQdu2rq_eew/exec',
    
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
        { email: 'demo@demo.com', password: 'demo123', name: 'Usuario Demo' }
    ],
    transactions: [
        {
            id: '1',
            userId: 'demo@demo.com',
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
    // Precios simulados actuales
    currentPrices: {
        'GGAL.BA': { price: 1800, change: 2.5 },
        'YPF.BA': { price: 4500, change: -1.2 },
        'AAPL.BA': { price: 15000, change: 0.8 },
        'GOOGL.BA': { price: 12000, change: 1.5 },
        'MSFT.BA': { price: 14000, change: 0.3 },
        'MELI.BA': { price: 50000, change: 3.2 }
    },
    currentUSD: 1150
};
