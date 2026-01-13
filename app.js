// =============================================
// WEALTH PORTFOLIO - JavaScript Principal
// =============================================

// Estado global de la aplicación
const AppState = {
    user: null,
    transactions: [],
    holdings: {},
    currentPrices: {},
    currentUSD: 1150,
    calendarYear: new Date().getFullYear(),
    charts: {
        pie: null,
        bar: null
    },
    pricesLoaded: false
};

// APIs gratuitas para precios (sin necesidad de key)
const PRICE_APIS = {
    // Yahoo Finance via AllOrigins proxy (CORS-friendly)
    yahoo: (symbol) => `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`)}`,
    // Dólar Blue Argentina
    dolar: 'https://api.bluelytics.com.ar/v2/latest'
};

// =============================================
// INICIALIZACIÓN
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // Cargar tema guardado
    loadTheme();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Configurar fecha máxima en el input
    document.getElementById('purchase-date').max = new Date().toISOString().split('T')[0];
    
    // Verificar si hay sesión guardada
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
    
    // Toggle formulario de transacción
    document.getElementById('toggle-form').addEventListener('click', toggleTransactionForm);
    
    // Formulario de transacción
    document.getElementById('transaction-form').addEventListener('submit', handleAddTransaction);
    
    // Cálculo automático USD
    document.getElementById('price-ars').addEventListener('input', calculateUSD);
    document.getElementById('exchange-rate').addEventListener('input', calculateUSD);
    
    // Navegación del calendario
    document.getElementById('prev-year').addEventListener('click', () => changeCalendarYear(-1));
    document.getElementById('next-year').addEventListener('click', () => changeCalendarYear(1));
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
    
    // Actualizar colores de los gráficos
    if (AppState.user) {
        updateCharts();
    }
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
            // Modo demo
            const foundUser = DEMO_DATA.users.find(u => u.user === user && u.password === password);
            if (foundUser) {
                AppState.user = { user: foundUser.user, name: foundUser.user };
                localStorage.setItem('wealthPortfolioUser', JSON.stringify(AppState.user));
                await loginSuccess();
            } else {
                showAuthError('Usuario o contraseña incorrectos');
            }
        } else {
            // Llamar al Google Apps Script
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
            // Modo demo - simular registro
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
            // Llamar al Google Apps Script
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
    AppState.holdings = {};
    localStorage.removeItem('wealthPortfolioUser');
    
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('main-content').classList.add('hidden');
    document.getElementById('user-info').classList.add('hidden');
    
    // Limpiar formularios
    document.getElementById('login-form').reset();
    document.getElementById('register-form').reset();
    
    showToast('Sesión cerrada', 'info');
}

async function loginSuccess() {
    document.getElementById('auth-modal').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    document.getElementById('user-info').classList.remove('hidden');
    document.getElementById('user-name').textContent = AppState.user.user || AppState.user.name;
    
    // Cargar datos del usuario
    await loadUserData();
    
    // Actualizar interfaz
    updateUI();
    
    // Iniciar actualizaciones periódicas de precios
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
// DATOS Y TRANSACCIONES
// =============================================

async function loadUserData() {
    try {
        if (CONFIG.DEMO_MODE || CONFIG.GOOGLE_SCRIPT_URL === 'TU_URL_DEL_SCRIPT_AQUI') {
            // Modo demo
            AppState.transactions = DEMO_DATA.transactions.filter(t => t.userId === AppState.user.user);
        } else {
            // Llamar al Google Apps Script
            const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=getTransactions&user=${encodeURIComponent(AppState.user.user)}`);
            const data = await response.json();
            
            if (data.success) {
                AppState.transactions = data.transactions || [];
            }
        }
        
        // Calcular holdings
        calculateHoldings();
        
        // Obtener precios reales de las acciones
        await fetchRealPrices();
        
        // Obtener cotización del dólar
        await fetchUSDRate();
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        showToast('Error al cargar datos', 'error');
    }
}

// =============================================
// OBTENER PRECIOS REALES
// =============================================

async function fetchRealPrices() {
    const uniqueTickers = new Set();
    
    // Agregar tickers de los holdings del usuario
    Object.keys(AppState.holdings).forEach(ticker => uniqueTickers.add(ticker));
    
    // Agregar tickers del mercado
    CONFIG.MARKET_SYMBOLS.forEach(symbol => {
        uniqueTickers.add(symbol);
        uniqueTickers.add(symbol + '.BA');
    });
    
    const promises = [];
    
    for (const ticker of uniqueTickers) {
        promises.push(fetchStockPrice(ticker));
    }
    
    await Promise.allSettled(promises);
    AppState.pricesLoaded = true;
    
    // Actualizar hora de actualización
    const updateTimeEl = document.getElementById('market-update-time');
    if (updateTimeEl) {
        const now = new Date();
        updateTimeEl.textContent = `Última actualización: ${now.toLocaleTimeString('es-AR')}`;
    }
}

async function fetchStockPrice(ticker) {
    try {
        // Convertir ticker argentino a formato Yahoo
        let yahooSymbol = ticker;
        
        // Si es un CEDEAR o acción argentina
        if (ticker.endsWith('.BA')) {
            yahooSymbol = ticker; // Yahoo usa el mismo formato
        }
        
        const url = PRICE_APIS.yahoo(yahooSymbol);
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Network error');
        
        const data = await response.json();
        
        if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const meta = result.meta;
            const quote = result.indicators?.quote?.[0];
            
            const currentPrice = meta.regularMarketPrice || meta.previousClose;
            const previousClose = meta.previousClose || meta.chartPreviousClose;
            const change = previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : 0;
            
            AppState.currentPrices[ticker] = {
                price: currentPrice,
                change: change,
                previousClose: previousClose,
                currency: meta.currency || 'ARS'
            };
            
            // También guardar sin .BA para acceso fácil
            if (ticker.endsWith('.BA')) {
                const shortTicker = ticker.replace('.BA', '');
                AppState.currentPrices[shortTicker] = AppState.currentPrices[ticker];
            }
            
            return true;
        }
    } catch (error) {
        console.warn(`Error fetching price for ${ticker}:`, error.message);
        
        // Usar precio de demo si falla
        if (DEMO_DATA.currentPrices[ticker]) {
            AppState.currentPrices[ticker] = DEMO_DATA.currentPrices[ticker];
        }
    }
    return false;
}

async function fetchUSDRate() {
    try {
        const response = await fetch(PRICE_APIS.dolar);
        const data = await response.json();
        
        if (data && data.blue && data.blue.value_sell) {
            AppState.currentUSD = data.blue.value_sell;
        } else if (data && data.oficial && data.oficial.value_sell) {
            AppState.currentUSD = data.oficial.value_sell;
        }
    } catch (error) {
        console.warn('Error fetching USD rate:', error);
        // Mantener valor por defecto
        AppState.currentUSD = DEMO_DATA.currentUSD || 1150;
    }
}

// Actualizar precios cada 5 minutos
function startPriceUpdates() {
    setInterval(async () => {
        await fetchRealPrices();
        await fetchUSDRate();
        updateUI();
    }, 5 * 60 * 1000);
}

function calculateHoldings() {
    AppState.holdings = {};
    
    AppState.transactions.forEach(t => {
        if (!AppState.holdings[t.ticker]) {
            AppState.holdings[t.ticker] = {
                ticker: t.ticker,
                tickerName: t.tickerName,
                quantity: 0,
                totalInvestedARS: 0,
                totalInvestedUSD: 0,
                avgExchangeRate: 0,
                transactions: []
            };
        }
        
        AppState.holdings[t.ticker].quantity += t.quantity;
        AppState.holdings[t.ticker].totalInvestedARS += t.priceARS;
        AppState.holdings[t.ticker].totalInvestedUSD += t.priceUSD;
        AppState.holdings[t.ticker].transactions.push(t);
    });
    
    // Calcular precio promedio
    Object.values(AppState.holdings).forEach(h => {
        h.avgPricePerShare = h.totalInvestedARS / h.quantity;
        h.avgExchangeRate = h.totalInvestedARS / h.totalInvestedUSD;
    });
}

async function handleAddTransaction(e) {
    e.preventDefault();
    
    const ticker = document.getElementById('stock-select').value;
    const tickerName = document.getElementById('stock-select').options[document.getElementById('stock-select').selectedIndex].text.split(' - ')[1];
    const date = document.getElementById('purchase-date').value;
    const quantity = parseFloat(document.getElementById('quantity').value);
    const priceARS = parseFloat(document.getElementById('price-ars').value);
    const exchangeRate = parseFloat(document.getElementById('exchange-rate').value);
    const priceUSD = priceARS / exchangeRate;
    
    const transaction = {
        id: Date.now().toString(),
        userId: AppState.user.user,
        ticker,
        tickerName,
        date,
        quantity,
        priceARS,
        exchangeRate,
        priceUSD
    };
    
    try {
        if (CONFIG.DEMO_MODE || CONFIG.GOOGLE_SCRIPT_URL === 'TU_URL_DEL_SCRIPT_AQUI') {
            // Modo demo
            DEMO_DATA.transactions.push(transaction);
            AppState.transactions.push(transaction);
        } else {
            // Guardar en Google Sheets
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
        
        // Actualizar interfaz
        calculateHoldings();
        updateUI();
        
        // Limpiar formulario
        document.getElementById('transaction-form').reset();
        document.getElementById('usd-equivalent').textContent = '$0.00 USD';
        
        showToast('Compra registrada exitosamente', 'success');
        
    } catch (error) {
        console.error('Error guardando transacción:', error);
        showToast('Error al guardar la compra', 'error');
    }
}

async function deleteTransaction(transactionId) {
    if (!confirm('¿Estás seguro de eliminar esta transacción?')) return;
    
    try {
        if (CONFIG.DEMO_MODE || CONFIG.GOOGLE_SCRIPT_URL === 'TU_URL_DEL_SCRIPT_AQUI') {
            // Modo demo
            const index = DEMO_DATA.transactions.findIndex(t => t.id === transactionId);
            if (index > -1) DEMO_DATA.transactions.splice(index, 1);
            
            const stateIndex = AppState.transactions.findIndex(t => t.id === transactionId);
            if (stateIndex > -1) AppState.transactions.splice(stateIndex, 1);
        } else {
            // Eliminar de Google Sheets
            const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=deleteTransaction&id=${transactionId}&user=${encodeURIComponent(AppState.user.user)}`);
            const data = await response.json();
            
            if (data.success) {
                const index = AppState.transactions.findIndex(t => t.id === transactionId);
                if (index > -1) AppState.transactions.splice(index, 1);
            } else {
                throw new Error(data.message);
            }
        }
        
        calculateHoldings();
        updateUI();
        showToast('Transacción eliminada', 'success');
        
    } catch (error) {
        console.error('Error eliminando transacción:', error);
        showToast('Error al eliminar', 'error');
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
}

function updateSummary() {
    let totalValueARS = 0;
    let totalInvestedARS = 0;
    
    Object.values(AppState.holdings).forEach(holding => {
        // Obtener precio actual
        const priceData = AppState.currentPrices[holding.ticker] || 
                         AppState.currentPrices[holding.ticker.replace('.BA', '')] ||
                         null;
        
        const pricePerShareAtPurchase = holding.totalInvestedARS / holding.quantity;
        const currentPricePerShare = priceData ? priceData.price : pricePerShareAtPurchase;
        
        const currentValue = holding.quantity * currentPricePerShare;
        totalValueARS += currentValue;
        totalInvestedARS += holding.totalInvestedARS;
    });
    
    const totalValueUSD = totalValueARS / AppState.currentUSD;
    const totalProfit = totalValueARS - totalInvestedARS;
    const profitPercent = totalInvestedARS > 0 ? (totalProfit / totalInvestedARS) * 100 : 0;
    
    document.getElementById('total-value-ars').textContent = formatCurrency(totalValueARS, 'ARS');
    document.getElementById('total-value-usd').textContent = `USD ${formatCurrency(totalValueUSD, 'USD')}`;
    document.getElementById('total-invested').textContent = formatCurrency(totalInvestedARS, 'ARS');
    
    const profitEl = document.getElementById('total-profit');
    profitEl.textContent = formatCurrency(totalProfit, 'ARS');
    profitEl.className = `summary-value small ${totalProfit >= 0 ? 'profit' : 'loss'}`;
    
    const percentEl = document.getElementById('total-profit-percent');
    percentEl.textContent = `${totalProfit >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%`;
    percentEl.className = `summary-percent ${totalProfit >= 0 ? 'profit' : 'loss'}`;
    
    document.getElementById('current-usd').textContent = formatCurrency(AppState.currentUSD, 'ARS');
}

function updateMarketTicker() {
    const ticker = document.getElementById('market-ticker');
    ticker.innerHTML = '';
    
    CONFIG.MARKET_SYMBOLS.forEach(symbol => {
        // Buscar precio con diferentes formatos
        const priceData = AppState.currentPrices[symbol + '.BA'] || 
                         AppState.currentPrices[symbol] || 
                         { price: 0, change: 0 };
        
        const item = document.createElement('div');
        item.className = 'ticker-item';
        
        const price = priceData.price || 0;
        const change = priceData.change || 0;
        
        item.innerHTML = `
            <span class="ticker-symbol">${symbol}</span>
            <span class="ticker-price">${price > 0 ? formatCurrency(price, 'ARS') : 'Cargando...'}</span>
            <span class="ticker-change ${change >= 0 ? 'positive' : 'negative'}">
                ${change !== 0 ? (change >= 0 ? '+' : '') + change.toFixed(2) + '%' : '--'}
            </span>
        `;
        ticker.appendChild(item);
    });
}

function updateHoldingsTable() {
    const tbody = document.getElementById('holdings-body');
    const noHoldings = document.getElementById('no-holdings');
    const holdings = Object.values(AppState.holdings);
    
    if (holdings.length === 0) {
        tbody.innerHTML = '';
        noHoldings.classList.remove('hidden');
        return;
    }
    
    noHoldings.classList.add('hidden');
    tbody.innerHTML = '';
    
    holdings.forEach(holding => {
        // Obtener precio actual de la acción
        const priceData = AppState.currentPrices[holding.ticker] || 
                         AppState.currentPrices[holding.ticker.replace('.BA', '')] ||
                         null;
        
        // Si no hay precio actual, usar el precio promedio de compra por acción
        const pricePerShareAtPurchase = holding.totalInvestedARS / holding.quantity;
        const currentPricePerShare = priceData ? priceData.price : pricePerShareAtPurchase;
        
        // Calcular valor actual total
        const currentValueARS = holding.quantity * currentPricePerShare;
        
        // Calcular ganancia/pérdida
        const profitARS = currentValueARS - holding.totalInvestedARS;
        const profitUSD = profitARS / AppState.currentUSD;
        const profitPercent = holding.totalInvestedARS > 0 ? (profitARS / holding.totalInvestedARS) * 100 : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong>${holding.ticker.replace('.BA', '')}</strong>
                <br><small style="color: var(--text-tertiary)">${holding.tickerName}</small>
            </td>
            <td>${holding.quantity.toFixed(2)}</td>
            <td>${formatCurrency(holding.totalInvestedARS, 'ARS')}</td>
            <td>
                ${formatCurrency(currentValueARS, 'ARS')}
                ${priceData ? '' : '<br><small style="color: var(--text-tertiary)">(sin cotización)</small>'}
            </td>
            <td class="${profitARS >= 0 ? 'text-profit' : 'text-loss'}">
                ${profitARS >= 0 ? '+' : ''}${formatCurrency(profitARS, 'ARS')}
            </td>
            <td class="${profitUSD >= 0 ? 'text-profit' : 'text-loss'}">
                ${profitUSD >= 0 ? '+' : ''}${formatCurrency(profitUSD, 'USD')}
            </td>
            <td class="${profitPercent >= 0 ? 'text-profit' : 'text-loss'}">
                ${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%
            </td>
            <td>
                <button class="btn-secondary" onclick="showHoldingDetail('${holding.ticker}')" style="padding: 6px 12px; font-size: 12px;">
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
    
    // Ordenar por fecha descendente
    const sortedTransactions = [...AppState.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedTransactions.forEach(t => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(t.date)}</td>
            <td>
                <strong>${t.ticker.replace('.BA', '')}</strong>
                <br><small style="color: var(--text-tertiary)">${t.tickerName}</small>
            </td>
            <td>${t.quantity.toFixed(2)}</td>
            <td>${formatCurrency(t.priceARS, 'ARS')}</td>
            <td>${formatCurrency(t.exchangeRate, 'ARS')}</td>
            <td>${formatCurrency(t.priceUSD, 'USD')}</td>
            <td>
                <button class="btn-danger" onclick="deleteTransaction('${t.id}')" title="Eliminar">
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
    const holdings = Object.values(AppState.holdings);
    
    // Destruir gráfico anterior si existe
    if (AppState.charts.pie) {
        AppState.charts.pie.destroy();
    }
    
    if (holdings.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }
    
    const data = holdings.map(h => {
        const priceData = AppState.currentPrices[h.ticker] || 
                         AppState.currentPrices[h.ticker.replace('.BA', '')] ||
                         null;
        const pricePerShare = priceData ? priceData.price : (h.totalInvestedARS / h.quantity);
        return h.quantity * pricePerShare;
    });
    
    const labels = holdings.map(h => h.ticker.replace('.BA', ''));
    
    const colors = [
        '#C9A962', '#E5D4A1', '#A88B4A', '#D4AF37', '#FFD700',
        '#B8860B', '#DAA520', '#F4C430', '#CFB53B', '#C5B358'
    ];
    
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
                    position: 'right',
                    labels: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-primary'),
                        padding: 16,
                        font: {
                            family: 'JetBrains Mono, monospace'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${formatCurrency(context.parsed, 'ARS')} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateBarChart() {
    const ctx = document.getElementById('performance-bar-chart').getContext('2d');
    const holdings = Object.values(AppState.holdings);
    
    // Destruir gráfico anterior si existe
    if (AppState.charts.bar) {
        AppState.charts.bar.destroy();
    }
    
    if (holdings.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }
    
    const data = holdings.map(h => {
        const priceData = AppState.currentPrices[h.ticker] || 
                         AppState.currentPrices[h.ticker.replace('.BA', '')] ||
                         null;
        const pricePerShare = priceData ? priceData.price : (h.totalInvestedARS / h.quantity);
        const currentValue = h.quantity * pricePerShare;
        const profit = currentValue - h.totalInvestedARS;
        return h.totalInvestedARS > 0 ? (profit / h.totalInvestedARS) * 100 : 0;
    });
    
    const labels = holdings.map(h => h.ticker.replace('.BA', ''));
    
    const colors = data.map(d => d >= 0 ? 
        getComputedStyle(document.body).getPropertyValue('--profit-color').trim() : 
        getComputedStyle(document.body).getPropertyValue('--loss-color').trim()
    );
    
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
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y >= 0 ? '+' : ''}${context.parsed.y.toFixed(2)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: {
                        color: getComputedStyle(document.body).getPropertyValue('--border-color')
                    },
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-secondary'),
                        callback: function(value) {
                            return value + '%';
                        },
                        font: {
                            family: 'JetBrains Mono, monospace'
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-secondary'),
                        font: {
                            family: 'JetBrains Mono, monospace'
                        }
                    }
                }
            }
        }
    });
}

// =============================================
// CALENDARIO
// =============================================

function updateCalendar() {
    const grid = document.getElementById('calendar-grid');
    const yearDisplay = document.getElementById('calendar-year');
    const year = AppState.calendarYear;
    
    yearDisplay.textContent = year;
    grid.innerHTML = '';
    
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    // Agrupar transacciones por fecha
    const transactionsByDate = {};
    AppState.transactions.forEach(t => {
        if (!transactionsByDate[t.date]) {
            transactionsByDate[t.date] = [];
        }
        transactionsByDate[t.date].push(t);
    });
    
    // Calcular máximo para escala de colores
    let maxDayTotal = 0;
    Object.values(transactionsByDate).forEach(transactions => {
        const total = transactions.reduce((sum, t) => sum + t.priceARS, 0);
        if (total > maxDayTotal) maxDayTotal = total;
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
        
        // Obtener primer día del mes y cantidad de días
        const firstDay = new Date(year, monthIndex, 1).getDay();
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        
        // Espacios vacíos antes del primer día
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'calendar-day';
            daysDiv.appendChild(empty);
        }
        
        // Días del mes
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            dayDiv.textContent = day;
            
            const dayTransactions = transactionsByDate[dateStr];
            if (dayTransactions) {
                const total = dayTransactions.reduce((sum, t) => sum + t.priceARS, 0);
                const intensity = total / maxDayTotal;
                
                dayDiv.classList.add('has-investment');
                if (intensity < 0.33) {
                    dayDiv.classList.add('investment-low');
                } else if (intensity < 0.66) {
                    dayDiv.classList.add('investment-medium');
                } else {
                    dayDiv.classList.add('investment-high');
                }
                
                dayDiv.onclick = () => showDayDetail(dateStr, dayTransactions);
            }
            
            daysDiv.appendChild(dayDiv);
        }
        
        monthDiv.appendChild(daysDiv);
        grid.appendChild(monthDiv);
    });
}

function changeCalendarYear(delta) {
    AppState.calendarYear += delta;
    updateCalendar();
}

function showDayDetail(date, transactions) {
    const modal = document.getElementById('day-detail-modal');
    const title = document.getElementById('day-detail-title');
    const content = document.getElementById('day-detail-content');
    
    title.textContent = `Inversiones del ${formatDate(date)}`;
    
    const totalDay = transactions.reduce((sum, t) => sum + t.priceARS, 0);
    
    content.innerHTML = `
        <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color);">
            <strong>Total del día:</strong> ${formatCurrency(totalDay, 'ARS')}
        </div>
        ${transactions.map(t => `
            <div class="day-transaction">
                <div>
                    <div class="day-transaction-stock">${t.ticker.replace('.BA', '')}</div>
                    <small style="color: var(--text-secondary)">${t.quantity} acciones</small>
                </div>
                <div class="day-transaction-amount">${formatCurrency(t.priceARS, 'ARS')}</div>
            </div>
        `).join('')}
    `;
    
    modal.classList.remove('hidden');
}

function closeDayModal() {
    document.getElementById('day-detail-modal').classList.add('hidden');
}

// Cerrar modal al hacer clic fuera
document.getElementById('day-detail-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'day-detail-modal') {
        closeDayModal();
    }
});

// =============================================
// UTILIDADES
// =============================================

function toggleTransactionForm() {
    const form = document.getElementById('transaction-form');
    const icon = document.querySelector('#toggle-form i');
    
    form.classList.toggle('collapsed');
    icon.classList.toggle('fa-chevron-down');
    icon.classList.toggle('fa-chevron-up');
}

function calculateUSD() {
    const priceARS = parseFloat(document.getElementById('price-ars').value) || 0;
    const exchangeRate = parseFloat(document.getElementById('exchange-rate').value) || 1;
    const usdValue = exchangeRate > 0 ? priceARS / exchangeRate : 0;
    
    document.getElementById('usd-equivalent').textContent = `$${usdValue.toFixed(2)} USD`;
}

function formatCurrency(value, currency) {
    if (currency === 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(value);
    }
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0
    }).format(value);
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Remover después de 4 segundos
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function showHoldingDetail(ticker) {
    const holding = AppState.holdings[ticker];
    if (!holding) return;
    
    const currentPrice = AppState.currentPrices[ticker]?.price || holding.avgPricePerShare;
    const currentValue = holding.quantity * currentPrice;
    const profit = currentValue - holding.totalInvestedARS;
    
    alert(`
Detalle de ${ticker}

Cantidad: ${holding.quantity.toFixed(2)} acciones
Inversión total: ${formatCurrency(holding.totalInvestedARS, 'ARS')}
Valor actual: ${formatCurrency(currentValue, 'ARS')}
Ganancia/Pérdida: ${formatCurrency(profit, 'ARS')}
Transacciones: ${holding.transactions.length}
    `);
}

// Exponer funciones necesarias globalmente
window.deleteTransaction = deleteTransaction;
window.showHoldingDetail = showHoldingDetail;
window.closeDayModal = closeDayModal;
