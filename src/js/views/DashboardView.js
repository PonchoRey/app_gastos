// Importa el servicio de tema para ajustar los colores de las gráficas según el modo (claro u oscuro)
import themeService from '../services/ThemeService.js';

/**
 * Clase DashboardView
 * Maneja la capa de presentación de la pantalla principal (Dashboard).
 * Actualiza tarjetas de resumen financiero, grafica el estado de gastos y maneja la UI de voz.
 */
class DashboardView {
    /**
     * Constructor de la vista del Dashboard.
     * Vincula los elementos del DOM a propiedades de la clase para acceso rápido.
     */
    constructor() {
        // Elemento que muestra el balance total disponible
        this.totalBalanceEl = document.getElementById('totalBalance');
        // Elemento que muestra la suma total de gastos
        this.totalExpensesEl = document.getElementById('totalExpenses');
        // Elemento que muestra la suma total de ingresos
        this.totalIncomesEl = document.getElementById('totalIncomes');
        // Botones y etiqueta de navegación mensual
        this.prevMonthBtn = document.getElementById('prevMonthBtn');
        this.nextMonthBtn = document.getElementById('nextMonthBtn');
        this.currentMonthLabel = document.getElementById('currentMonthLabel');
        // Contenedor de la lista de gastos agrupados por categoría en el dashboard
        this.dashboardCategoryList = document.getElementById('dashboardCategoryList');

        // Totales por Método de Pago
        this.totalCreditoEl = document.getElementById('totalCredito');
        this.totalDebitoEl = document.getElementById('totalDebito');
        this.totalEfectivoEl = document.getElementById('totalEfectivo');
        this.totalTransferenciaEl = document.getElementById('totalTransferencia');
        
        // Contexto del Canvas para dibujar la gráfica circular de Chart.js
        this.chartCtx = document.getElementById('expensesChart').getContext('2d');
        // Propiedad para almacenar la instancia activa de la gráfica
        this.chart = null;
    }

    /**
     * Enlaza los eventos de navegación de mes (anterior/siguiente).
     * @param {Function} onPrev - Función para retroceder un mes.
     * @param {Function} onNext - Función para avanzar un mes.
     */
    bindMonthNavigation(onPrev, onNext) {
        if (this.prevMonthBtn) {
            this.prevMonthBtn.addEventListener('click', onPrev);
        }
        if (this.nextMonthBtn) {
            this.nextMonthBtn.addEventListener('click', onNext);
        }
    }

    /**
     * Actualiza el texto de la etiqueta del mes en el dashboard.
     * @param {Date} date - La fecha seleccionada actualmente.
     */
    updateMonthLabel(date) {
        if (!this.currentMonthLabel) return;
        
        // Usa Intl.DateTimeFormat para obtener el nombre del mes y el año en español
        const formatter = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
        const formatted = formatter.format(date);
        
        // Capitaliza la primera letra para un look más pulido
        this.currentMonthLabel.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }

    /**
     * Enlaza el clic del botón flotante/principal de grabación de voz con el controlador.
     * @param {Function} handler - Función del controlador que inicia el flujo de voz.
     */
    bindVoiceRecord(handler) {
        // Obtiene el botón de grabar voz
        const btnVoiceRecord = document.getElementById('btnVoiceRecord');
        // Se asegura de que el elemento exista en el DOM antes de asignar el evento
        if (btnVoiceRecord) {
            btnVoiceRecord.addEventListener('click', handler);
        }
    }

    /**
     * Enlaza el clic del botón cancelar dentro de la interfaz de grabación de voz.
     * @param {Function} handler - Función del controlador para abortar grabación.
     */
    bindCancelVoice(handler) {
        // Obtiene el botón de cancelar
        const btnCancelVoice = document.getElementById('btnCancelVoice');
        // Valida existencia del botón
        if (btnCancelVoice) {
            btnCancelVoice.addEventListener('click', handler);
        }
    }

    /**
     * Muestra la interfaz sobrepuesta (overlay) indicando que la app está escuchando.
     */
    showVoiceOverlay() {
        // Referencias a los elementos del modal de voz
        const overlay = document.getElementById('voiceOverlay');
        const title = document.getElementById('voiceOverlayTitle');
        const text = document.getElementById('voiceOverlayText');
        const mic = document.getElementById('voiceMicIconContainer');
        
        // Si el contenedor overlay existe
        if (overlay) {
            // Quita la clase d-none de Bootstrap para hacerlo visible
            overlay.classList.remove('d-none');
            // Cambia explícitamente el display a flex para centrar contenido
            overlay.style.display = 'flex';
            // Actualiza los textos de estado
            if (title) title.textContent = 'Escuchando...';
            if (text) text.textContent = 'Dime qué compraste y cuánto costó';
            // Muestra la animación del micrófono
            if (mic) mic.style.display = 'block';
        }
    }

    /**
     * Cambia el estado visual del overlay indicando que se está enviando el texto a la IA.
     */
    setVoiceOverlayProcessing() {
        // Referencias a los textos e iconos
        const title = document.getElementById('voiceOverlayTitle');
        const text = document.getElementById('voiceOverlayText');
        const mic = document.getElementById('voiceMicIconContainer');
        
        // Cambia el título a un estado de proceso
        if (title) title.textContent = 'Procesando...';
        // Explica qué está haciendo internamente
        if (text) text.textContent = 'Analizando con Inteligencia Artificial';
        // Oculta el micrófono pulsante ya que ya no está escuchando
        if (mic) mic.style.display = 'none';
    }

    /**
     * Oculta por completo la interfaz sobrepuesta de grabación.
     */
    hideVoiceOverlay() {
        const overlay = document.getElementById('voiceOverlay');
        if (overlay) {
            // Vuelve a aplicar la clase d-none
            overlay.classList.add('d-none');
            // Limpia el inline style de display
            overlay.style.display = '';
        }
    }

    /**
     * Renderiza los valores totales financieros en las tarjetas superiores.
     * @param {number} totalBalance - Balance general neto.
     * @param {number} totalIncomes - Suma de ingresos (actualmente mockeada en 0 según reglas de negocio).
     * @param {number} totalExpenses - Suma de gastos en el periodo filtrado.
     */
    renderTotals(totalBalance, totalIncomes, totalExpenses) {
        // Instancia un formateador de números con estilo moneda
        const formatter = new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        });
        
        // Solo actualiza el textContent si el elemento respectivo existe en la vista activa
        if (this.totalBalanceEl) this.totalBalanceEl.textContent = formatter.format(totalBalance);
        if (this.totalIncomesEl) this.totalIncomesEl.textContent = formatter.format(totalIncomes);
        if (this.totalExpensesEl) this.totalExpensesEl.textContent = formatter.format(totalExpenses);
    }

    /**
     * Renderiza los valores totales por método de pago.
     * @param {Object} paymentTotals - Objeto con las sumas (credito, debito, efectivo, transferencia).
     */
    renderPaymentMethodsTotals(paymentTotals) {
        const formatter = new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        });

        if (this.totalCreditoEl) this.totalCreditoEl.textContent = formatter.format(paymentTotals.credito || 0);
        if (this.totalDebitoEl) this.totalDebitoEl.textContent = formatter.format(paymentTotals.debito || 0);
        if (this.totalEfectivoEl) this.totalEfectivoEl.textContent = formatter.format(paymentTotals.efectivo || 0);
        if (this.totalTransferenciaEl) this.totalTransferenciaEl.textContent = formatter.format(paymentTotals.transferencia || 0);
    }

    /**
     * Renderiza la lista inferior del dashboard con los gastos agrupados por categoría.
     * @param {Array} groupedDataArray - Arreglo de objetos agrupados (cada uno con 'category' y 'total').
     */
    renderCategoryList(groupedDataArray) {
        // Limpia el contenedor de la lista
        this.dashboardCategoryList.innerHTML = '';
        
        // Si no hay datos, muestra un "estado vacío" amigable
        if (groupedDataArray.length === 0) {
            this.dashboardCategoryList.innerHTML = `
                <div class="text-center py-5">
                    <!-- Icono representativo semitransparente -->
                    <i class="bi bi-wallet2 text-muted" style="font-size: 3rem; opacity: 0.5;"></i>
                    <p class="mt-3 mb-1 fw-bold" style="color: var(--text-primary);">¡Sin gastos recientes!</p>
                    <p class="small text-muted mb-4">No hay salidas en este periodo.</p>
                </div>
            `;
            return;
        }

        // Formateador de moneda reutilizable
        const formatter = new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        });

        // Recorre cada categoría agrupada para inyectarla como fila en el HTML
        groupedDataArray.forEach((item, index) => {
            // Extrae referencias
            const cat = item.category;
            // Aplica el formato de moneda al total gastado en esta categoría
            const amountFormatted = formatter.format(item.total);
            
            // Crea un contenedor div
            const div = document.createElement('div');
            // Clases de lista y anulación de estilos predeterminados
            div.className = 'list-group-item p-0 border-0';
            div.style.backgroundColor = 'transparent';
            div.style.marginBottom = '8px';
            div.style.cursor = 'pointer'; // Cambia el cursor para denotar interactividad
            
            // Asigna un evento click: Navega hacia la vista detallada específica de esta categoría
            div.onclick = () => {
                if(window.app && window.app.navigate) {
                    // Llama al router expuesto globalmente pasándole el nombre de la sección y el parámetro del id
                    window.app.navigate('category-details-view', cat.id);
                }
            };

            // Establece un color de fondo alternado para las filas (efecto cebra)
            const bgColor = index % 2 === 0 ? 'var(--bg-table-row-even)' : 'var(--bg-table-row-odd)';
            
            // Define el HTML interno de cada bloque
            div.innerHTML = `
                <div class="d-flex justify-content-between align-items-center p-3 rounded table-custom-row" style="background-color: ${bgColor}; border: 1px solid var(--border-table);">
                    <div class="d-flex align-items-center position-relative w-100">
                        <!-- Pequeña barra izquierda coloreada -->
                        <div style="position: absolute; left: -16px; top: 10%; bottom: 10%; width: 3px; background-color: ${cat.color}; border-radius: 0 4px 4px 0;"></div>
                        
                        <!-- Círculo de fondo con color suave (hex + 20% alpha) conteniendo el emoji -->
                        <div class="d-flex justify-content-center align-items-center me-3" style="width: 40px; height: 40px; border-radius: 50%; background-color: ${cat.color}20;">
                            <span class="fs-4">${cat.icon}</span>
                        </div>
                        
                        <div class="flex-grow-1">
                            <!-- Título de la categoría -->
                            <h6 class="mb-0 fw-bold" style="color: var(--text-table-body); font-size: 0.95rem;">${cat.name}</h6>
                        </div>
                        <div class="text-end d-flex align-items-center">
                            <!-- Monto y chevrón indicador de navegabilidad -->
                            <span style="color: var(--text-primary); font-size: 0.95rem; font-weight: 600;" class="me-2">${amountFormatted}</span>
                            <i class="bi bi-chevron-right text-muted small"></i>
                        </div>
                    </div>
                </div>
            `;
            // Añade el elemento montado al DOM
            this.dashboardCategoryList.appendChild(div);
        });
    }

    /**
     * Renderiza la gráfica de dona central (Doughnut Chart).
     * @param {Object} chartData - Objeto que contiene las 'labels' (etiquetas), 'values' (valores) y 'colors' (colores HEX).
     * @param {number} totalAmount - Monto numérico total a pintar en el centro de la dona.
     */
    renderChart(chartData, totalAmount) {
        // Destruye gráfica anterior para redibujar limpiamente sin solapamientos
        if (this.chart) {
            this.chart.destroy();
        }

        // Determina color dinámicamente desde CSS para soportar temas custom
        const rootStyle = getComputedStyle(document.documentElement);
        const textColor = rootStyle.getPropertyValue('--text-primary').trim() || '#F5F5F5';

        // Formatea el monto a mostrar en el centro del anillo
        const formatter = new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        });
        const totalFormatted = formatter.format(totalAmount);

        // Plugin de extensión personalizado para Chart.js que dibuja un texto dinámico en el hueco (centro) de la dona
        const centerTextPlugin = {
            id: 'centerText',
            beforeDraw: function(chart) {
                // Solo actúa si el gráfico es de tipo 'doughnut'
                if (chart.config.type !== 'doughnut') return;
                // Obtiene dimensiones del canvas y su contexto
                var width = chart.width,
                    height = chart.height,
                    ctx = chart.ctx;

                ctx.restore();
                // Calcula el tamaño de la fuente basado en la altura del gráfico
                var fontSize = (height / 114).toFixed(2);
                ctx.font = "bold " + fontSize + "em Inter"; // Usa tipografía moderna y negrita
                ctx.textBaseline = "middle"; // Base vertical en el centro
                ctx.fillStyle = textColor; // Pinta del color del tema activo

                // Variables de cálculo para el texto y las coordenadas X e Y
                var text = totalFormatted,
                    // Calcula 'X' midiendo el ancho del texto para centrarlo exactamente en el ancho total del gráfico
                    textX = Math.round((width - ctx.measureText(text).width) / 2),
                    // Centra en el eje Y
                    textY = height / 2;

                // Dibuja el texto
                ctx.fillText(text, textX, textY);
                ctx.save();
            }
        };

        // Crea la instancia principal del Doughnut Chart
        this.chart = new Chart(this.chartCtx, {
            type: 'doughnut',
            data: {
                labels: chartData.labels, // Nombres de categorías para el tooltip
                datasets: [{
                    data: chartData.values, // Porcentajes o montos directos
                    backgroundColor: chartData.colors, // Colores correspondientes a cada trozo
                    borderWidth: 0, // Sin separación entre porciones para estilo flat moderno
                    hoverOffset: 4 // Efecto expansivo al pasar el cursor
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                // 'cutout' define el grosor del anillo; 80% deja un anillo delgado elegante y espacio para el texto
                cutout: '80%', 
                plugins: {
                    legend: {
                        // Se oculta la leyenda tradicional de ChartJS ya que tenemos la lista detallada debajo
                        display: false 
                    }
                }
            },
            // Registra localmente el plugin creado arriba
            plugins: [centerTextPlugin]
        });
    }
}

export default DashboardView;
