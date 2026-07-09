// Importa el Web Component de Capacitor-SQLite para que funcione la base de datos local en entornos de navegador (PWA/Web)
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
// Inicializa el componente custom a nivel global
jeepSqlite(window);

// Importa los servicios básicos: Acceso a datos y gestor de temas visuales
import dbService from './services/DatabaseService.js';
import themeService from './services/ThemeService.js';

// Importa todos los controladores que orquestarán las distintas pantallas de la aplicación
import CategoryController from './controllers/CategoryController.js';
import ExpenseController from './controllers/ExpenseController.js';
import DashboardController from './controllers/DashboardController.js';
import TransactionController from './controllers/TransactionController.js';
import CategoryDetailsController from './controllers/CategoryDetailsController.js';
import SettingsController from './controllers/SettingsController.js';

/**
 * Clase App
 * Es el núcleo (Core) de la aplicación.
 * Maneja la inicialización de la base de datos, el instanciamiento de los controladores (patrón Singleton o Root),
 * el enrutamiento (navegación entre pantallas) y utilidades globales como las notificaciones (Toasts).
 */
class App {
    /**
     * Constructor principal.
     */
    constructor() {
        // Verifica si el DOM (Document Object Model) aún se está cargando
        if (document.readyState === 'loading') {
            // Si está cargando, espera el evento DOMContentLoaded para inicializar la app de forma segura
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            // Si ya cargó completamente, arranca la inicialización inmediatamente
            this.init();
        }
    }

    /**
     * Proceso asíncrono de inicialización principal.
     */
    async init() {
        try {
            // 1. Inicializar Base de Datos (crea archivo, tablas y siembra datos iniciales si hace falta)
            await dbService.init();
            
            // 2. Configurar la UI base (botones de cambio de tema claro/oscuro)
            this.setupThemeToggle();
            
            // 3. Inicializar Controladores
            // Se guardan en propiedades de la instancia App para poder ser accesibles globalmente entre ellos
            this.categoryController = new CategoryController();
            this.expenseController = new ExpenseController();
            this.dashboardController = new DashboardController();
            this.transactionController = new TransactionController();
            this.categoryDetailsController = new CategoryDetailsController();
            this.settingsController = new SettingsController();

            // 4. Configurar el sistema de enrutamiento/navegación simple
            this.setupNavigation();
            
            // 5. Carga de datos iniciales en memoria y vistas
            // Obliga a que al abrir la app, las categorías existan en el sistema
            await this.categoryController.loadCategories();
            // Pre-carga el select de categorías en el formulario oculto por si el usuario presiona "Agregar" rápido
            await this.expenseController.loadCategoriesForSelect();
            // Carga los cálculos y gráficas de la pantalla principal
            await this.dashboardController.loadDashboardData();
            
            console.log("App inicializada correctamente");
        } catch (error) {
            // Atrapa errores críticos de inicialización (ej. SQLite corrupto)
            console.error("Error inicializando la app:", error);
        }
    }

    /**
     * Despliega un mensaje flotante (Toast) en la pantalla.
     * @param {string} message - Texto a mostrar.
     * @param {string} type - Tipo de alerta para el color (success, danger, warning).
     */
    showToast(message, type = 'success') {
        const toastEl = document.getElementById('appToast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toastEl && toastMessage) {
            // Sobrescribe las clases inyectando el color según el 'type' de Bootstrap (bg-success, bg-danger)
            toastEl.className = `toast align-items-center text-white border-0 bg-${type}`;
            // Asigna el mensaje de texto
            toastMessage.textContent = message;
            
            // Instancia el componente Toast de Bootstrap, configurando el tiempo de desaparición a 3 segundos (3000ms)
            const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
            toast.show();
        }
    }

    /**
     * Configura el comportamiento del botón de alternar tema.
     */
    setupThemeToggle() {
        const themeBtn = document.getElementById('themeToggleBtn');
        const icon = themeBtn.querySelector('i');
        
        // Ajustar el icono inicial según la preferencia guardada
        if (themeService.currentTheme === 'custom') {
            // Si es custom, mostramos paleta
            icon.className = 'bi bi-palette fs-5';
        } else {
            // Si es oscuro (por defecto), mostramos la luna
            icon.className = 'bi bi-moon-stars fs-5';
        }

        // Asigna el evento click al botón de la navbar superior
        themeBtn.onclick = (e) => {
            // Previene recargas si es un tag <a>
            e.preventDefault();
            // Pide al servicio que cambie el tema en localStorage y CSS
            themeService.toggleTheme();
            
            // Alterna el icono visualmente después del clic
            if (themeService.currentTheme === 'custom') {
                icon.className = 'bi bi-palette fs-5';
            } else {
                icon.className = 'bi bi-moon-stars fs-5';
            }
            
            // Recargar gráficos para actualizar colores de fuente/grid dinámicamente sin requerir F5
            if(this.dashboardController) {
                try {
                    // Fuerza recarga del dashboard
                    this.dashboardController.loadDashboardData().catch(err => console.error("Chart reload error", err));
                    
                    // Si estamos en la vista detallada de una categoría, también necesitamos repintar esa gráfica
                    const catView = document.getElementById('category-details-view');
                    // Comprueba que el panel no esté oculto (.d-none) y que haya una categoría cargada
                    if (catView && !catView.classList.contains('d-none') && this.categoryDetailsController.currentCategoryId) {
                        this.categoryDetailsController.loadCategoryData(this.categoryDetailsController.currentCategoryId, currentFilter);
                    }
                } catch (e) {
                    console.error("Error toggling dashboard data", e);
                }
            }
        };
    }

    /**
     * Setup básico para la navegación. (Actualmente vacío porque el evento se inyecta directamente
     * en el HTML como onclick="app.navigate('x')")
     */
    setupNavigation() {
        // The HTML already has onclick="app.navigate('...')" 
        // We just define the function below
    }

    /**
     * Sistema de enrutamiento (Router) basado en clases CSS para crear una SPA (Single Page Application).
     * Oculta todas las "pantallas" y solo muestra la solicitada.
     * @param {string} viewId - ID del elemento HTML que funciona como contenedor principal de la vista.
     * @param {any} param - Parámetro opcional para vistas dinámicas (ej: el ID de la categoría a mostrar).
     */
    navigate(viewId, param = null) {
        // Ocultar todas las vistas iterando sobre cualquier elemento que tenga la clase '.view-section'
        document.querySelectorAll('.view-section').forEach(view => {
            // 'd-none' es la clase de Bootstrap para 'display: none'
            view.classList.add('d-none');
        });
        
        // Mostrar la vista solicitada (si existe en el DOM)
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.remove('d-none');
        } else {
            console.warn(`Vista no encontrada: ${viewId}`);
            // Fallback: Si se intenta ir a una ruta inexistente, fuerza el regreso al inicio
            document.getElementById('dashboard-view').classList.remove('d-none');
        }

        // Actualizar UI del menú de navegación inferior (Bottom Nav)
        document.querySelectorAll('.btn-nav').forEach(item => {
            // Remueve la clase 'active' de todos los iconos
            item.classList.remove('active');
            // Si el atributo data-target de este icono coincide con la vista actual, lo marca como activo
            if (item.getAttribute('data-target') === viewId) {
                item.classList.add('active');
            }
        });
        
        // Refrescar datos automáticamente según la vista a la que acabamos de entrar
        // Esto asegura que la data siempre esté actualizada
        if (viewId === 'dashboard-view') {
            this.dashboardController.loadDashboardData();
        } else if (viewId === 'categories-view') {
            this.categoryController.loadCategories();
        } else if (viewId === 'transactions-view') {
            this.transactionController.loadTransactions();
        } else if (viewId === 'add-expense-view' && this.expenseController) {
            this.expenseController.loadCategoriesForSelect();
        } else if (viewId === 'category-details-view' && param) {
            this.categoryDetailsController.loadCategoryData(param);
        } else if (viewId === 'settings-view') {
            if (this.settingsController) {
                this.settingsController.loadCurrentSettings();
                this.settingsController.toggleLockState(true); // Siempre bloqueado al entrar por seguridad
                const lockSwitch = document.getElementById('lockSettingsSwitch');
                if (lockSwitch) lockSwitch.checked = false;
            }
        }
    }
}

// Inicializa una instancia de la App y la expone (monta) en el objeto global 'window'
// Esto es requerido en este proyecto de Vanilla JS para que el HTML pueda llamar a funciones
// como "app.navigate(...)" o "app.showToast(...)" directamente.
window.app = new App();
