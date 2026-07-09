import themeService from '../services/ThemeService.js';

export default class SettingsController {
    constructor() {
        this.apiKeyInput = document.getElementById('settingApiKey');
        this.toggleApiBtn = document.getElementById('toggleApiVisibilityBtn');
        this.lockSwitch = document.getElementById('lockSettingsSwitch');
        this.saveBtn = document.getElementById('saveSettingsBtn');
        this.resetBtn = document.getElementById('resetColorsBtn');
        
        this.colorInputs = [
            document.getElementById('colorPrimaryAccent'),
            document.getElementById('colorBgColor'),
            document.getElementById('colorBgSurface'),
            document.getElementById('colorTextPrimary'),
            document.getElementById('colorNavBg'),
            document.getElementById('colorDangerAccent'),
            document.getElementById('colorSuccessAccent'),
            document.getElementById('colorWarningAccent'),
            document.getElementById('colorTextSecondary'),
            document.getElementById('colorBorderTable'),
            document.getElementById('colorBgTable')
        ];

        this.defaultColors = {
            '--primary-accent': '#5B5FC7',
            '--bg-color': '#201F1F',
            '--bg-surface': '#292929',
            '--text-primary': '#FFFFFF',
            '--nav-bg': 'rgba(32, 31, 31, 0.85)',
            '--danger-accent': '#C4314B',
            '--success-accent': '#13A10E',
            '--accent-warning': '#E6A23C',
            '--text-secondary': '#D1D1D1',
            '--border-table': '#363637',
            '--bg-table': '#141414'
        };

        this.init();
    }

    init() {
        this.loadCurrentSettings();
        this.bindEvents();
    }

    loadCurrentSettings() {
        // Cargar API Key
        const currentKey = localStorage.getItem('gemini_api_key') || '';
        if (this.apiKeyInput) {
            this.apiKeyInput.value = currentKey;
        }

        // Cargar Colores (leer el root style si está inyectado o el localStorage)
        const advThemeRaw = localStorage.getItem('app_gastos_advanced_theme');
        let advTheme = advThemeRaw ? JSON.parse(advThemeRaw) : {};

        this.colorInputs.forEach(input => {
            if (!input) return;
            const varName = input.getAttribute('data-var');
            // Si existe en json usarlo, sino tratar de leer de styles computed o usar default
            let val = advTheme[varName];
            if (!val) {
                // Obtener valor actual
                val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
            }
            
            // Si el valor viene como rgb() o rgba(), convertirlo a HEX para el input de color
            // Es un paso complejo, así que si falla, aplicamos el default del tema oscuro
            if (val && val.startsWith('#') && val.length === 7) {
                input.value = val;
            } else if (this.defaultColors[varName]) {
                // Si está en rgba o similar, solo usamos el valor por defecto para el input por simplicidad
                // o si es la barra nav-bg no se puede pasar directo, forzaremos defaults en el input
                input.value = this.defaultColors[varName].startsWith('#') ? this.defaultColors[varName] : '#201f1f';
            }
        });
    }

    bindEvents() {
        if (this.lockSwitch) {
            this.lockSwitch.addEventListener('change', (e) => {
                const isLocked = !e.target.checked;
                this.toggleLockState(isLocked);
            });
        }

        if (this.toggleApiBtn && this.apiKeyInput) {
            this.toggleApiBtn.addEventListener('click', () => {
                const type = this.apiKeyInput.type === 'password' ? 'text' : 'password';
                this.apiKeyInput.type = type;
                this.toggleApiBtn.classList.toggle('bi-eye');
                this.toggleApiBtn.classList.toggle('bi-eye-slash');
            });
        }

        // Aplicar preview en vivo de colores y auto-guardar
        this.colorInputs.forEach(input => {
            if (!input) return;
            input.addEventListener('input', (e) => {
                const varName = e.target.getAttribute('data-var');
                const val = e.target.value;
                document.documentElement.style.setProperty(varName, val);
                
                // Auto-guardar en localStorage para no perder el perfil
                const advThemeRaw = localStorage.getItem('app_gastos_advanced_theme');
                let advTheme = advThemeRaw ? JSON.parse(advThemeRaw) : {};
                advTheme[varName] = val;
                localStorage.setItem('app_gastos_advanced_theme', JSON.stringify(advTheme));
                
                // Si cambiamos un color, implícitamente queremos estar en modo custom
                if (themeService.currentTheme !== 'custom') {
                    themeService.currentTheme = 'custom';
                    localStorage.setItem(themeService.themeKey, 'custom');
                    const themeBtnIcon = document.querySelector('#themeToggleBtn i');
                    if (themeBtnIcon) themeBtnIcon.className = 'bi bi-palette fs-5';
                }
            });
        });

        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => {
                if (confirm('¿Estás seguro de restablecer todos los colores a los valores por defecto?')) {
                    this.resetColors();
                }
            });
        }

        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }
    }

    toggleLockState(isLocked) {
        document.querySelectorAll('.lockable-setting').forEach(el => {
            el.disabled = isLocked;
        });

        if (this.toggleApiBtn) {
            this.toggleApiBtn.style.display = isLocked ? 'none' : 'block';
            if (isLocked && this.apiKeyInput) {
                this.apiKeyInput.type = 'password';
                this.toggleApiBtn.classList.add('bi-eye');
                this.toggleApiBtn.classList.remove('bi-eye-slash');
            }
        }
    }

    resetColors() {
        localStorage.removeItem('app_gastos_advanced_theme');
        for (const [key, val] of Object.entries(this.defaultColors)) {
            document.documentElement.style.setProperty(key, val);
        }
        this.loadCurrentSettings(); // Recargar inputs
        if (window.app) {
            window.app.showToast('Colores restablecidos a valores de fábrica');
        }
    }

    saveSettings() {
        // Guardar API Key
        if (this.apiKeyInput) {
            const key = this.apiKeyInput.value.trim();
            if (key.length > 0) {
                localStorage.setItem('gemini_api_key', key);
            } else {
                localStorage.removeItem('gemini_api_key');
            }
        }

        // Guardar Colores
        const advTheme = {};
        this.colorInputs.forEach(input => {
            if (!input) return;
            const varName = input.getAttribute('data-var');
            const val = input.value;
            advTheme[varName] = val;
        });
        localStorage.setItem('app_gastos_advanced_theme', JSON.stringify(advTheme));

        // Forzar al sistema a modo 'custom' para que no se pierdan al navegar
        themeService.currentTheme = 'custom';
        localStorage.setItem(themeService.themeKey, 'custom');
        themeService.applyTheme('custom');
        
        // Actualizar el icono del tema en la UI si existe la funcion en app.js
        if (window.app && typeof window.app.updateThemeIcon === 'function') {
            window.app.updateThemeIcon();
        }

        // Cerrar candado y bloquear
        if (this.lockSwitch) {
            this.lockSwitch.checked = false;
            this.toggleLockState(true);
        }

        if (window.app) {
            window.app.showToast('Configuraciones guardadas exitosamente');
            // Opcionalmente recargar dashboards para aplicar colores a los canvas
            if (window.app.dashboardController) {
                const currentFilter = document.getElementById('timeFilter') ? document.getElementById('timeFilter').value : 'month';
                window.app.dashboardController.loadDashboardData(currentFilter).catch(console.error);
            }
        }
    }
}
