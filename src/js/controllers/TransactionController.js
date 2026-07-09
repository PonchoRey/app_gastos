// Importa el modelo de gastos, ya que el historial de transacciones consulta esa tabla
import ExpenseModel from '../models/ExpenseModel.js';
// Importa la vista especializada en mostrar la lista completa de transacciones
import TransactionView from '../views/TransactionView.js';

/**
 * Clase TransactionController
 * Maneja la lógica de la pantalla "Historial", encargándose de buscar, 
 * filtrar temporalmente y preparar la data de las transacciones para la vista.
 */
class TransactionController {
    /**
     * Constructor del controlador.
     */
    constructor() {
        // Reutiliza el modelo de Gastos
        this.model = new ExpenseModel();
        // Instancia la vista del Historial
        this.view = new TransactionView();
        
        // Estado local (caché en memoria) de todas las transacciones para realizar filtrados rápidos en cliente
        this.allTransactions = [];
        // Diccionario (Mapa) para cruzar rápidamente IDs de categorías con sus datos (nombre, icono, color) sin queries repetitivos O(1)
        this.categoriesMap = {};
        
        // Estado de los filtros actuales aplicados por el usuario
        this.currentQuery = ''; // Texto buscado
        this.currentFilter = 'all'; // Rango de tiempo seleccionado (ej: 'today', 'month')

        // Enlaza los eventos que dispara la vista con los métodos de este controlador
        this.view.bindSearch(this.handleSearch.bind(this));
        this.view.bindTimeFilter(this.handleTimeFilter.bind(this));
        this.view.bindEditTransaction(this.handleEdit.bind(this));
        this.view.bindDeleteTransaction(this.handleDelete.bind(this));
    }

    /**
     * Carga inicial/refresco de todas las transacciones y del mapa de categorías.
     */
    async loadTransactions() {
        try {
            // Obtiene la lista cruda y completa desde la base de datos
            this.allTransactions = await this.model.getAll();
            // Ordena la lista en memoria por fecha de forma descendente (el más reciente arriba)
            this.allTransactions.sort((a, b) => new Date(b.date_recorded) - new Date(a.date_recorded));
            
            // Construye el diccionario de categorías solicitándolo al controlador de categorías si existe
            if (window.app && window.app.categoryController) {
                const categories = await window.app.categoryController.model.getAll();
                // Limpia/inicia el mapa
                this.categoriesMap = {};
                // Rellena el mapa usando el ID como llave
                categories.forEach(cat => {
                    this.categoriesMap[cat.id] = cat;
                });
            }

            // Una vez cargada la data fresca, aplica cualquier filtro que estuviese activo y manda a renderizar
            this.applyFilters();
        } catch (error) {
            console.error("Error cargando historial de transacciones:", error);
        }
    }

    /**
     * Reacciona a cada letra que el usuario escribe en la barra de búsqueda.
     * @param {string} query - El texto introducido.
     */
    handleSearch(query) {
        // Actualiza el estado local de búsqueda (usa un string vacío si query es undefined)
        this.currentQuery = query || '';
        // Reaplica todos los filtros a la colección base y renderiza
        this.applyFilters();
    }

    /**
     * Reacciona cuando el usuario selecciona un nuevo rango temporal en el dropdown.
     * @param {string} filter - La llave del periodo (ej. 'week').
     */
    handleTimeFilter(filter) {
        // Actualiza el estado local del filtro de tiempo
        this.currentFilter = filter || 'all';
        // Reaplica
        this.applyFilters();
    }

    /**
     * Aplica el motor de filtrado encadenado (por tiempo, luego por texto) 
     * a la caché en memoria y le pasa el resultado final a la vista.
     */
    applyFilters() {
        // Comienza asumiendo que el resultado es toda la colección
        let filtered = this.allTransactions;

        // 1. Aplicar Filtro de Tiempo
        if (this.currentFilter !== 'all') {
            const now = new Date();
            // Normaliza la fecha de hoy a la medianoche
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            // Inicializa la fecha de inicio en el Epoch (tiempo 0)
            let startDate = new Date(0);

            // Determina la fecha de inicio requerida según la opción elegida
            switch(this.currentFilter) {
                case 'today':
                    startDate = today;
                    break;
                case 'week':
                    const firstDayOfWeek = new Date(today);
                    firstDayOfWeek.setDate(today.getDate() - today.getDay());
                    startDate = firstDayOfWeek;
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
            }

            // Filtra descartando cualquier transacción ocurrida antes de la startDate calculada
            filtered = filtered.filter(tx => {
                const expDate = new Date(tx.date_recorded);
                return expDate >= startDate;
            });
        }

        // 2. Aplicar Búsqueda por Texto Libre
        if (this.currentQuery.trim() !== '') {
            // Pasa el término buscado a minúsculas para hacer una búsqueda "case-insensitive"
            const lowerQuery = this.currentQuery.toLowerCase();
            
            // Filtra dejando pasar solo si la búsqueda está contenida en el Nombre de Categoría, en la Nota o en el Monto numérico
            filtered = filtered.filter(tx => {
                // Recupera el nombre de la categoría del mapa (en minúsculas), previniendo nulos si no existe
                const categoryName = (this.categoriesMap[tx.category_id] || {name: ''}).name.toLowerCase();
                // Recupera la nota (en minúsculas)
                const note = (tx.note || '').toLowerCase();
                // Convierte el monto a cadena de texto
                const amountStr = tx.amount.toString();
                
                // Condición múltiple: Retorna true si halla coincidencia en cualquiera de los 3 campos
                return categoryName.includes(lowerQuery) || note.includes(lowerQuery) || amountStr.includes(lowerQuery);
            });
        }

        // 3. Renderizar resultados
        // Una vez que el array 'filtered' pasó ambos filtros de embudo, se manda a la vista junto con el mapa de categorías para decorarlo
        this.view.renderTransactions(filtered, this.categoriesMap);
    }

    /**
     * Delega la edición al controlador principal de Gastos.
     * @param {number} id - ID de la transacción a editar.
     */
    handleEdit(id) {
        // Busca el objeto completo en la caché de memoria
        const tx = this.allTransactions.find(t => t.id === id);
        // Si lo encuentra, llama al método loadForEdit() del controlador de gastos (reutilizando la UI)
        if (tx && window.app && window.app.expenseController) {
            window.app.expenseController.loadForEdit(tx);
        }
    }

    /**
     * Ejecuta la eliminación de un registro directamente desde el listado del historial.
     * @param {number} id - ID del registro a borrar.
     */
    async handleDelete(id) {
        try {
            // Llama al modelo para borrarlo de SQLite
            await this.model.delete(id);
            // Avisa éxito
            window.app.showToast("Registro eliminado exitosamente.");
            // Recarga la lista maestra (esto hace un nuevo fetch a BD y reaplica filtros automáticamente)
            await this.loadTransactions(); 
            // Informa al dashboard que la data cambió por si el usuario navega allá y necesita la data actualizada
            if(window.app && window.app.dashboardController) {
                window.app.dashboardController.loadDashboardData();
            }
        } catch (error) {
            console.error("Error al eliminar registro:", error);
            window.app.showToast("Hubo un error al eliminar el registro.", "danger");
        }
    }
}

export default TransactionController;
