// =============================================
// CONFIGURACIÓN - Wealth Portfolio
// =============================================

const CONFIG = {
    // URL del Google Apps Script (Web App)
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxMqtO-yZBExfNKeFV7rDzg2M8DJruNfulOX60AB3hjOMt2mk8PI29qBu8b6zVKsHG9TQ/exec',
    
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
            date: '2024-06-15',
            quantity: 100,
            priceARS: 350000,
            exchangeRate: 1100,
            priceUSD: 318.18,
            type: 'buy'
        },
        {
            id: '2',
            userId: 'demo',
            ticker: 'YPF.BA',
            tickerName: 'YPF S.A.',
            date: '2024-07-20',
            quantity: 50,
            priceARS: 260000,
            exchangeRate: 1150,
            priceUSD: 226.09,
            type: 'buy'
        },
        {
            id: '3',
            userId: 'demo',
            ticker: 'MELI.BA',
            tickerName: 'MercadoLibre',
            date: '2024-08-10',
            quantity: 10,
            priceARS: 180000,
            exchangeRate: 1200,
            priceUSD: 150.00,
            type: 'buy'
        },
        {
            id: '4',
            userId: 'demo',
            ticker: 'SPY.BA',
            tickerName: 'S&P 500 ETF',
            date: '2024-09-05',
            quantity: 20,
            priceARS: 440000,
            exchangeRate: 1250,
            priceUSD: 352.00,
            type: 'buy'
        },
        {
            id: '5',
            userId: 'demo',
            ticker: 'QQQ.BA',
            tickerName: 'Nasdaq 100 ETF',
            date: '2024-10-12',
            quantity: 15,
            priceARS: 700000,
            exchangeRate: 1300,
            priceUSD: 538.46,
            type: 'buy'
        }
    ],
    sales: [
        {
            id: 's1',
            userId: 'demo',
            ticker: 'GGAL.BA',
            tickerName: 'Grupo Galicia',
            date: '2024-11-20',
            quantity: 30,
            priceARS: 135000,
            exchangeRate: 1350,
            priceUSD: 100.00,
            profitARS: 30000,
            profitUSD: 22.22,
            type: 'sell'
        }
    ],
    favoriteStocks: ['MELI.BA', 'AAPL.BA', 'MSFT.BA'],
    // Precios de respaldo si las APIs fallan
    currentPrices: {
        'GGAL.BA': { price: 4500, change: 2.5 },
        'GGAL': { price: 4500, change: 2.5 },
        'YPF.BA': { price: 5800, change: -0.8 },
        'YPF': { price: 5800, change: -0.8 },
        'MELI.BA': { price: 22000, change: 1.2 },
        'MELI': { price: 22000, change: 1.2 },
        'SPY.BA': { price: 24500, change: 0.5 },
        'SPY': { price: 24500, change: 0.5 },
        'QQQ.BA': { price: 52000, change: 0.8 },
        'QQQ': { price: 52000, change: 0.8 },
        'AAPL.BA': { price: 23000, change: 1.1 },
        'AAPL': { price: 23000, change: 1.1 },
        'GOOGL.BA': { price: 19000, change: 0.9 },
        'GOOGL': { price: 19000, change: 0.9 },
        'MSFT.BA': { price: 21000, change: 1.5 },
        'MSFT': { price: 21000, change: 1.5 },
        'AMZN.BA': { price: 24000, change: 0.7 },
        'TSLA.BA': { price: 28000, change: -1.2 },
        'META.BA': { price: 62000, change: 2.1 },
        'NVDA.BA': { price: 15000, change: 3.2 },
        'PAMP.BA': { price: 3400, change: -0.5 },
        'TXAR.BA': { price: 1850, change: 0.3 },
        'ALUA.BA': { price: 980, change: 1.1 },
        'BBAR.BA': { price: 1800, change: 2.4 },
        'BMA.BA': { price: 5500, change: 1.8 }
    }
};
