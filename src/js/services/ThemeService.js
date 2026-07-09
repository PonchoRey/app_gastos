/**
 * Clase ThemeService
 * Administra el estado del tema visual de la aplicación (Modo Claro vs Modo Oscuro).
 * Se encarga de aplicar las clases CSS necesarias en el DOM y persistir la preferencia en localStorage.
 */
class ThemeService {
    /**
     * Constructor del servicio.
     * Recupera el tema guardado anteriormente por el usuario, o asigna el claro por defecto.
     */
    constructor() {
        // Define la clave bajo la cual se guardará la preferencia del tema en el localStorage
        this.themeKey = 'app_gastos_theme';
        // Bloque try/catch por si el navegador bloquea el acceso a localStorage (ej. navegación privada estricta)
        try {
            // Intenta leer el tema desde localStorage; si es nulo, asigna 'dark' por defecto
            this.currentTheme = localStorage.getItem(this.themeKey) || 'dark';
        } catch (e) {
            // En caso de error de acceso al localStorage, usa 'dark' como fallback (respaldo)
            this.currentTheme = 'dark';
        }
        // Llama a inicializar para aplicar el tema detectado apenas carga la app
        this.init();
    }

    /**
     * Inicializa y aplica el tema actual a la interfaz.
     */
    init() {
        // Ejecuta la función principal pasándole el tema recuperado
        this.applyTheme(this.currentTheme);
    }

    /**
     * Alterna (hace toggle) entre el modo oscuro y personalizado.
     */
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'custom' : 'dark';
        try {
            localStorage.setItem(this.themeKey, this.currentTheme);
        } catch (e) {
            console.warn('Could not save theme to localStorage');
        }
        this.applyTheme(this.currentTheme);
    }

    /**
     * Aplica el atributo específico al elemento raíz del documento y variables CSS si es custom.
     * @param {string} theme - 'dark' o 'custom'.
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-bs-theme', 'dark'); // Siempre usamos la base oscura

        if (theme === 'dark') {
            // Limpia los estilos custom para volver al predeterminado
            const customVars = [
                '--primary-accent', '--bg-color', '--bg-surface', '--text-primary', '--nav-bg', '--danger-accent',
                '--success-accent', '--accent-warning', '--text-secondary', '--border-table', '--bg-table'
            ];
            customVars.forEach(v => document.documentElement.style.removeProperty(v));
        } else {
            // Aplica los custom
            try {
                const advThemeRaw = localStorage.getItem('app_gastos_advanced_theme');
                if (advThemeRaw) {
                    const advTheme = JSON.parse(advThemeRaw);
                    for (const key in advTheme) {
                        if (advTheme[key]) {
                            document.documentElement.style.setProperty(key, advTheme[key]);
                        }
                    }
                }
            } catch (e) {}
        }
    }
}

// Se exporta la instancia del servicio usando el patrón Singleton
const themeService = new ThemeService();
export default themeService;
