// =============================================
// WEALTH PORTFOLIO - JavaScript Principal
// =============================================

// Fecha de corte para cambio de dólar (14 de abril de 2025)
const DOLAR_SWITCH_DATE = '2025-04-14';

// Acciones principales fijas del mercado
const MAIN_MARKET_SYMBOLS = ['GGAL', 'YPF', 'SPY', 'QQQ', 'MELI'];

// Estado global de la aplicación
const AppState = {
    user: null,
    transactions: [],  // Compras
    sales: [],         // Ventas
    holdings: {},
    currentPrices: {},
    currentUSD: {
        blue: 1500,
        oficial: 1100
    },
    favoriteStocks: [], // Acciones favoritas del usuario
    calendarYear: new Date().getFullYear(),
    charts: {
        pie: null,
        bar: null
    },
    pricesLoaded: false
};

// APIs para precios
const PRICE_APIS = {
    proxies: [
        // Proxy 1: corsproxy.org (más confiable)
        (symbol) => `https://corsproxy.org/?${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`)}`,
        // Proxy 2: api.codetabs.com
        (symbol) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`)}`,
        // Proxy 3: thingproxy
        (symbol) => `https://thingproxy.freeboard.io/fetch/https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
    ],
    dolar: 'https://api.bluelytics.com.ar/v2/latest'
};

// =============================================
// INICIALIZACIÓN
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    loadTheme();
    setupEventListeners();
    
    // Configurar fecha máxima en los inputs
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('buy-date').max = today;
    document.getElementById('sell-date').max = today;
    
    // Inicializar Tom Select
    initStockSelectors();
    
    // Verificar sesión guardada
    const savedUser = localStorage.getItem('wealthPortfolioUser');
    if (savedUser) {
        AppState.user = JSON.parse(savedUser);
        await loginSuccess();
    }
    
    // Ocultar pantalla de carga
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
    }, 800);
}

function setupEventListeners() {
    // Toggle tema
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Tabs de autenticación
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
    });
    
    // Formularios de autenticación
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Tabs Compra/Venta
    document.querySelectorAll('.transaction-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTransactionTab(tab.dataset.type));
    });
    
    // Formulario de compra
    document.getElementById('buy-form').addEventListener('submit', handleBuy);
    document.getElementById('buy-quantity').addEventListener('input', calculateBuyTotal);
    document.getElementById('buy-price').addEventListener('input', calculateBuyTotal);
    document.getElementById('buy-exchange-rate').addEventListener('input', calculateBuyTotal);
    document.getElementById('buy-date').addEventListener('change', (e) => handleDateChange(e, 'buy'));
    document.querySelectorAll('input[name="buy-dolar-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => handleDolarTypeChange(e, 'buy'));
    });
    
    // Formulario de venta
    document.getElementById('sell-form').addEventListener('submit', handleSell);
    document.getElementById('sell-stock-select').addEventListener('change', handleSellStockChange);
    document.getElementById('sell-quantity').addEventListener('input', calculateSellTotal);
    document.getElementById('sell-price').addEventListener('input', calculateSellTotal);
    document.getElementById('sell-exchange-rate').addEventListener('input', calculateSellTotal);
    document.getElementById('sell-date').addEventListener('change', (e) => handleDateChange(e, 'sell'));
    document.querySelectorAll('input[name="sell-dolar-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => handleDolarTypeChange(e, 'sell'));
    });
    
    // Navegación del calendario
    document.getElementById('prev-year').addEventListener('click', () => changeCalendarYear(-1));
    document.getElementById('next-year').addEventListener('click', () => changeCalendarYear(1));
    
    // Toggle historial
    document.getElementById('toggle-history').addEventListener('click', toggleTransactionsHistory);
    
    // Favoritas del mercado
    document.getElementById('edit-favorites-btn').addEventListener('click', toggleFavoritesSelector);
    document.getElementById('save-favorites-btn').addEventListener('click', saveFavoriteStocks);
}

// =============================================
// SELECTORES DE ACCIONES
// =============================================

function initStockSelectors() {
    // Selector de compra
    const buySelect = document.getElementById('buy-stock-select');
    if (buySelect && !buySelect.tomselect) {
        new TomSelect('#buy-stock-select', {
            placeholder: 'Buscar acción...',
            searchField: ['text', 'value'],
            maxOptions: 200,
            openOnFocus: true
        });
    }
    
    // Selector de favoritas
    const favSelect = document.getElementById('favorite-stocks-select');
    if (favSelect && !favSelect.tomselect) {
        new TomSelect('#favorite-stocks-select', {
            placeholder: 'Seleccionar acciones...',
            maxItems: 5,
            plugins: ['remove_button']
        });
    }
}

// =============================================
// TABS COMPRA/VENTA
// =============================================

function switchTransactionTab(type) {
    document.querySelectorAll('.transaction-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.transaction-tab[data-type="${type}"]`).classList.add('active');
    
    document.getElementById('buy-form').classList.toggle('hidden', type !== 'buy');
    document.getElementById('sell-form').classList.toggle('hidden', type !== 'sell');
    
    // Si es venta, actualizar el selector con las tenencias actuales
    if (type === 'sell') {
        updateSellStockSelector();
    }
}

function updateSellStockSelector() {
    const select = document.getElementById('sell-stock-select');
    select.innerHTML = '<option value="">Seleccionar de mis tenencias...</option>';
    
    Object.values(AppState.holdings).forEach(holding => {
        if (holding.quantity > 0) {
            const option = document.createElement('option');
            option.value = holding.ticker;
            option.textContent = `${holding.ticker.replace('.BA', '')} - ${holding.tickerName || ''} (${holding.quantity.toFixed(2)} disponibles)`;
            option.dataset.available = holding.quantity;
            option.dataset.avgPrice = holding.avgPricePerShare;
            select.appendChild(option);
        }
    });
}

function handleSellStockChange(e) {
    const select = e.target;
    const selectedOption = select.options[select.selectedIndex];
    const availableQty = document.getElementById('sell-available-qty');
    
    if (selectedOption && selectedOption.value) {
        const available = parseFloat(selectedOption.dataset.available) || 0;
        const avgPrice = parseFloat(selectedOption.dataset.avgPrice) || 0;
        availableQty.innerHTML = `Disponibles: <strong>${available.toFixed(2)}</strong> | Precio promedio compra: <strong>${formatCurrencyWithLabel(avgPrice, 'ARS')}</strong>`;
        
        // Establecer máximo en el input de cantidad
        document.getElementById('sell-quantity').max = available;
    } else {
        availableQty.textContent = '';
    }
}

// =============================================
// TEMA CLARO/OSCURO
// =============================================

function loadTheme() {
    const savedTheme = localStorage.getItem('wealthPortfolioTheme') || 'light';
    document.body.className = `theme-${savedTheme}`;
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.body.className = `theme-${newTheme}`;
    localStorage.setItem('wealthPortfolioTheme', newTheme);
    updateThemeIcon(newTheme);
    
    if (AppState.user) updateCharts();
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#theme-toggle i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// =============================================
// AUTENTICACIÓN
// =============================================

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
    document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
    document.getElementById('auth-error').classList.add('hidden');
}

async function handleLogin(e) {
    e.preventDefault();
    
    const user = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-password').value;
    
    showAuthError('');
    
    try {
        if (CONFIG.DEMO_MODE || CONFIG.GOOGLE_SCRIPT_URL === 'TU_URL_DEL_SCRIPT_AQUI') {
            const foundUser = DEMO_DATA.users.find(u => u.user === user && u.password === password);
            if (foundUser) {
                AppState.user = { user: foundUser.user, name: foundUser.user };
                localStorage.setItem('wealthPortfolioUser', JSON.stringify(AppState.user));
                await loginSuccess();
            } else {
                showAuthError('Usuario o contraseña incorrectos');
            }
        } else {
            const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=login&user=${encodeURIComponent(user)}&password=${encodeURIComponent(password)}`);
            const data = await response.json();
            
            if (data.success) {
                AppState.user = { user: data.user, name: data.user };
                localStorage.setItem('wealthPortfolioUser', JSON.stringify(AppState.user));
                await loginSuccess();
            } else {
                showAuthError(data.message || 'Error al iniciar sesión');
            }
        }
    } catch (error) {
        console.error('Error de login:', error);
        showAuthError('Error de conexión. Intenta de nuevo.');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const user = document.getElementById('register-user').value.trim();
    const password = document.getElementById('register-password').value;
    
    showAuthError('');
    
    try {
        if (CONFIG.DEMO_MODE || CONFIG.GOOGLE_SCRIPT_URL === 'TU_URL_DEL_SCRIPT_AQUI') {
            if (DEMO_DATA.users.find(u => u.user === user)) {
                showAuthError('Este usuario ya existe');
                return;
            }
            DEMO_DATA.users.push({ user, password });
            AppState.user = { user, name: user };
            localStorage.setItem('wealthPortfolioUser', JSON.stringify(AppState.user));
            await loginSuccess();
            showToast('¡Cuenta creada exitosamente!', 'success');
        } else {
            const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=register&user=${encodeURIComponent(user)}&password=${encodeURIComponent(password)}`);
            const data = await response.json();
            
            if (data.success) {
                AppState.user = { user, name: user };
                localStorage.setItem('wealthPortfolioUser', JSON.stringify(AppState.user));
                await loginSuccess();
                showToast('¡Cuenta creada exitosamente!', 'success');
            } else {
                showAuthError(data.message || 'Error al registrarse');
            }
        }
    } catch (error) {
        console.error('Error de registro:', error);
        showAuthError('Error de conexión. Intenta de nuevo.');
    }
}

function handleLogout() {
    AppState.user = null;
    AppState.transactions = [];
    AppState.sales = [];
    AppState.holdings = {};
    localStorage.removeItem('wealthPortfolioUser');
    
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('main-content').classList.add('hidden');
    document.getElementById('user-info').classList.add('hidden');
    
    document.getElementById('login-form').reset();
    document.getElementById('register-form').reset();
    
    showToast('Sesión cerrada', 'info');
}

async function loginSuccess() {
    document.getElementById('auth-modal').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    document.getElementById('user-info').classList.remove('hidden');
    document.getElementById('user-name').textContent = AppState.user.user || AppState.user.name;
    
    setTimeout(() => initStockSelectors(), 100);
    
    await loadUserData();
    updateUI();
    startPriceUpdates();
}

function showAuthError(message) {
    const errorEl = document.getElementById('auth-error');
    if (message) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    } else {
        errorEl.classList.add('hidden');
    }
}

// =============================================
// CARGAR DATOS DEL USUARIO
// =============================================

async function loadUserData() {
    try {
        if (CONFIG.DEMO_MODE || CONFIG.GOOGLE_SCRIPT_URL === 'TU_URL_DEL_SCRIPT_AQUI') {
            AppState.transactions = DEMO_DATA.transactions.filter(t => t.userId === AppState.user.user);
            AppState.sales = DEMO_DATA.sales ? DEMO_DATA.sales.filter(s => s.userId === AppState.user.user) : [];
            AppState.favoriteStocks = DEMO_DATA.favoriteStocks || [];
        } else {
            // Cargar transacciones (compras)
            const transResponse = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=getTransactions&user=${encodeURIComponent(AppState.user.user)}`);
            const transData = await transResponse.json();
            if (transData.success) {
                AppState.transactions = transData.transactions || [];
            }
            
            // Cargar ventas
            const salesResponse = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=getSales&user=${encodeURIComponent(AppState.user.user)}`);
            const salesData = await salesResponse.json();
            if (salesData.success) {
                AppState.sales = salesData.sales || [];
            }
            
            // Cargar favoritas
            const favResponse = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=getFavorites&user=${encodeURIComponent(AppState.user.user)}`);
            const favData = await favResponse.json();
            if (favData.success) {
                AppState.favoriteStocks = favData.favorites || [];
            }
        }
        
        calculateHoldings();
        await fetchRealPrices();
        await fetchUSDRate();
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        showToast('Error al cargar datos', 'error');
    }
}

// =============================================
// OBTENER PRECIOS
// =============================================

async function fetchRealPrices() {
    const uniqueTickers = new Set();
    
    // Tickers de holdings
    Object.keys(AppState.holdings).forEach(ticker => uniqueTickers.add(ticker));
    
    // Tickers del mercado principal
    MAIN_MARKET_SYMBOLS.forEach(symbol => {
        uniqueTickers.add(symbol);
        uniqueTickers.add(symbol + '.BA');
    });
    
    // Tickers favoritos
    AppState.favoriteStocks.forEach(symbol => {
        uniqueTickers.add(symbol);
    });
    
    const promises = [];
    for (const ticker of uniqueTickers) {
        promises.push(fetchStockPrice(ticker));
    }
    
    await Promise.allSettled(promises);
    AppState.pricesLoaded = true;
    
    const updateTimeEl = document.getElementById('market-update-time');
    if (updateTimeEl) {
        updateTimeEl.textContent = `Última actualización: ${new Date().toLocaleTimeString('es-AR')}`;
    }
}

async function fetchStockPrice(ticker) {
    let yahooSymbol = ticker;
    
    for (const proxyFn of PRICE_APIS.proxies) {
        try {
            const url = proxyFn(yahooSymbol);
            
            // Timeout de 8 segundos usando AbortController
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch(url, { 
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) continue;
            
            const data = await response.json();
            
            if (data.chart && data.chart.result && data.chart.result[0]) {
                const meta = data.chart.result[0].meta;
                const currentPrice = meta.regularMarketPrice || meta.previousClose;
                const previousClose = meta.previousClose || meta.chartPreviousClose;
                const change = previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : 0;
                
                AppState.currentPrices[ticker] = {
                    price: currentPrice,
                    change: change,
                    previousClose: previousClose,
                    currency: meta.currency || 'ARS'
                };
                
                if (ticker.endsWith('.BA')) {
                    AppState.currentPrices[ticker.replace('.BA', '')] = AppState.currentPrices[ticker];
                }
                
                return true;
            }
        } catch (error) {
            // Silenciosamente continuar al siguiente proxy
            continue;
        }
    }
    
    // Fallback a precios demo
    if (DEMO_DATA.currentPrices[ticker]) {
        AppState.currentPrices[ticker] = DEMO_DATA.currentPrices[ticker];
    }
    return false;
}

async function fetchUSDRate() {
    try {
        const response = await fetch(PRICE_APIS.dolar);
        const data = await response.json();
        
        if (data) {
            if (data.blue && data.blue.value_sell) {
                AppState.currentUSD.blue = data.blue.value_sell;
            }
            if (data.oficial && data.oficial.value_sell) {
                AppState.currentUSD.oficial = data.oficial.value_sell;
            }
        }
    } catch (error) {
        console.warn('Error fetching USD rate:', error);
    }
}

async function fetchHistoricalUSDRate(dateStr) {
    try {
        const response = await fetch(`https://api.bluelytics.com.ar/v2/historical?day=${dateStr}`);
        const data = await response.json();
        
        return {
            blue: data?.blue?.value_sell || null,
            oficial: data?.oficial?.value_sell || null
        };
    } catch (error) {
        return null;
    }
}

function getDolarTypeForDate(dateStr) {
    if (!dateStr) return 'oficial';
    return dateStr >= DOLAR_SWITCH_DATE ? 'oficial' : 'blue';
}

function startPriceUpdates() {
    setInterval(async () => {
        await fetchRealPrices();
        await fetchUSDRate();
        updateUI();
    }, 5 * 60 * 1000);
}

// =============================================
// MANEJO DE FECHAS Y DÓLAR
// =============================================

async function handleDateChange(e, formType) {
    const dateValue = e.target.value;
    const prefix = formType;
    
    const exchangeRateInput = document.getElementById(`${prefix}-exchange-rate`);
    const dolarTypeContainer = document.getElementById(`${prefix}-dolar-type-container`);
    const dolarBlueLabel = document.getElementById(`${prefix}-dolar-blue-value`);
    const dolarOficialLabel = document.getElementById(`${prefix}-dolar-oficial-value`);
    
    if (!dateValue) return;
    
    exchangeRateInput.placeholder = 'Buscando cotización...';
    exchangeRateInput.disabled = true;
    
    const today = new Date().toISOString().split('T')[0];
    let rates = dateValue === today ? AppState.currentUSD : await fetchHistoricalUSDRate(dateValue);
    
    exchangeRateInput.disabled = false;
    
    if (rates && (rates.blue || rates.oficial)) {
        dolarTypeContainer.classList.remove('hidden');
        
        if (dolarBlueLabel && rates.blue) dolarBlueLabel.textContent = `$${Math.round(rates.blue)}`;
        if (dolarOficialLabel && rates.oficial) dolarOficialLabel.textContent = `$${Math.round(rates.oficial)}`;
        
        exchangeRateInput.dataset.blueRate = rates.blue || '';
        exchangeRateInput.dataset.oficialRate = rates.oficial || '';
        
        const recommendedType = getDolarTypeForDate(dateValue);
        const radio = document.querySelector(`input[name="${prefix}-dolar-type"][value="${recommendedType}"]`);
        if (radio) radio.checked = true;
        
        const selectedRate = recommendedType === 'blue' ? rates.blue : rates.oficial;
        if (selectedRate) {
            exchangeRateInput.value = Math.round(selectedRate);
            if (formType === 'buy') calculateBuyTotal();
            else calculateSellTotal();
        }
    } else {
        dolarTypeContainer.classList.add('hidden');
        exchangeRateInput.placeholder = 'Ingresá manualmente';
    }
}

function handleDolarTypeChange(e, formType) {
    const dolarType = e.target.value;
    const exchangeRateInput = document.getElementById(`${formType}-exchange-rate`);
    
    const rate = dolarType === 'blue' ? exchangeRateInput.dataset.blueRate : exchangeRateInput.dataset.oficialRate;
    
    if (rate) {
        exchangeRateInput.value = Math.round(parseFloat(rate));
        if (formType === 'buy') calculateBuyTotal();
        else calculateSellTotal();
    }
}

// =============================================
// CÁLCULOS DE HOLDINGS
// =============================================

function calculateHoldings() {
    AppState.holdings = {};
    
    // Procesar compras
    AppState.transactions.forEach(t => {
        if (!AppState.holdings[t.ticker]) {
            AppState.holdings[t.ticker] = {
                ticker: t.ticker,
                tickerName: t.tickerName,
                quantity: 0,
                totalInvestedARS: 0,
                totalInvestedUSD: 0,
                transactions: [],
                sales: []
            };
        }
        
        AppState.holdings[t.ticker].quantity += t.quantity;
        AppState.holdings[t.ticker].totalInvestedARS += t.priceARS;
        AppState.holdings[t.ticker].totalInvestedUSD += t.priceUSD;
        AppState.holdings[t.ticker].transactions.push(t);
    });
    
    // Procesar ventas (restar del holding)
    AppState.sales.forEach(s => {
        if (AppState.holdings[s.ticker]) {
            AppState.holdings[s.ticker].quantity -= s.quantity;
            // Restar proporcionalmente la inversión
            const holding = AppState.holdings[s.ticker];
            const avgPriceARS = holding.totalInvestedARS / (holding.quantity + s.quantity);
            const avgPriceUSD = holding.totalInvestedUSD / (holding.quantity + s.quantity);
            holding.totalInvestedARS -= avgPriceARS * s.quantity;
            holding.totalInvestedUSD -= avgPriceUSD * s.quantity;
            holding.sales.push(s);
        }
    });
    
    // Calcular precio promedio
    Object.values(AppState.holdings).forEach(h => {
        if (h.quantity > 0) {
            h.avgPricePerShare = h.totalInvestedARS / h.quantity;
            h.avgExchangeRate = h.totalInvestedARS / h.totalInvestedUSD;
        }
    });
}

// =============================================
// FORMULARIO DE COMPRA
// =============================================

function calculateBuyTotal() {
    const quantity = parseFloat(document.getElementById('buy-quantity').value) || 0;
    const price = parseFloat(document.getElementById('buy-price').value) || 0;
    const exchangeRate = parseFloat(document.getElementById('buy-exchange-rate').value) || 1;
    
    const totalARS = quantity * price;
    const totalUSD = exchangeRate > 0 ? totalARS / exchangeRate : 0;
    
    document.getElementById('buy-total-ars').innerHTML = formatCurrencyWithLabel(totalARS, 'ARS');
    document.getElementById('buy-total-usd').innerHTML = `≈ ${formatCurrencyWithLabel(totalUSD, 'USD')}`;
}

async function handleBuy(e) {
    e.preventDefault();
    
    const stockSelect = document.getElementById('buy-stock-select');
    const ticker = stockSelect.value;
    
    if (!ticker) {
        showToast('Seleccioná una acción', 'error');
        return;
    }
    
    const selectedOption = stockSelect.options[stockSelect.selectedIndex];
    const tickerName = selectedOption ? selectedOption.text.split(' - ')[1] : '';
    const date = document.getElementById('buy-date').value;
    const quantity = parseFloat(document.getElementById('buy-quantity').value);
    const pricePerShare = parseFloat(document.getElementById('buy-price').value);
    const priceARS = quantity * pricePerShare;
    const exchangeRate = parseFloat(document.getElementById('buy-exchange-rate').value);
    const priceUSD = priceARS / exchangeRate;
    
    const transaction = {
        id: Date.now().toString(),
        oderId: AppState.user.user,
        ticker,
        tickerName,
        date,
        quantity,
        priceARS,
        exchangeRate,
        priceUSD,
        type: 'buy'
    };
    
    try {
        if (CONFIG.DEMO_MODE || CONFIG.GOOGLE_SCRIPT_URL === 'TU_URL_DEL_SCRIPT_AQUI') {
            DEMO_DATA.transactions.push(transaction);
            AppState.transactions.push(transaction);
        } else {
            const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=addTransaction`, {
                method: 'POST',
                body: JSON.stringify(transaction)
            });
            const data = await response.json();
            if (data.success) {
                AppState.transactions.push(transaction);
            } else {
                throw new Error(data.message);
            }
        }
        
        calculateHoldings();
        updateUI();
        
        // Limpiar formulario
        document.getElementById('buy-form').reset();
        document.getElementById('buy-total-ars').innerHTML = formatCurrencyWithLabel(0, 'ARS');
        document.getElementById('buy-total-usd').innerHTML = `≈ ${formatCurrencyWithLabel(0, 'USD')}`;
        document.getElementById('buy-dolar-type-container').classList.add('hidden');
        
        if (stockSelect.tomselect) stockSelect.tomselect.clear();
        
        showToast('Compra registrada exitosamente', 'success');
        
    } catch (error) {
        console.error('Error guardando compra:', error);
        showToast('Error al guardar la compra', 'error');
    }
}

// =============================================
// FORMULARIO DE VENTA
// =============================================

function calculateSellTotal() {
    const quantity = parseFloat(document.getElementById('sell-quantity').value) || 0;
    const price = parseFloat(document.getElementById('sell-price').value) || 0;
    const exchangeRate = parseFloat(document.getElementById('sell-exchange-rate').value) || 1;
    
    const totalARS = quantity * price;
    
    // Calcular ganancia/pérdida
    const stockSelect = document.getElementById('sell-stock-select');
    const selectedOption = stockSelect.options[stockSelect.selectedIndex];
    let profitARS = 0;
    
    if (selectedOption && selectedOption.value) {
        const avgBuyPrice = parseFloat(selectedOption.dataset.avgPrice) || 0;
        const costARS = quantity * avgBuyPrice;
        profitARS = totalARS - costARS;
    }
    
    document.getElementById('sell-total-ars').innerHTML = formatCurrencyWithLabel(totalARS, 'ARS');
    
    const profitEl = document.getElementById('sell-profit');
    profitEl.innerHTML = `G/P: ${profitARS >= 0 ? '+' : ''}${formatCurrencyWithLabel(profitARS, 'ARS')}`;
    profitEl.className = `calculated-profit ${profitARS >= 0 ? 'profit' : 'loss'}`;
}

async function handleSell(e) {
    e.preventDefault();
    
    const stockSelect = document.getElementById('sell-stock-select');
    const ticker = stockSelect.value;
    
    if (!ticker) {
        showToast('Seleccioná una acción para vender', 'error');
        return;
    }
    
    const quantity = parseFloat(document.getElementById('sell-quantity').value);
    const holding = AppState.holdings[ticker];
    
    if (!holding || quantity > holding.quantity) {
        showToast('No tenés suficientes acciones para vender', 'error');
        return;
    }
    
    const date = document.getElementById('sell-date').value;
    const pricePerShare = parseFloat(document.getElementById('sell-price').value);
    const priceARS = quantity * pricePerShare;
    const exchangeRate = parseFloat(document.getElementById('sell-exchange-rate').value);
    const priceUSD = priceARS / exchangeRate;
    
    // Calcular ganancia/pérdida
    const avgBuyPrice = holding.avgPricePerShare;
    const costARS = quantity * avgBuyPrice;
    const profitARS = priceARS - costARS;
    const profitUSD = profitARS / exchangeRate;
    
    const sale = {
        id: Date.now().toString(),
        userId: AppState.user.user,
        ticker,
        tickerName: holding.tickerName,
        date,
        quantity,
        priceARS,
        exchangeRate,
        priceUSD,
        profitARS,
        profitUSD,
        type: 'sell'
    };
    
    try {
        if (CONFIG.DEMO_MODE || CONFIG.GOOGLE_SCRIPT_URL === 'TU_URL_DEL_SCRIPT_AQUI') {
            if (!DEMO_DATA.sales) DEMO_DATA.sales = [];
            DEMO_DATA.sales.push(sale);
            AppState.sales.push(sale);
        } else {
            const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=addSale`, {
                method: 'POST',
                body: JSON.stringify(sale)
            });
            const data = await response.json();
            if (data.success) {
                AppState.sales.push(sale);
            } else {
                throw new Error(data.message);
            }
        }
        
        calculateHoldings();
        updateUI();
        
        // Limpiar formulario
        document.getElementById('sell-form').reset();
        document.getElementById('sell-total-ars').innerHTML = formatCurrencyWithLabel(0, 'ARS');
        document.getElementById('sell-profit').innerHTML = `G/P: ${formatCurrencyWithLabel(0, 'ARS')}`;
        document.getElementById('sell-available-qty').textContent = '';
        document.getElementById('sell-dolar-type-container').classList.add('hidden');
        
        updateSellStockSelector();
        
        const profitText = profitARS >= 0 ? `Ganancia: +${formatNumber(profitARS)} ARS` : `Pérdida: ${formatNumber(profitARS)} ARS`;
        showToast(`Venta registrada. ${profitText}`, profitARS >= 0 ? 'success' : 'info');
        
    } catch (error) {
        console.error('Error guardando venta:', error);
        showToast('Error al guardar la venta', 'error');
    }
}

// =============================================
// ELIMINAR TRANSACCIONES
// =============================================

async function deleteTransaction(transactionId, type = 'buy') {
    if (!confirm('¿Estás seguro de eliminar esta operación?')) return;
    
    try {
        if (CONFIG.DEMO_MODE || CONFIG.GOOGLE_SCRIPT_URL === 'TU_URL_DEL_SCRIPT_AQUI') {
            if (type === 'buy') {
                const index = DEMO_DATA.transactions.findIndex(t => t.id === transactionId);
                if (index > -1) DEMO_DATA.transactions.splice(index, 1);
                const stateIndex = AppState.transactions.findIndex(t => t.id === transactionId);
                if (stateIndex > -1) AppState.transactions.splice(stateIndex, 1);
            } else {
                const index = DEMO_DATA.sales.findIndex(s => s.id === transactionId);
                if (index > -1) DEMO_DATA.sales.splice(index, 1);
                const stateIndex = AppState.sales.findIndex(s => s.id === transactionId);
                if (stateIndex > -1) AppState.sales.splice(stateIndex, 1);
            }
        } else {
            const action = type === 'buy' ? 'deleteTransaction' : 'deleteSale';
            const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=${action}&id=${transactionId}&user=${encodeURIComponent(AppState.user.user)}`);
            const data = await response.json();
            
            if (data.success) {
                if (type === 'buy') {
                    const index = AppState.transactions.findIndex(t => t.id === transactionId);
                    if (index > -1) AppState.transactions.splice(index, 1);
                } else {
                    const index = AppState.sales.findIndex(s => s.id === transactionId);
                    if (index > -1) AppState.sales.splice(index, 1);
                }
            } else {
                throw new Error(data.message);
            }
        }
        
        calculateHoldings();
        updateUI();
        showToast('Operación eliminada', 'success');
        
    } catch (error) {
        console.error('Error eliminando:', error);
        showToast('Error al eliminar', 'error');
    }
}

// =============================================
// FAVORITAS DEL MERCADO
// =============================================

function toggleFavoritesSelector() {
    const selector = document.getElementById('favorites-selector');
    selector.classList.toggle('hidden');
    
    // Preseleccionar las actuales
    const select = document.getElementById('favorite-stocks-select');
    if (select.tomselect) {
        select.tomselect.clear();
        AppState.favoriteStocks.forEach(stock => {
            select.tomselect.addItem(stock, true);
        });
    }
}

async function saveFavoriteStocks() {
    const select = document.getElementById('favorite-stocks-select');
    const favorites = select.tomselect ? select.tomselect.getValue() : [];
    
    if (favorites.length > 5) {
        showToast('Máximo 5 acciones favoritas', 'error');
        return;
    }
    
    try {
        if (CONFIG.DEMO_MODE || CONFIG.GOOGLE_SCRIPT_URL === 'TU_URL_DEL_SCRIPT_AQUI') {
            DEMO_DATA.favoriteStocks = favorites;
            AppState.favoriteStocks = favorites;
        } else {
            const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=saveFavorites`, {
                method: 'POST',
                body: JSON.stringify({
                    user: AppState.user.user,
                    favorites: favorites
                })
            });
            const data = await response.json();
            if (data.success) {
                AppState.favoriteStocks = favorites;
            }
        }
        
        // Obtener precios de las nuevas favoritas
        for (const stock of favorites) {
            if (!AppState.currentPrices[stock]) {
                await fetchStockPrice(stock);
            }
        }
        
        updateMarketTicker();
        document.getElementById('favorites-selector').classList.add('hidden');
        showToast('Favoritas guardadas', 'success');
        
    } catch (error) {
        console.error('Error guardando favoritas:', error);
        showToast('Error al guardar', 'error');
    }
}

// =============================================
// ACTUALIZACIÓN DE INTERFAZ
// =============================================

function updateUI() {
    updateSummary();
    updateMarketTicker();
    updateHoldingsTable();
    updateTransactionsTable();
    updateCharts();
    updateCalendar();
    updateSellStockSelector();
}

function updateSummary() {
    let totalValueARS = 0;
    let totalInvestedARS = 0;
    let totalInvestedUSD = 0;
    
    const currentUSD = AppState.currentUSD.oficial || 1100;
    
    Object.values(AppState.holdings).forEach(holding => {
        if (holding.quantity <= 0) return;
        
        const priceData = AppState.currentPrices[holding.ticker] || 
                         AppState.currentPrices[holding.ticker.replace('.BA', '')] || null;
        
        const currentPricePerShare = priceData ? priceData.price : (holding.totalInvestedARS / holding.quantity);
        
        totalValueARS += holding.quantity * currentPricePerShare;
        totalInvestedARS += holding.totalInvestedARS;
        totalInvestedUSD += holding.totalInvestedUSD;
    });
    
    const totalValueUSD = totalValueARS / currentUSD;
    const totalProfitARS = totalValueARS - totalInvestedARS;
    const totalProfitUSD = totalValueUSD - totalInvestedUSD;
    const profitPercentARS = totalInvestedARS > 0 ? (totalProfitARS / totalInvestedARS) * 100 : 0;
    const profitPercentUSD = totalInvestedUSD > 0 ? (totalProfitUSD / totalInvestedUSD) * 100 : 0;
    
    document.getElementById('total-value-ars').innerHTML = formatCurrencyWithLabel(totalValueARS, 'ARS');
    document.getElementById('total-value-usd').innerHTML = formatCurrencyWithLabel(totalValueUSD, 'USD');
    document.getElementById('total-invested').innerHTML = formatCurrencyWithLabel(totalInvestedARS, 'ARS');
    document.getElementById('total-invested-usd').innerHTML = formatCurrencyWithLabel(totalInvestedUSD, 'USD');
    
    const profitClass = totalProfitARS >= 0 ? 'profit' : 'loss';
    
    const profitEl = document.getElementById('total-profit');
    profitEl.textContent = `${totalProfitARS >= 0 ? '+' : ''}${formatNumber(totalProfitARS)}`;
    profitEl.className = `profit-value ${profitClass}`;
    
    const percentEl = document.getElementById('total-profit-percent');
    percentEl.textContent = `(${totalProfitARS >= 0 ? '+' : ''}${profitPercentARS.toFixed(2)}%)`;
    percentEl.className = `profit-percent ${profitClass}`;
    
    const arsRow = document.querySelector('.profit-ars-row');
    if (arsRow) arsRow.style.background = totalProfitARS >= 0 ? 'var(--profit-bg)' : 'var(--loss-bg)';
    
    const profitUSDClass = totalProfitUSD >= 0 ? 'profit' : 'loss';
    
    const profitUSDEl = document.getElementById('total-profit-usd');
    if (profitUSDEl) {
        profitUSDEl.textContent = `${totalProfitUSD >= 0 ? '+' : ''}${formatNumberUSD(totalProfitUSD)}`;
        profitUSDEl.className = `profit-value-usd ${profitUSDClass}`;
    }
    
    const profitUSDPercentEl = document.getElementById('total-profit-usd-percent');
    if (profitUSDPercentEl) {
        profitUSDPercentEl.textContent = `(${totalProfitUSD >= 0 ? '+' : ''}${profitPercentUSD.toFixed(2)}%)`;
        profitUSDPercentEl.className = `profit-percent-usd ${profitUSDClass}`;
    }
    
    const blueEl = document.getElementById('current-usd-blue');
    const oficialEl = document.getElementById('current-usd-oficial');
    if (blueEl) blueEl.innerHTML = formatCurrencyWithLabel(AppState.currentUSD.blue || 1200, 'ARS');
    if (oficialEl) oficialEl.innerHTML = formatCurrencyWithLabel(AppState.currentUSD.oficial || 1050, 'ARS');
}

function updateMarketTicker() {
    // Ticker principal (fijo)
    const mainTicker = document.getElementById('market-ticker-main');
    mainTicker.innerHTML = '';
    
    MAIN_MARKET_SYMBOLS.forEach(symbol => {
        const priceData = AppState.currentPrices[symbol + '.BA'] || 
                         AppState.currentPrices[symbol] || 
                         { price: 0, change: 0 };
        
        const item = document.createElement('div');
        item.className = 'ticker-item';
        
        const price = priceData.price || 0;
        const change = priceData.change || 0;
        
        item.innerHTML = `
            <span class="ticker-symbol">${symbol}</span>
            <span class="ticker-price">${price > 0 ? formatCurrencyWithLabel(price, 'ARS') : 'Cargando...'}</span>
            <span class="ticker-change ${change >= 0 ? 'positive' : 'negative'}">
                ${change !== 0 ? (change >= 0 ? '+' : '') + change.toFixed(2) + '%' : '--'}
            </span>
        `;
        mainTicker.appendChild(item);
    });
    
    // Ticker personalizado
    const customTicker = document.getElementById('market-ticker-custom');
    customTicker.innerHTML = '';
    
    if (AppState.favoriteStocks.length === 0) {
        customTicker.innerHTML = '<div class="ticker-item empty"><span>Hacé clic en ⚙️ para agregar tus favoritas</span></div>';
        return;
    }
    
    AppState.favoriteStocks.forEach(symbol => {
        const priceData = AppState.currentPrices[symbol] || { price: 0, change: 0 };
        
        const item = document.createElement('div');
        item.className = 'ticker-item';
        
        const displaySymbol = symbol.replace('.BA', '');
        const price = priceData.price || 0;
        const change = priceData.change || 0;
        
        item.innerHTML = `
            <span class="ticker-symbol">${displaySymbol}</span>
            <span class="ticker-price">${price > 0 ? formatCurrencyWithLabel(price, 'ARS') : 'Cargando...'}</span>
            <span class="ticker-change ${change >= 0 ? 'positive' : 'negative'}">
                ${change !== 0 ? (change >= 0 ? '+' : '') + change.toFixed(2) + '%' : '--'}
            </span>
        `;
        customTicker.appendChild(item);
    });
}

function updateHoldingsTable() {
    const tbody = document.getElementById('holdings-body');
    const noHoldings = document.getElementById('no-holdings');
    const holdings = Object.values(AppState.holdings).filter(h => h.quantity > 0);
    
    const currentUSD = AppState.currentUSD.oficial || 1100;
    
    if (holdings.length === 0) {
        tbody.innerHTML = '';
        noHoldings.classList.remove('hidden');
        return;
    }
    
    noHoldings.classList.add('hidden');
    tbody.innerHTML = '';
    
    holdings.forEach(holding => {
        const priceData = AppState.currentPrices[holding.ticker] || 
                         AppState.currentPrices[holding.ticker.replace('.BA', '')] || null;
        
        const avgPricePerShare = holding.totalInvestedARS / holding.quantity;
        const currentPricePerShare = priceData ? priceData.price : avgPricePerShare;
        const currentValueARS = holding.quantity * currentPricePerShare;
        const profitARS = currentValueARS - holding.totalInvestedARS;
        const profitUSD = profitARS / currentUSD;
        const profitPercent = holding.totalInvestedARS > 0 ? (profitARS / holding.totalInvestedARS) * 100 : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong>${holding.ticker.replace('.BA', '')}</strong>
                <small>${holding.tickerName || ''}</small>
            </td>
            <td>${holding.quantity.toFixed(2)}</td>
            <td>${formatCurrencyWithLabel(avgPricePerShare, 'ARS')}</td>
            <td>
                ${formatCurrencyWithLabel(currentPricePerShare, 'ARS')}
                ${priceData ? '' : '<small class="no-price">(sin cotización)</small>'}
            </td>
            <td class="${profitARS >= 0 ? 'text-profit' : 'text-loss'}">
                ${profitARS >= 0 ? '+' : ''}${formatCurrencyWithLabel(profitARS, 'ARS')}
            </td>
            <td class="${profitUSD >= 0 ? 'text-profit' : 'text-loss'}">
                ${profitUSD >= 0 ? '+' : ''}${formatCurrencyWithLabel(profitUSD, 'USD')}
            </td>
            <td class="${profitPercent >= 0 ? 'text-profit' : 'text-loss'}">
                ${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%
            </td>
            <td>
                <button class="btn-icon-small" onclick="showHoldingDetail('${holding.ticker}')" title="Ver detalle">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateTransactionsTable() {
    const tbody = document.getElementById('transactions-body');
    tbody.innerHTML = '';
    
    // Combinar compras y ventas
    const allOperations = [
        ...AppState.transactions.map(t => ({ ...t, type: 'buy' })),
        ...AppState.sales.map(s => ({ ...s, type: 'sell' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    allOperations.forEach(op => {
        const row = document.createElement('tr');
        const isSell = op.type === 'sell';
        
        row.innerHTML = `
            <td>${formatDate(op.date)}</td>
            <td>
                <span class="operation-type ${isSell ? 'sell' : 'buy'}">
                    ${isSell ? 'VENTA' : 'COMPRA'}
                </span>
            </td>
            <td>
                <strong>${op.ticker.replace('.BA', '')}</strong>
                <small>${op.tickerName || ''}</small>
            </td>
            <td>${op.quantity.toFixed(2)}</td>
            <td>${formatCurrencyWithLabel(op.priceARS, 'ARS')}</td>
            <td>${formatCurrencyWithLabel(op.exchangeRate, 'ARS')}</td>
            <td class="${isSell ? (op.profitARS >= 0 ? 'text-profit' : 'text-loss') : ''}">
                ${isSell ? (op.profitARS >= 0 ? '+' : '') + formatNumber(op.profitARS) : '-'}
            </td>
            <td>
                <button class="btn-icon-small btn-danger-small" onclick="deleteTransaction('${op.id}', '${op.type}')" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// =============================================
// GRÁFICOS
// =============================================

function updateCharts() {
    updatePieChart();
    updateBarChart();
}

function updatePieChart() {
    const ctx = document.getElementById('portfolio-pie-chart').getContext('2d');
    const holdings = Object.values(AppState.holdings).filter(h => h.quantity > 0);
    
    if (AppState.charts.pie) AppState.charts.pie.destroy();
    
    if (holdings.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }
    
    const data = holdings.map(h => {
        const priceData = AppState.currentPrices[h.ticker] || AppState.currentPrices[h.ticker.replace('.BA', '')] || null;
        const pricePerShare = priceData ? priceData.price : (h.totalInvestedARS / h.quantity);
        return h.quantity * pricePerShare;
    });
    
    const labels = holdings.map(h => h.ticker.replace('.BA', ''));
    
    const colors = ['#C9A962', '#4CAF50', '#2196F3', '#FF5722', '#9C27B0', '#00BCD4', '#E91E63', '#FF9800', '#607D8B', '#8BC34A'];
    
    AppState.charts.pie = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, holdings.length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-primary'),
                        padding: 10,
                        boxWidth: 12
                    }
                }
            }
        }
    });
}

function updateBarChart() {
    const ctx = document.getElementById('performance-bar-chart').getContext('2d');
    const holdings = Object.values(AppState.holdings).filter(h => h.quantity > 0);
    
    if (AppState.charts.bar) AppState.charts.bar.destroy();
    
    if (holdings.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }
    
    const data = holdings.map(h => {
        const priceData = AppState.currentPrices[h.ticker] || AppState.currentPrices[h.ticker.replace('.BA', '')] || null;
        const pricePerShare = priceData ? priceData.price : (h.totalInvestedARS / h.quantity);
        const currentValue = h.quantity * pricePerShare;
        const profit = currentValue - h.totalInvestedARS;
        return h.totalInvestedARS > 0 ? (profit / h.totalInvestedARS) * 100 : 0;
    });
    
    const labels = holdings.map(h => h.ticker.replace('.BA', ''));
    const colors = data.map(d => d >= 0 ? 'var(--profit-color)' : 'var(--loss-color)');
    
    AppState.charts.bar = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Rendimiento %',
                data: data,
                backgroundColor: colors,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    ticks: {
                        callback: value => value + '%',
                        color: getComputedStyle(document.body).getPropertyValue('--text-secondary')
                    },
                    grid: { color: getComputedStyle(document.body).getPropertyValue('--border-color') }
                },
                x: {
                    ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-secondary') },
                    grid: { display: false }
                }
            }
        }
    });
}

// =============================================
// CALENDARIO (Verde=Compra, Rojo=Venta)
// =============================================

function updateCalendar() {
    const grid = document.getElementById('calendar-grid');
    const yearDisplay = document.getElementById('calendar-year');
    const year = AppState.calendarYear;
    
    yearDisplay.textContent = year;
    grid.innerHTML = '';
    
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    // Agrupar por fecha
    const buysByDate = {};
    const sellsByDate = {};
    
    AppState.transactions.forEach(t => {
        let dateKey = normalizeDate(t.date);
        if (!buysByDate[dateKey]) buysByDate[dateKey] = [];
        buysByDate[dateKey].push(t);
    });
    
    AppState.sales.forEach(s => {
        let dateKey = normalizeDate(s.date);
        if (!sellsByDate[dateKey]) sellsByDate[dateKey] = [];
        sellsByDate[dateKey].push(s);
    });
    
    // Calcular máximos
    let maxBuy = 0;
    Object.values(buysByDate).forEach(arr => {
        const total = arr.reduce((sum, t) => sum + t.priceARS, 0);
        if (total > maxBuy) maxBuy = total;
    });
    
    months.forEach((monthName, monthIndex) => {
        const monthDiv = document.createElement('div');
        monthDiv.className = 'calendar-month';
        
        const monthHeader = document.createElement('div');
        monthHeader.className = 'calendar-month-name';
        monthHeader.textContent = monthName;
        monthDiv.appendChild(monthHeader);
        
        const daysDiv = document.createElement('div');
        daysDiv.className = 'calendar-days';
        
        const firstDay = new Date(year, monthIndex, 1).getDay();
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'calendar-day';
            daysDiv.appendChild(empty);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            dayDiv.textContent = day;
            
            const dayBuys = buysByDate[dateStr];
            const daySells = sellsByDate[dateStr];
            
            if (dayBuys && daySells) {
                // Ambos: mostrar mixto
                dayDiv.classList.add('has-mixed');
                dayDiv.onclick = () => showDayDetail(dateStr, dayBuys, daySells);
            } else if (dayBuys) {
                const total = dayBuys.reduce((sum, t) => sum + t.priceARS, 0);
                const intensity = total / maxBuy;
                dayDiv.classList.add('has-buy');
                dayDiv.classList.add(intensity > 0.5 ? 'buy-high' : 'buy-low');
                dayDiv.onclick = () => showDayDetail(dateStr, dayBuys, []);
            } else if (daySells) {
                dayDiv.classList.add('has-sell');
                dayDiv.onclick = () => showDayDetail(dateStr, [], daySells);
            }
            
            daysDiv.appendChild(dayDiv);
        }
        
        monthDiv.appendChild(daysDiv);
        grid.appendChild(monthDiv);
    });
}

function normalizeDate(dateStr) {
    if (!dateStr) return '';
    if (typeof dateStr === 'string') {
        if (dateStr.includes('T')) return dateStr.split('T')[0];
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    }
    return dateStr;
}

function changeCalendarYear(delta) {
    AppState.calendarYear += delta;
    updateCalendar();
}

function showDayDetail(date, buys, sells) {
    const modal = document.getElementById('day-detail-modal');
    const title = document.getElementById('day-detail-title');
    const content = document.getElementById('day-detail-content');
    
    title.textContent = `Operaciones del ${formatDate(date)}`;
    
    let html = '';
    
    if (buys && buys.length > 0) {
        const totalBuy = buys.reduce((sum, t) => sum + t.priceARS, 0);
        html += `
            <div class="day-section buy-section">
                <h4><i class="fas fa-cart-plus"></i> Compras</h4>
                <div class="day-total">Total: ${formatCurrencyWithLabel(totalBuy, 'ARS')}</div>
                ${buys.map(t => `
                    <div class="day-transaction">
                        <span class="day-transaction-stock">${t.ticker.replace('.BA', '')}</span>
                        <span>${t.quantity} acciones</span>
                        <span class="day-transaction-amount">${formatCurrencyWithLabel(t.priceARS, 'ARS')}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    if (sells && sells.length > 0) {
        const totalSell = sells.reduce((sum, s) => sum + s.priceARS, 0);
        const totalProfit = sells.reduce((sum, s) => sum + (s.profitARS || 0), 0);
        html += `
            <div class="day-section sell-section">
                <h4><i class="fas fa-hand-holding-usd"></i> Ventas</h4>
                <div class="day-total">Total: ${formatCurrencyWithLabel(totalSell, 'ARS')} | G/P: <span class="${totalProfit >= 0 ? 'profit' : 'loss'}">${totalProfit >= 0 ? '+' : ''}${formatNumber(totalProfit)}</span></div>
                ${sells.map(s => `
                    <div class="day-transaction sell">
                        <span class="day-transaction-stock">${s.ticker.replace('.BA', '')}</span>
                        <span>${s.quantity} acciones</span>
                        <span class="day-transaction-amount">${formatCurrencyWithLabel(s.priceARS, 'ARS')}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    content.innerHTML = html;
    modal.classList.remove('hidden');
}

function closeDayModal() {
    document.getElementById('day-detail-modal').classList.add('hidden');
}

// =============================================
// UTILIDADES
// =============================================

function toggleTransactionsHistory() {
    const content = document.getElementById('transactions-content');
    const icon = document.querySelector('#toggle-history i');
    content.classList.toggle('collapsed');
    icon.classList.toggle('fa-chevron-down');
    icon.classList.toggle('fa-chevron-up');
}

function formatNumber(value) {
    return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function formatNumberUSD(value) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function formatCurrencyWithLabel(value, currency) {
    if (currency === 'USD') {
        const formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
        return `<span class="currency-label">USD</span> ${formatted}`;
    }
    const formatted = new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
    return `<span class="currency-label">ARS</span> ${formatted}`;
}

function formatDate(dateStr) {
    if (!dateStr) return 'Sin fecha';
    try {
        let date;
        if (typeof dateStr === 'string') {
            if (dateStr.includes('-') && dateStr.length === 10) {
                const parts = dateStr.split('-');
                date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            } else if (dateStr.includes('T')) {
                date = new Date(dateStr);
            } else {
                date = new Date(dateStr);
            }
        } else {
            date = new Date(dateStr);
        }
        
        if (isNaN(date.getTime())) return String(dateStr);
        
        return new Intl.DateTimeFormat('es-AR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(date);
    } catch (e) {
        return String(dateStr);
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    
    toast.innerHTML = `<i class="fas ${icons[type]}"></i><span class="toast-message">${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function showHoldingDetail(ticker) {
    const holding = AppState.holdings[ticker];
    if (!holding) return;
    
    const currentUSD = AppState.currentUSD.oficial || 1100;
    const currentPrice = AppState.currentPrices[ticker]?.price || holding.avgPricePerShare;
    const currentValue = holding.quantity * currentPrice;
    const profit = currentValue - holding.totalInvestedARS;
    
    alert(`
Detalle de ${ticker.replace('.BA', '')}

Cantidad: ${holding.quantity.toFixed(2)} acciones
Precio promedio compra: ARS ${formatNumber(holding.avgPricePerShare)}
Precio actual: ARS ${formatNumber(currentPrice)}
Inversión: ARS ${formatNumber(holding.totalInvestedARS)}
Valor actual: ARS ${formatNumber(currentValue)}
Ganancia/Pérdida: ARS ${formatNumber(profit)}
Compras: ${holding.transactions.length}
Ventas: ${holding.sales.length}
    `);
}

// Exponer funciones globalmente
window.deleteTransaction = deleteTransaction;
window.showHoldingDetail = showHoldingDetail;
window.closeDayModal = closeDayModal;
