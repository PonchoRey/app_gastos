// Importa el servicio de temas para conocer el tema actual (claro/oscuro) y ajustar colores en las gráficas
import themeService from '../services/ThemeService.js';

/**
 * Clase CategoryDetailsView
 * Maneja la interfaz de usuario para la pantalla de "Detalles de Categoría", 
 * donde se muestra el historial específico de una categoría y su gráfica de gastos.
 */
class CategoryDetailsView {
    /**
     * Constructor de la vista.
     * Enlaza los elementos del DOM (HTML) a propiedades de la clase para manipularlos fácilmente.
     */
    constructor() {
        // Elemento para el título (nombre de la categoría)
        this.titleEl = document.getElementById('catDetailsTitle');
        // Elemento para mostrar el icono/emoji de la categoría
        this.iconEl = document.getElementById('catDetailsIcon');
        // Elemento para mostrar la suma total gastada en esta categoría
        this.totalEl = document.getElementById('catDetailsTotal');
        // Contenedor (lista) donde se inyectarán las filas de transacciones
        this.transactionsList = document.getElementById('categoryTransactionsList');
        
        // Contexto 2D del elemento <canvas> usado para dibujar la gráfica con Chart.js
        this.chartCtx = document.getElementById('categoryLineChart').getContext('2d');
        // Referencia a la instancia de la gráfica (para poder destruirla y redibujarla)
        this.chart = null;
    }

    /**
     * Renderiza la cabecera de la vista con los datos de la categoría y el total.
     * @param {Object} category - Objeto con los datos de la categoría (nombre, icono, color).
     * @param {number} total - La suma total de los gastos.
     */
    renderHeader(category, total) {
        // Asigna el nombre de la categoría al elemento de texto
        this.titleEl.textContent = category.name;
        // Asigna el icono (emoji)
        this.iconEl.textContent = category.icon;
        // Aplica el color de la categoría como fondo del icono, agregando '20' al final del HEX para darle transparencia (alpha)
        this.iconEl.style.backgroundColor = category.color + '20';
        
        // Configura un formateador nativo de JavaScript para mostrar moneda (Pesos Mexicanos)
        const formatter = new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        });
        // Formatea el número total y lo inserta en el DOM
        this.totalEl.textContent = formatter.format(total);
    }

    /**
     * Renderiza la lista de transacciones (gastos) que pertenecen a esta categoría o sus subcategorías.
     * @param {Array} transactions - Lista de objetos de gastos.
     * @param {Array} subcategories - Lista de subcategorías que pertenecen a la categoría principal.
     * @param {Object} mainCategory - La categoría principal actual.
     */
    renderTransactions(transactions, subcategories, mainCategory) {
        // Limpia cualquier contenido previo en la lista para evitar duplicados
        this.transactionsList.innerHTML = '';
        
        // Si no hay transacciones, renderiza un "Empty State" (estado vacío) amigable
        if (transactions.length === 0) {
            this.transactionsList.innerHTML = `
                <div class="text-center py-5">
                    <p class="small text-muted mb-4">No hay transacciones en este periodo.</p>
                </div>
            `;
            // Termina la ejecución de la función
            return;
        }

        // Ordena las transacciones por fecha de manera descendente (las más recientes primero)
        const sorted = transactions.sort((a, b) => new Date(b.date_recorded) - new Date(a.date_recorded));
        
        // Itera sobre cada transacción ordenada para generar su HTML
        sorted.forEach((tx, index) => {
            // Por defecto, asumimos que el gasto pertenece a la categoría principal
            let cat = mainCategory;
            // Si el ID de la categoría del gasto no es el de la principal, debe ser de una subcategoría
            if (tx.category_id !== mainCategory.id) {
                // Busca la subcategoría en el arreglo; si no la halla (caso raro), usa la principal de respaldo
                cat = subcategories.find(c => c.id === tx.category_id) || mainCategory;
            }

            // Formatea la fecha del registro (ej: "oct 5, 14:30")
            const date = new Date(tx.date_recorded).toLocaleDateString('es-MX', {
                month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
            });
            
            // Formatea el monto con 2 decimales para la lista
            const amountFormatted = parseFloat(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            // Crea un contenedor div principal para el ítem de la lista
            const item = document.createElement('div');
            // Aplica clases de Bootstrap (list-group-item) y utilidades
            item.className = 'list-group-item p-0 border-0';
            // Quita el fondo por defecto del list-group-item
            item.style.backgroundColor = 'transparent';
            // Añade un margen inferior para separar los elementos
            item.style.marginBottom = '8px';
            
            // Alterna el color de fondo de las filas dependiendo de si el índice es par o impar (efecto cebra) usando variables CSS
            const bgColor = index % 2 === 0 ? 'var(--bg-table-row-even)' : 'var(--bg-table-row-odd)';
            
            // Construye el HTML interno de la fila usando template literals
            // NOTA: Se respeta la directriz de no usar <table> y usar divs flexibles (.table-custom-row)
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center p-3 rounded table-custom-row" style="background-color: ${bgColor}; border: 1px solid var(--border-table);">
                    <div class="d-flex align-items-center position-relative w-100">
                        <!-- Barra vertical de color indicativa de la categoría a la izquierda -->
                        <div style="position: absolute; left: -16px; top: 10%; bottom: 10%; width: 3px; background-color: ${cat.color}; border-radius: 0 4px 4px 0;"></div>
                        <!-- Icono de la categoría -->
                        <span class="fs-4 me-3">${cat.icon}</span>
                        <div class="flex-grow-1">
                            <!-- Nombre de la categoría o subcategoría -->
                            <h6 class="mb-0 fw-bold" style="color: var(--text-table-body); font-size: 0.9rem;">${cat.name}</h6>
                            <!-- Fecha y método de pago debajo del nombre -->
                            <small style="color: var(--text-table-header);">${date} • ${tx.payment_method} ${tx.note ? ' • ' + tx.note : ''}</small>
                        </div>
                        <div class="text-end">
                            <!-- Monto del gasto con estilo de "salida de dinero" (negativo y color de acento) -->
                            <div style="background-color: var(--accent-warning); color: #141414; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 4px; display: inline-block;">-$${amountFormatted}</div>
                        </div>
                    </div>
                </div>
            `;
            // Agrega la fila recién creada al contenedor en el DOM
            this.transactionsList.appendChild(item);
        });
    }

    /**
     * Renderiza una gráfica de líneas usando la librería Chart.js.
     * @param {Array} labels - Arreglo de etiquetas para el eje X (días, meses, etc).
     * @param {Array} datasets - Arreglo con la configuración de datos y colores para la(s) línea(s).
     */
    renderChart(labels, datasets) {
        // Si ya existe una instancia previa de la gráfica, destrúyela para evitar bugs visuales o superposiciones
        if (this.chart) {
            this.chart.destroy();
        }

        // Determina colores dinámicamente desde CSS para soportar temas custom
        const rootStyle = getComputedStyle(document.documentElement);
        const textColor = rootStyle.getPropertyValue('--text-primary').trim() || '#F5F5F5';
        const gridColor = rootStyle.getPropertyValue('--border-table').trim() || '#363637';
        const pointBgColor = rootStyle.getPropertyValue('--bg-color').trim() || '#141414';

        // Crea una nueva instancia de Chart
        this.chart = new Chart(this.chartCtx, {
            // Especifica que es una gráfica de tipo línea
            type: 'line',
            data: {
                // Asigna las etiquetas del eje X
                labels: labels,
                // Mapea los datasets recibidos para inyectarles configuración visual específica
                datasets: datasets.map(ds => ({
                    label: ds.label, // Nombre de la línea (ej: "Total")
                    data: ds.data, // Los puntos de datos numéricos
                    borderColor: ds.color, // Color de la línea principal
                    backgroundColor: ds.color, // Color base
                    tension: 0.3, // Añade una ligera curva a las líneas (0 es recta)
                    borderWidth: 2, // Grosor de la línea
                    pointRadius: 3, // Tamaño de los puntos sobre la línea
                    pointBackgroundColor: pointBgColor, // Color interior del punto
                    pointBorderWidth: 2 // Grosor del borde del punto
                }))
            },
            options: {
                // Permite que la gráfica se adapte al contenedor
                responsive: true,
                // Permite definir la altura en CSS en lugar de forzar proporciones
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        // Posición de la leyenda descriptiva
                        position: 'top',
                        labels: {
                            color: textColor, // Color del texto de la leyenda
                            usePointStyle: true, // Usa círculos en vez de cuadrados en la leyenda
                            boxWidth: 8 // Tamaño del indicador en la leyenda
                        }
                    }
                },
                scales: {
                    x: {
                        // Configuración de las líneas de la cuadrícula vertical
                        grid: { color: gridColor, drawBorder: false },
                        // Configuración del texto del eje X
                        ticks: { color: textColor, maxTicksLimit: 7 }
                    },
                    y: {
                        // Configuración de las líneas de la cuadrícula horizontal
                        grid: { color: gridColor, drawBorder: false },
                        // Configuración del texto del eje Y
                        ticks: { color: textColor, maxTicksLimit: 5 }
                    }
                }
            }
        });
    }
}

// Exporta la clase para poder ser instanciada por el CategoryDetailsController
export default CategoryDetailsView;
