# 💎 Wealth Portfolio - Guía de Instalación Completa

Una elegante aplicación web para gestionar tu portafolio de inversiones con diseño minimalista tipo mármol.

## 📋 Índice
1. [Estructura del Proyecto](#estructura-del-proyecto)
2. [Paso 1: Configurar Google Sheets](#paso-1-configurar-google-sheets)
3. [Paso 2: Configurar Google Apps Script](#paso-2-configurar-google-apps-script)
4. [Paso 3: Subir a GitHub](#paso-3-subir-a-github)
5. [Paso 4: Activar GitHub Pages](#paso-4-activar-github-pages)
6. [Uso de la Aplicación](#uso-de-la-aplicación)
7. [Modo Demo](#modo-demo)

---

## 📁 Estructura del Proyecto

```
finance-tracker/
├── index.html          # Página principal
├── styles.css          # Estilos (temas claro/oscuro)
├── config.js           # Configuración (URL del script)
├── app.js              # Lógica de la aplicación
├── google-apps-script.js # Código para Google Sheets (NO subir a GitHub)
└── README.md           # Este archivo
```

---

## 📊 Paso 1: Configurar Google Sheets

### 1.1 Crear la Hoja de Cálculo

1. Ve a [Google Sheets](https://docs.google.com/spreadsheets)
2. Crea una nueva hoja de cálculo
3. Nómbrala: **"WealthPortfolio_DB"**

### 1.2 Crear las Pestañas (Hojas)

Necesitas crear **2 pestañas** con estos nombres EXACTOS:

#### Pestaña 1: `usuarios`
Encabezados en la fila 1:
| A | B | C | D |
|---|---|---|---|
| email | password | name | createdAt |

#### Pestaña 2: `transacciones`
Encabezados en la fila 1:
| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| id | userId | ticker | tickerName | date | quantity | priceARS | exchangeRate | priceUSD |

### 1.3 Estructura Visual

```
📊 WealthPortfolio_DB
├── 📑 usuarios
│   └── email | password | name | createdAt
└── 📑 transacciones
    └── id | userId | ticker | tickerName | date | quantity | priceARS | exchangeRate | priceUSD
```

---

## ⚙️ Paso 2: Configurar Google Apps Script

### 2.1 Abrir el Editor de Scripts

1. En tu hoja de Google Sheets, ve a: **Extensiones → Apps Script**
2. Se abrirá una nueva pestaña con el editor de código

### 2.2 Agregar el Código

1. **Borra** todo el código existente en el editor
2. **Copia** todo el contenido del archivo `google-apps-script.js`
3. **Pega** el código en el editor
4. Guarda el proyecto: **Ctrl+S** o **Archivo → Guardar**
5. Nombra el proyecto: "WealthPortfolio Backend"

### 2.3 Publicar como Aplicación Web

1. Click en **"Implementar"** (botón azul arriba a la derecha)
2. Selecciona **"Nueva implementación"**
3. Click en el ícono de engranaje ⚙️ junto a "Seleccionar tipo"
4. Elige **"Aplicación web"**
5. Configura así:
   - **Descripción**: "Wealth Portfolio API"
   - **Ejecutar como**: "Yo (tu email)"
   - **Quién tiene acceso**: "Cualquier persona"
6. Click en **"Implementar"**
7. **¡IMPORTANTE!** Aparecerá una pantalla de autorización:
   - Click en "Autorizar acceso"
   - Selecciona tu cuenta de Google
   - Click en "Avanzado" → "Ir a WealthPortfolio Backend"
   - Click en "Permitir"
8. **Copia la URL** que aparece (será algo como):
   ```
   https://script.google.com/macros/s/AKfycbx...largo.../exec
   ```

### 2.4 Configurar la URL en tu Proyecto

1. Abre el archivo `config.js`
2. Reemplaza `'TU_URL_DEL_SCRIPT_AQUI'` con tu URL:

```javascript
const CONFIG = {
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbx.../exec',
    // ... resto de la configuración
};
```

---

## 🐙 Paso 3: Subir a GitHub

### 3.1 Crear Cuenta y Repositorio

1. Si no tienes cuenta, créala en [GitHub](https://github.com)
2. Una vez logueado, click en **"+"** (arriba a la derecha) → **"New repository"**
3. Configura:
   - **Repository name**: `wealth-portfolio` (o el nombre que quieras)
   - **Description**: "Mi portafolio de inversiones"
   - **Public**: ✅ (debe ser público para GitHub Pages gratuito)
   - **Add a README**: ❌ No marcar (ya tenemos uno)
4. Click en **"Create repository"**

### 3.2 Subir los Archivos

#### Opción A: Desde la Web (Más fácil)

1. En tu repositorio vacío, click en **"uploading an existing file"**
2. Arrastra estos archivos:
   - `index.html`
   - `styles.css`
   - `config.js` (con tu URL ya configurada)
   - `app.js`
   - `README.md` (opcional)
3. **NO subas** `google-apps-script.js` (ya está en Google)
4. En "Commit changes", escribe: "Initial commit"
5. Click en **"Commit changes"**

#### Opción B: Usando Git (Para usuarios avanzados)

```bash
# En tu terminal, dentro de la carpeta finance-tracker:
git init
git add index.html styles.css config.js app.js README.md
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/wealth-portfolio.git
git push -u origin main
```

---

## 🌐 Paso 4: Activar GitHub Pages

### 4.1 Configurar GitHub Pages

1. En tu repositorio, ve a **"Settings"** (pestaña arriba)
2. En el menú lateral izquierdo, busca **"Pages"**
3. En **"Source"**, selecciona:
   - **Branch**: `main`
   - **Folder**: `/ (root)`
4. Click en **"Save"**

### 4.2 Obtener tu URL

1. Espera 1-2 minutos
2. Refresca la página de Settings → Pages
3. Verás un mensaje verde con tu URL:
   ```
   ✅ Your site is live at https://TU_USUARIO.github.io/wealth-portfolio/
   ```

### 4.3 ¡Listo!

Tu página está disponible en:
```
https://TU_USUARIO.github.io/wealth-portfolio/
```

Puedes acceder desde cualquier dispositivo con internet.

---

## 📱 Uso de la Aplicación

### Registro e Inicio de Sesión

1. Al entrar, verás la pantalla de login
2. Click en "Registrarse" para crear una cuenta
3. Ingresa nombre, email y contraseña
4. Los datos se guardan en tu Google Sheet

### Agregar Compras

1. Despliega el formulario "Nueva Compra"
2. Selecciona la acción del desplegable
3. Elige la fecha de compra
4. Ingresa cantidad de acciones
5. Ingresa el total pagado en pesos
6. Ingresa la cotización del dólar de ese día
7. El equivalente en USD se calcula automáticamente
8. Click en "Guardar Compra"

### Ver tu Portfolio

- **Resumen**: Patrimonio total, ganancias/pérdidas
- **Gráfico de Torta**: Distribución de tu portfolio
- **Gráfico de Barras**: Rendimiento por acción
- **Tabla de Tenencias**: Detalle de cada acción
- **Historial**: Todas tus transacciones
- **Calendario**: Visualiza tus días de inversión

### Cambiar Tema

- Click en el ícono 🌙/☀️ en el header
- Alterna entre mármol blanco (claro) y mármol negro (oscuro)

---

## 🎮 Modo Demo

Si quieres probar sin configurar Google Sheets:

1. Abre `config.js`
2. Cambia `DEMO_MODE: false` a `DEMO_MODE: true`
3. Usa las credenciales demo:
   - Email: `demo@demo.com`
   - Password: `demo123`

---

## 🔧 Solución de Problemas

### "Error de conexión"
- Verifica que la URL en `config.js` sea correcta
- Asegúrate de que el Apps Script esté desplegado como "Cualquier persona"

### "No se cargan los precios"
- GOOGLEFINANCE puede tener delay
- Verifica que las fórmulas funcionen en tu hoja de cálculo

### "La página no carga en GitHub Pages"
- Espera unos minutos después de activar Pages
- Verifica que `index.html` esté en la raíz del repositorio
- Revisa que el repositorio sea público

### "No puedo registrarme"
- Verifica que la hoja "usuarios" exista con los encabezados correctos
- Revisa los permisos del Apps Script

---

## 📝 Notas Importantes

1. **Seguridad**: Las contraseñas se guardan en texto plano en Google Sheets. Para uso personal está bien, pero no uses contraseñas importantes.

2. **Precios**: GOOGLEFINANCE tiene un delay de ~15 minutos. Para precios en tiempo real necesitarías una API premium.

3. **Límites de GitHub Pages**: 
   - 1GB de almacenamiento
   - 100GB de ancho de banda/mes
   - Más que suficiente para uso personal

4. **Backups**: Google Sheets guarda automáticamente historial de cambios.

---

## 🎨 Personalización

### Cambiar Colores
En `styles.css`, modifica las variables CSS:
```css
:root {
    --gold: #C9A962;      /* Color dorado principal */
    --gold-light: #E5D4A1;
    --gold-dark: #A88B4A;
}
```

### Agregar Más Acciones
En `index.html`, busca el `<select id="stock-select">` y agrega opciones:
```html
<option value="NUEVO.BA">NUEVO - Nombre de la Acción</option>
```

---

## 📞 Soporte

Si tienes problemas, revisa:
1. La consola del navegador (F12 → Console)
2. Los logs de Apps Script (Ver → Ejecuciones)
3. Que todos los nombres de hojas coincidan exactamente

¡Disfruta gestionando tu patrimonio con elegancia! 💎
