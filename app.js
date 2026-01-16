// =============================================
// WEALTH PORTFOLIO - JavaScript Principal
// =============================================

// Fecha de corte para cambio de dólar (14 de abril de 2025)
// Antes de esta fecha: Dólar Blue
// Desde esta fecha en adelante: Dólar Oficial
const DOLAR_SWITCH_DATE = '2025-04-14';

// Estado global de la aplicación
const AppState = {
    user: null,
    transactions: [],
    holdings: {},
    currentPrices: {},
    currentUSD: {
        blue: 1500,
        oficial: 1100
    },
    calendarYear: new Date().getFullYear(),
    charts: {
        pie: null,
        bar: null
    },
    pricesLoaded: false
};

// APIs gratuitas para precios
const PRICE_APIS = {
    proxies: [
        (symbol) => `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`)}`,
        (symbol) => `https://corsproxy.io/?${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`)}`,
        (symbol) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`)}`
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
    document.getElementById('purchase-date').max = new Date().toISOString().split('T')[0];
    initStockSelector();
    
    const savedUser = localStorage.getItem('wealthPortfolioUser');
    if (savedUser) {
        AppState.user = JSON.parse(savedUser);
        await loginSuccess();
    }
    
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
    }, 800);
}

function setupEventListeners() {
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
    });
    
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('toggle-form').addEventListener('click', toggleTransactionForm);
    document.getElementById('transaction-form').addEventListener('submit', handleAddTransaction);
    
    document.getElementById('quantity').addEventListener('input', calculateTotal);
    document.getElementById('price-per-share').addEventListener('input', calculateTotal);
    document.getElementById('exchange-rate').addEventListener('input', calculateTotal);
    
    document.getElementById('prev-year').addEventListener('click', () => changeCalendarYear(-1));
    document.getElementById('next-year').addEventListener('click', () => changeCalendarYear(1));
    
    document.getElementById('purchase-date').addEventListener('change', handleDateChange);
    
    document.querySelectorAll('input[name="dolar-type"]').forEach(radio => {
        radio.addEventListener('change', handleDolarTypeChange);
    });
    
    document.getElementById('toggle-history').addEventListener('click', toggleTransactionsHistory);
}

// =============================================
// SELECTOR DE ACCIONES
// =============================================

function initStockSelector() {
    const stockSelect = document.getElementById('stock-select');
    
    if (stockSelect && !stockSelect.tomselect) {
        new TomSelect('#stock-select', {
            placeholder: 'Buscar acción...',
            searchField: ['text', 'value'],
            sortField: { field: 'text', direction: 'asc' },
            render: {
                option: (data, escape) => `<div class="option">${escape(data.text)}</div>`,
                item: (data, escape) => `<div class="item">${escape(data.text)}</div>`,
                optgroup_header: (data, escape) => `<div class="optgroup-header">${escape(data.label)}</div>`,
                no_results: (data, escape) => `<div class="no-results">No se encontró "${escape(data.input)}"</div>`
            },
            maxOptions: 200,
            openOnFocus: true,
            highlight: true
        });
    }
}

// =============================================
// TEMA
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
    
    setTimeout(() => initStockSelector(), 100);
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
// DATOS Y TRANSACCIONES
// =============================================

async function loadUserData() {
    try {
        if (CONFIG.DEMO_MODE || CONFIG.GOOGLE_SCRIPT_URL === 'TU_URL_DEL_SCRIPT_AQUI') {
            AppState.transactions = DEMO_DATA.transactions.filter(t => t.userId === AppState.user.user);
        } else {
            const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=getTransactions&user=${encodeURIComponent(AppState.user.user)}`);
            const data = await response.json();
            if (data.success) {
                AppState.transactions = data.transactions || [];
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
// PRECIOS Y DÓLAR
// =============================================

async function fetchRealPrices() {
    const uniqueTickers = new Set();
    Object.keys(AppState.holdings).forEach(ticker => uniqueTickers.add(ticker));
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
    
    const updateTimeEl = document.getElementById('market-update-time');
    if (updateTimeEl) {
        const now = new Date();
        updateTimeEl.textContent = `Última actualización: ${now.toLocaleTimeString('es-AR')}`;
    }
}

async function fetchStockPrice(ticker) {
    let yahooSymbol = ticker;
    
    for (const proxyFn of PRICE_APIS.proxies) {
        try {
            const url = proxyFn(yahooSymbol);
            const response = await fetch(url, { timeout: 5000 });
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
            continue;
        }
    }
    
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
        console.warn('Error fetching historical USD rate:', error);
        return null;
    }
}

// Determinar qué tipo de dólar usar según la fecha
function getDolarTypeForDate(dateStr) {
    if (!dateStr) return 'blue';
    return dateStr >= DOLAR_SWITCH_DATE ? 'oficial' : 'blue';
}

// Obtener la cotización actual según la fecha
function getCurrentUSDForDate(dateStr) {
    const type = getDolarTypeForDate(dateStr);
    return AppState.currentUSD[type] || AppState.currentUSD.blue || 1200;
}

async function handleDateChange(e) {
    const dateValue = e.target.value;
    const exchangeRateInput = document.getElementById('exchange-rate');
    const dolarTypeContainer = document.getElementById('dolar-type-container');
    const dolarBlueLabel = document.getElementById('dolar-blue-value');
    const dolarOficialLabel = document.getElementById('dolar-oficial-value');
    
    if (!dateValue) return;
    
    exchangeRateInput.placeholder = 'Buscando cotización...';
    exchangeRateInput.disabled = true;
    
    const today = new Date().toISOString().split('T')[0];
    let rates = dateValue === today ? AppState.currentUSD : await fetchHistoricalUSDRate(dateValue);
    
    exchangeRateInput.disabled = false;
    
    if (rates && (rates.blue || rates.oficial)) {
        if (dolarTypeContainer) dolarTypeContainer.classList.remove('hidden');
        
        if (dolarBlueLabel && rates.blue) dolarBlueLabel.textContent = `$${Math.round(rates.blue)}`;
        if (dolarOficialLabel && rates.oficial) dolarOficialLabel.textContent = `$${Math.round(rates.oficial)}`;
        
        exchangeRateInput.dataset.blueRate = rates.blue || '';
        exchangeRateInput.dataset.oficialRate = rates.oficial || '';
        
        // Seleccionar automáticamente según la fecha de corte
        const recommendedType = getDolarTypeForDate(dateValue);
        const radioToSelect = document.querySelector(`input[name="dolar-type"][value="${recommendedType}"]`);
        if (radioToSelect) radioToSelect.checked = true;
        
        const selectedRate = recommendedType === 'blue' ? rates.blue : rates.oficial;
        
        if (selectedRate) {
            exchangeRateInput.value = Math.round(selectedRate);
            calculateTotal();
        }
        
        const typeLabel = recommendedType === 'blue' ? 'Blue' : 'Oficial';
        showToast(`Usando dólar ${typeLabel} para ${formatDate(dateValue)}`, 'info');
    } else {
        if (dolarTypeContainer) dolarTypeContainer.classList.add('hidden');
        exchangeRateInput.placeholder = 'No encontrada - ingresá manualmente';
        exchangeRateInput.value = '';
    }
}

function handleDolarTypeChange(e) {
    const exchangeRateInput = document.getElementById('exchange-rate');
    const selectedRate = e.target.value === 'blue' 
        ? exchangeRateInput.dataset.blueRate 
        : exchangeRateInput.dataset.oficialRate;
    
    if (selectedRate) {
        exchangeRateInput.value = Math.round(parseFloat(selectedRate));
        calculateTotal();
    }
}

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
                transactions: []
            };
        }
        
        AppState.holdings[t.ticker].quantity += t.quantity;
        AppState.holdings[t.ticker].totalInvestedARS += t.priceARS;
        AppState.holdings[t.ticker].totalInvestedUSD += t.priceUSD;
        AppState.holdings[t.ticker].transactions.push(t);
    });
    
    Object.values(AppState.holdings).forEach(h => {
        h.avgPricePerShare = h.totalInvestedARS / h.quantity;
        h.avgExchangeRate = h.totalInvestedARS / h.totalInvestedUSD;
    });
}

async function handleAddTransaction(e) {
    e.preventDefault();
    
    const stockSelect = document.getElementById('stock-select');
    const ticker = stockSelect.value;
    
    if (!ticker) {
        showToast('Seleccioná una acción', 'error');
        return;
    }
    
    const selectedOption = stockSelect.options[stockSelect.selectedIndex];
    const tickerName = selectedOption ? selectedOption.text.split(' - ')[1] : '';
    const date = document.getElementById('purchase-date').value;
    const quantity = parseFloat(document.getElementById('quantity').value);
    const pricePerShare = parseFloat(document.getElementById('price-per-share').value);
    const priceARS = quantity * pricePerShare;
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
        
        document.getElementById('transaction-form').reset();
        document.getElementById('total-ars').innerHTML = formatCurrencyWithLabel(0, 'ARS');
        document.getElementById('total-usd-calc').innerHTML = `≈ ${formatCurrencyWithLabel(0, 'USD')}`;
        
        if (stockSelect.tomselect) stockSelect.tomselect.clear();
        
        const dolarTypeContainer = document.getElementById('dolar-type-container');
        if (dolarTypeContainer) dolarTypeContainer.classList.add('hidden');
        
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
            const index = DEMO_DATA.transactions.findIndex(t => t.id === transactionId);
            if (index > -1) DEMO_DATA.transactions.splice(index, 1);
            
            const stateIndex = AppState.transactions.findIndex(t => t.id === transactionId);
            if (stateIndex > -1) AppState.transactions.splice(stateIndex, 1);
        } else {
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
    let totalInvestedUSD = 0;
    
    // Usar dólar oficial para cálculos actuales (después del 14/04/2025)
    const currentUSD = AppState.currentUSD.oficial || 1100;
    
    Object.values(AppState.holdings).forEach(holding => {
        const priceData = AppState.currentPrices[holding.ticker] || 
                         AppState.currentPrices[holding.ticker.replace('.BA', '')] || null;
        
        const pricePerShareAtPurchase = holding.totalInvestedARS / holding.quantity;
        const currentPricePerShare = priceData ? priceData.price : pricePerShareAtPurchase;
        
        totalValueARS += holding.quantity * currentPricePerShare;
        totalInvestedARS += holding.totalInvestedARS;
        totalInvestedUSD += holding.totalInvestedUSD;
    });
    
    const totalValueUSD = totalValueARS / currentUSD;
    const totalProfitARS = totalValueARS - totalInvestedARS;
    const totalProfitUSD = totalValueUSD - totalInvestedUSD;
    const profitPercentARS = totalInvestedARS > 0 ? (totalProfitARS / totalInvestedARS) * 100 : 0;
    const profitPercentUSD = totalInvestedUSD > 0 ? (totalProfitUSD / totalInvestedUSD) * 100 : 0;
    
    // Valores principales
    document.getElementById('total-value-ars').innerHTML = formatCurrencyWithLabel(totalValueARS, 'ARS');
    document.getElementById('total-value-usd').innerHTML = formatCurrencyWithLabel(totalValueUSD, 'USD');
    document.getElementById('total-invested').innerHTML = formatCurrencyWithLabel(totalInvestedARS, 'ARS');
    document.getElementById('total-invested-usd').innerHTML = formatCurrencyWithLabel(totalInvestedUSD, 'USD');
    
    // Ganancia/Pérdida en ARS
    const profitClass = totalProfitARS >= 0 ? 'profit' : 'loss';
    
    const profitEl = document.getElementById('total-profit');
    if (profitEl) {
        profitEl.textContent = `${totalProfitARS >= 0 ? '+' : ''}${formatNumber(totalProfitARS)}`;
        profitEl.className = `profit-value ${profitClass}`;
    }
    
    const percentEl = document.getElementById('total-profit-percent');
    if (percentEl) {
        percentEl.textContent = `(${totalProfitARS >= 0 ? '+' : ''}${profitPercentARS.toFixed(2)}%)`;
        percentEl.className = `profit-percent ${profitClass}`;
    }
    
    // Actualizar color del fondo de la fila ARS
    const arsRow = document.querySelector('.profit-ars-row');
    if (arsRow) {
        arsRow.style.background = totalProfitARS >= 0 ? 'var(--profit-bg)' : 'var(--loss-bg)';
    }
    
    // Ganancia/Pérdida en USD
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
    
    // Cotizaciones USD
    const blueEl = document.getElementById('current-usd-blue');
    const oficialEl = document.getElementById('current-usd-oficial');
    if (blueEl) blueEl.innerHTML = formatCurrencyWithLabel(AppState.currentUSD.blue || 1200, 'ARS');
    if (oficialEl) oficialEl.innerHTML = formatCurrencyWithLabel(AppState.currentUSD.oficial || 1050, 'ARS');
}

function updateMarketTicker() {
    const ticker = document.getElementById('market-ticker');
    ticker.innerHTML = '';
    
    CONFIG.MARKET_SYMBOLS.forEach(symbol => {
        const priceData = AppState.currentPrices[symbol + '.BA'] || 
                         AppState.currentPrices[symbol] || { price: 0, change: 0 };
        
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
        ticker.appendChild(item);
    });
}

function updateHoldingsTable() {
    const tbody = document.getElementById('holdings-body');
    const noHoldings = document.getElementById('no-holdings');
    const holdings = Object.values(AppState.holdings);
    
    const today = new Date().toISOString().split('T')[0];
    const currentUSDRate = getCurrentUSDForDate(today);
    
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
        const profitUSD = profitARS / currentUSDRate;
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
    
    const sortedTransactions = [...AppState.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedTransactions.forEach(t => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(t.date)}</td>
            <td>
                <strong>${t.ticker.replace('.BA', '')}</strong>
                <small>${t.tickerName || ''}</small>
            </td>
            <td>${t.quantity.toFixed(2)}</td>
            <td>${formatCurrencyWithLabel(t.priceARS, 'ARS')}</td>
            <td>${formatCurrencyWithLabel(t.exchangeRate, 'ARS')}</td>
            <td>${formatCurrencyWithLabel(t.priceUSD, 'USD')}</td>
            <td>
                <button class="btn-icon-small btn-danger-small" onclick="deleteTransaction('${t.id}')" title="Eliminar">
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
    
    if (AppState.charts.pie) AppState.charts.pie.destroy();
    
    if (holdings.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }
    
    const data = holdings.map(h => {
        const priceData = AppState.currentPrices[h.ticker] || 
                         AppState.currentPrices[h.ticker.replace('.BA', '')] || null;
        const pricePerShare = priceData ? priceData.price : (h.totalInvestedARS / h.quantity);
        return h.quantity * pricePerShare;
    });
    
    const labels = holdings.map(h => h.ticker.replace('.BA', ''));
    
    const colors = [
        '#C9A962', '#4CAF50', '#2196F3', '#FF5722', '#9C27B0',
        '#00BCD4', '#E91E63', '#FF9800', '#607D8B', '#8BC34A',
        '#3F51B5', '#F44336', '#009688', '#FFEB3B', '#795548'
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
                        padding: 10,
                        boxWidth: 12,
                        font: { family: 'JetBrains Mono, monospace', size: 10 }
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
    
    if (AppState.charts.bar) AppState.charts.bar.destroy();
    
    if (holdings.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }
    
    const data = holdings.map(h => {
        const priceData = AppState.currentPrices[h.ticker] || 
                         AppState.currentPrices[h.ticker.replace('.BA', '')] || null;
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
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.parsed.y >= 0 ? '+' : ''}${context.parsed.y.toFixed(2)}%`
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: getComputedStyle(document.body).getPropertyValue('--border-color') },
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-secondary'),
                        callback: (value) => value + '%',
                        font: { family: 'JetBrains Mono, monospace', size: 10 }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-secondary'),
                        font: { family: 'JetBrains Mono, monospace', size: 10 }
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
    
    const transactionsByDate = {};
    AppState.transactions.forEach(t => {
        if (!transactionsByDate[t.date]) transactionsByDate[t.date] = [];
        transactionsByDate[t.date].push(t);
    });
    
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
            
            const dayTransactions = transactionsByDate[dateStr];
            if (dayTransactions) {
                const total = dayTransactions.reduce((sum, t) => sum + t.priceARS, 0);
                const intensity = total / maxDayTotal;
                
                dayDiv.classList.add('has-investment');
                if (intensity < 0.33) dayDiv.classList.add('investment-low');
                else if (intensity < 0.66) dayDiv.classList.add('investment-medium');
                else dayDiv.classList.add('investment-high');
                
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
            <strong>Total del día:</strong> ${formatCurrencyWithLabel(totalDay, 'ARS')}
        </div>
        ${transactions.map(t => `
            <div class="day-transaction">
                <div>
                    <div class="day-transaction-stock">${t.ticker.replace('.BA', '')}</div>
                    <small style="color: var(--text-secondary)">${t.quantity} acciones</small>
                </div>
                <div class="day-transaction-amount">${formatCurrencyWithLabel(t.priceARS, 'ARS')}</div>
            </div>
        `).join('')}
    `;
    
    modal.classList.remove('hidden');
}

function closeDayModal() {
    document.getElementById('day-detail-modal').classList.add('hidden');
}

document.getElementById('day-detail-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'day-detail-modal') closeDayModal();
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

function toggleTransactionsHistory() {
    const historyContent = document.getElementById('transactions-content');
    const icon = document.querySelector('#toggle-history i');
    historyContent.classList.toggle('collapsed');
    icon.classList.toggle('fa-chevron-down');
    icon.classList.toggle('fa-chevron-up');
}

function calculateTotal() {
    const quantity = parseFloat(document.getElementById('quantity').value) || 0;
    const pricePerShare = parseFloat(document.getElementById('price-per-share').value) || 0;
    const exchangeRate = parseFloat(document.getElementById('exchange-rate').value) || 1;
    
    const totalARS = quantity * pricePerShare;
    const totalUSD = exchangeRate > 0 ? totalARS / exchangeRate : 0;
    
    document.getElementById('total-ars').innerHTML = formatCurrencyWithLabel(totalARS, 'ARS');
    document.getElementById('total-usd-calc').innerHTML = `≈ ${formatCurrencyWithLabel(totalUSD, 'USD')}`;
}

// Formatear moneda con etiqueta visible (ARS/USD)
// Formatear número sin símbolo de moneda (ARS)
function formatNumber(value) {
    return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

// Formatear número sin símbolo de moneda (USD)
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
        }).format(Math.abs(value));
        const sign = value < 0 ? '-' : '';
        return `<span class="currency-label">usd</span>${sign}$${formatted}`;
    }
    const formatted = new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.abs(value));
    const sign = value < 0 ? '-' : '';
    return `<span class="currency-label">ars</span>${sign}$${formatted}`;
}

// Formatear moneda sin etiqueta
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
    if (!dateStr) return 'Sin fecha';
    
    try {
        let date;
        if (typeof dateStr === 'object' && dateStr instanceof Date) {
            date = dateStr;
        } else if (typeof dateStr === 'string') {
            if (dateStr.includes('-') && dateStr.length === 10) {
                const parts = dateStr.split('-');
                date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            } else if (dateStr.includes('T')) {
                date = new Date(dateStr);
            } else {
                date = new Date(dateStr);
            }
        } else if (typeof dateStr === 'number') {
            date = new Date(dateStr);
        } else {
            return String(dateStr);
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
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function showHoldingDetail(ticker) {
    const holding = AppState.holdings[ticker];
    if (!holding) return;
    
    const today = new Date().toISOString().split('T')[0];
    const currentUSDRate = getCurrentUSDForDate(today);
    const currentPrice = AppState.currentPrices[ticker]?.price || holding.avgPricePerShare;
    const currentValue = holding.quantity * currentPrice;
    const profit = currentValue - holding.totalInvestedARS;
    const profitUSD = profit / currentUSDRate;
    
    alert(`
Detalle de ${ticker.replace('.BA', '')}

Cantidad: ${holding.quantity.toFixed(2)} acciones
Precio promedio de compra: ${formatCurrency(holding.avgPricePerShare, 'ARS')}
Precio actual: ${formatCurrency(currentPrice, 'ARS')}
Inversión total: ${formatCurrency(holding.totalInvestedARS, 'ARS')}
Valor actual: ${formatCurrency(currentValue, 'ARS')}
Ganancia/Pérdida: ${formatCurrency(profit, 'ARS')} (${formatCurrency(profitUSD, 'USD')})
Transacciones: ${holding.transactions.length}
    `);
}

window.deleteTransaction = deleteTransaction;
window.showHoldingDetail = showHoldingDetail;
window.closeDayModal = closeDayModal;
