/**
 * Clase TransactionView
 * Maneja la UI de la pantalla "Historial de Transacciones".
 * Renderiza la lista de gastos/ingresos, y controla las entradas de búsqueda y filtros.
 */
class TransactionView {
    /**
     * Constructor de la vista del Historial de Transacciones.
     * Enlaza los elementos HTML a propiedades de la clase para su rápida manipulación.
     */
    constructor() {
        // Contenedor principal donde se inyectan dinámicamente las filas de transacciones
        this.tableBody = document.getElementById('transactionsTableBody');
        // Input de texto para buscar transacciones por concepto/nota
        this.searchInput = document.getElementById('transactionSearch');
        // Etiqueta tipo "badge" para mostrar la cantidad de transacciones encontradas
        this.countSpan = document.getElementById('transactionCount');
        // Menú desplegable (<select>) para filtrar por rango de tiempo (mes, año, etc)
        this.timeFilter = document.getElementById('transactionTimeFilter');
    }

    /**
     * Enlaza el evento de escribir en la barra de búsqueda con el controlador.
     * @param {Function} handler - Función a ejecutar pasando el texto escrito.
     */
    bindSearch(handler) {
        if(this.searchInput) {
            // Usa 'input' en lugar de 'change' para reaccionar inmediatamente en cada tecleo
            this.searchInput.addEventListener('input', (e) => {
                handler(e.target.value);
            });
        }
    }

    /**
     * Enlaza el evento de cambiar el filtro de tiempo con el controlador.
     * @param {Function} handler - Función a ejecutar pasando el valor temporal seleccionado.
     */
    bindTimeFilter(handler) {
        if(this.timeFilter) {
            this.timeFilter.addEventListener('change', (e) => {
                handler(e.target.value);
            });
        }
    }

    /**
     * Delega el clic de los botones "Editar" (creados dinámicamente) al controlador.
     * @param {Function} handler - Función a ejecutar pasando el ID de la transacción.
     */
    bindEditTransaction(handler) {
        if(this.tableBody) {
            // Event delegation en el contenedor padre
            this.tableBody.addEventListener('click', event => {
                // Busca el ancestro más cercano que tenga la clase de botón de edición
                const btn = event.target.closest('.edit-transaction-btn');
                if (btn) {
                    // Extrae el atributo de datos 'data-id' y lo pasa al controlador
                    const txId = parseInt(btn.dataset.id);
                    handler(txId);
                }
            });
        }
    }

    /**
     * Delega el clic de los botones "Eliminar" (creados dinámicamente) al controlador.
     * @param {Function} handler - Función a ejecutar pasando el ID a eliminar.
     */
    bindDeleteTransaction(handler) {
        if(this.tableBody) {
            // Event delegation
            this.tableBody.addEventListener('click', event => {
                // Busca el botón de eliminar
                const btn = event.target.closest('.delete-transaction-btn');
                if (btn) {
                    const txId = parseInt(btn.dataset.id);
                    // Confirma la intención destructiva mediante diálogo nativo
                    if(confirm("¿Estás seguro de eliminar este registro?")) {
                        handler(txId);
                    }
                }
            });
        }
    }

    /**
     * Renderiza la lista de transacciones en la interfaz basándose en la información proporcionada.
     * @param {Array} transactions - Arreglo de objetos de transacciones extraídos de SQLite.
     * @param {Object} categoriesMap - Diccionario mapeado (ID -> Categoría) para búsquedas O(1) del ícono y color.
     */
    renderTransactions(transactions, categoriesMap) {
        // Previene errores si el elemento no existe en el DOM
        if(!this.tableBody) return;
        // Limpia cualquier contenido previo
        this.tableBody.innerHTML = '';
        
        // Actualiza el contador de resultados
        if(this.countSpan) {
            this.countSpan.textContent = transactions.length;
        }

        // Si el arreglo está vacío, renderiza el "Empty State"
        if (transactions.length === 0) {
            this.tableBody.innerHTML = `
                <div class="text-center py-5 border-0">
                    <i class="bi bi-receipt text-muted" style="font-size: 3rem; opacity: 0.5;"></i>
                    <p class="mt-3 mb-1 fw-bold" style="color: var(--text-primary);">Aún no tienes gastos registrados</p>
                    <p class="small text-muted mb-4">Empieza a registrar tus gastos para verlos en el historial.</p>
                    <button class="btn btn-primary btn-sm px-4 rounded-pill shadow-sm" onclick="app.navigate('add-expense-view')">
                        <i class="bi bi-plus-lg me-1"></i> Registrar Gasto
                    </button>
                </div>
            `;
            return;
        }

        // Recorre y renderiza cada transacción
        transactions.forEach((tx, index) => {
            // Procesa la fecha y la formatea igual que en el detalle de categorías (ej: "oct 5, 14:30")
            const date = new Date(tx.date_recorded);
            const formattedDate = !isNaN(date) ? date.toLocaleDateString('es-MX', {
                month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
            }) : 'Fecha inválida';
            // Formatea el monto con separación de miles
            const amountFormatted = parseFloat(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            // Determina si es ingreso para aplicar coloración condicional
            const isIncome = tx.type === 'income';
            
            // Extrae la categoría del mapa. Si por alguna razón (inconsistencia de datos) no existe, da un fallback gris.
            const category = categoriesMap[tx.category_id] || { name: 'Sin categoría', icon: '❓', color: '#ccc' };
            // Obtiene el string amigable del método de pago
            const paymentMethodText = this.getPaymentMethodText(tx.payment_method);
            // Formatea la nota; si es nula, pinta un guion sutil
            const noteText = tx.note || '<span style="color: #666;">—</span>';

            // Crea el contenedor base para el ítem
            const item = document.createElement('div');
            item.className = 'list-group-item p-0 border-0';
            item.style.backgroundColor = 'transparent';
            item.style.marginBottom = '8px';
            
            // Intercala colores de fondo para las filas (par/impar) usando variables CSS predefinidas
            const bgColor = index % 2 === 0 ? 'var(--bg-table-row-even)' : 'var(--bg-table-row-odd)';
            
            // Construye el HTML (estructura flexible, sin <table> por regla de estilo)
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center p-3 rounded table-custom-row" style="background-color: ${bgColor}; border: 1px solid var(--border-table);">
                    <div class="d-flex align-items-center position-relative w-100">
                        <!-- Barra vertical de acento de categoría a la izquierda -->
                        <div style="position: absolute; left: -16px; top: 10%; bottom: 10%; width: 3px; background-color: ${category.color}; border-radius: 0 4px 4px 0;"></div>
                        <!-- Emoji -->
                        <span class="fs-4 me-3">${category.icon || '❓'}</span>
                        <!-- Info Principal -->
                        <div class="flex-grow-1">
                            <h6 class="mb-0 fw-bold" style="color: var(--text-table-body); font-size: 0.95rem;">${category.name}</h6>
                            <small style="color: var(--text-table-header);">${formattedDate} • ${paymentMethodText} ${tx.note ? ' • ' + tx.note : ''}</small>
                        </div>
                        <!-- Info Derecha: Monto y Menú -->
                        <div class="text-end d-flex align-items-center gap-2">
                            <!-- Monto etiquetado: Verde y positivo si es Income, Fondo de alerta si es Expense -->
                            <div style="background-color: ${isIncome ? '#13A10E' : 'var(--accent-warning)'}; color: ${isIncome ? '#ffffff' : '#141414'}; font-size: 0.8rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 4px; display: inline-block;">${isIncome ? '+' : ''}$${amountFormatted}</div>
                            
                            <!-- Menú Dropdown de Bootstrap ("Tres puntitos") para acciones de fila -->
                            <div class="dropdown">
                                <button class="btn btn-sm" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="color: var(--text-table-header); padding: 0 5px;">
                                    <i class="bi bi-three-dots-vertical"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0" style="background-color: var(--bg-table-header);">
                                    <!-- Editar: Atrapa ID mediante data-id -->
                                    <li><button class="dropdown-item text-white edit-transaction-btn d-flex align-items-center" data-id="${tx.id}"><i class="bi bi-pencil me-2 text-warning"></i> Editar</button></li>
                                    <!-- Eliminar: Atrapa ID mediante data-id -->
                                    <li><button class="dropdown-item text-white delete-transaction-btn d-flex align-items-center" data-id="${tx.id}"><i class="bi bi-trash me-2 text-danger"></i> Eliminar</button></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            // Agrega al DOM
            this.tableBody.appendChild(item);
        });
    }

    /**
     * [Privado] Helper que convierte las llaves normalizadas de métodos de pago en texto legible y capitalizado.
     * @param {string} method - Método de pago en minúsculas extraído de la BD.
     * @returns {string} Texto amigable.
     */
    getPaymentMethodText(method) {
        if (!method) return '—';
        // Evalúa el método (normalizando a minúsculas)
        switch(method.toLowerCase()) {
            case 'efectivo': return 'Efectivo';
            case 'tarjeta': return 'Crédito'; // Para retrocompatibilidad con registros antiguos
            case 'debito': case 'débito': return 'Débito';
            case 'credito': case 'crédito': return 'Crédito';
            case 'transferencia': return 'Transferencia';
            // Si hay un caso no manejado, lo capitaliza genéricamente
            default: return method.charAt(0).toUpperCase() + method.slice(1);
        }
    }
}

export default TransactionView;
