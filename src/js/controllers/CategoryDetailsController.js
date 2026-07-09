// Importa la vista de detalles de categoría
import CategoryDetailsView from '../views/CategoryDetailsView.js';

/**
 * Clase CategoryDetailsController
 * Controlador específico para manejar la vista detallada de una categoría seleccionada.
 * Se encarga de procesar las transacciones particulares de esa categoría y graficarlas.
 */
class CategoryDetailsController {
    /**
     * Constructor del controlador.
     */
    constructor() {
        // Inicializa la vista correspondiente
        this.view = new CategoryDetailsView();
        // Variable para recordar qué categoría estamos visualizando actualmente
        this.currentCategoryId = null;
    }

    /**
     * Carga todos los datos necesarios para la vista detallada de una categoría y los envía a renderizar.
     * @param {number|string} categoryId - ID de la categoría a consultar.
     * @param {string} filter - Filtro de tiempo a aplicar (ej: 'month', 'year').
     */
    async loadCategoryData(categoryId, filter = 'month') {
        // Almacena el ID activo en la instancia
        this.currentCategoryId = categoryId;
        
        // Extrae las referencias a los modelos globales ya instanciados en el objeto global window.app
        const expenseModel = window.app.expenseController.model;
        const categoryModel = window.app.categoryController.model;

        // Carga de forma concurrente todas las transacciones y todas las categorías
        const allExpenses = await expenseModel.getAll();
        const allCategories = await categoryModel.getAll();

        // Busca en la lista de categorías la que coincida con el ID solicitado (Categoría Principal a visualizar)
        const mainCategory = allCategories.find(c => c.id == categoryId);
        // Si por alguna razón no existe (fue borrada concurrente, por ej), aborta
        if (!mainCategory) return;

        // Obtiene las subcategorías (hijas) cuyo padre sea la categoría principal actual
        const subcategories = allCategories.filter(c => c.parent_id == categoryId);
        // Crea un arreglo con el ID de la principal Y los IDs de sus hijas, para filtrar los gastos
        const relevantCategoryIds = [mainCategory.id, ...subcategories.map(c => c.id)];

        // Filtra todas las transacciones basándose en la temporalidad deseada usando una utilidad del dashboard
        const filteredByTime = window.app.dashboardController.filterExpensesByExactMonth(allExpenses, window.app.dashboardController.currentDashboardDate);
        
        // Filtra los gastos resultantes para quedarse SÓLO con aquellos que pertenecen a esta familia de categorías
        const categoryExpenses = filteredByTime.filter(exp => relevantCategoryIds.includes(exp.category_id));
        // Ordena los gastos filtrados por fecha descendente (recientes primero)
        categoryExpenses.sort((a, b) => new Date(b.date_recorded) - new Date(a.date_recorded));

        // Calcula el monto acumulado total de todas las transacciones filtradas usando el método reduce de array
        const totalAmount = categoryExpenses.reduce((acc, curr) => acc + curr.amount, 0);

        // Envía la orden a la vista para renderizar la cabecera (Título y Total)
        this.view.renderHeader(mainCategory, totalAmount);
        // Envía la orden a la vista para listar la historia de transacciones en modo lista
        this.view.renderTransactions(categoryExpenses, subcategories, mainCategory);

        // Delega la compleja lógica de preparación de la gráfica de líneas a un método interno
        this.prepareAndRenderChart(categoryExpenses, mainCategory, subcategories, filter);
    }

    /**
     * Prepara los datos brutos de transacciones para convertirlos en los arreglos de datasets que requiere Chart.js
     * @param {Array} expenses - Lista de gastos de la categoría.
     * @param {Object} mainCategory - Objeto de la categoría principal.
     * @param {Array} subcategories - Lista de objetos de subcategorías.
     * @param {string} filter - Periodo de tiempo.
     */
    prepareAndRenderChart(expenses, mainCategory, subcategories, filter) {
        // Si no hay gastos, limpia la gráfica pasando arreglos vacíos
        if (expenses.length === 0) {
            this.view.renderChart([], []);
            return;
        }
        
        // Agrupación cronológica: Se agrupan los gastos ocurridos en un mismo día (YYYY-MM-DD)
        const groups = {};
        expenses.forEach(exp => {
            const dateObj = new Date(exp.date_recorded);
            // Extrae la parte de la fecha rellenando con ceros si es necesario (ej: 2023-05-09)
            const key = `${dateObj.getFullYear()}-${(dateObj.getMonth()+1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
            // Si no existe la llave para ese día, inicializa el array
            if (!groups[key]) groups[key] = [];
            // Inserta el gasto en el día correspondiente
            groups[key].push(exp);
        });

        // Ordena cronológicamente las llaves (fechas) de menor a mayor
        const sortedKeys = Object.keys(groups).sort();
        
        // Transforma las fechas 'YYYY-MM-DD' en etiquetas amigables para el eje X (ej: '9 may')
        const labels = sortedKeys.map(k => {
            const [y, m, d] = k.split('-');
            const dObj = new Date(y, m-1, d);
            return dObj.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
        });

        // Inicializa el mapa para estructurar los Datasets (las líneas)
        const datasetsMap = {};
        
        // Añade siempre el Dataset inicial para la categoría principal. Array.fill(0) pone montos en 0 para cada fecha base
        datasetsMap[mainCategory.id] = {
            label: mainCategory.name,
            color: mainCategory.color,
            data: new Array(sortedKeys.length).fill(0)
        };

        // Prepara los Datasets para cada subcategoría (cada una tendrá su propia línea)
        subcategories.forEach(sub => {
            datasetsMap[sub.id] = {
                label: sub.name,
                color: sub.color,
                data: new Array(sortedKeys.length).fill(0)
            };
        });

        // Bandera para saber si existen gastos directamente en la categoría principal y no solo en las subcategorías
        let hasDirectExpenses = false;

        // Rellena la matriz de datos iterando sobre las fechas ordenadas
        sortedKeys.forEach((key, index) => {
            // Extrae los gastos ocurridos en un día particular
            const dayExps = groups[key];
            dayExps.forEach(exp => {
                // Si el gasto corresponde a un dataset existente, acumula su monto en el índice (día) actual
                if (datasetsMap[exp.category_id]) {
                    datasetsMap[exp.category_id].data[index] += exp.amount;
                }
                // Activa la bandera si detectamos que se gastó en la raíz, no en una subcategoría
                if (exp.category_id == mainCategory.id) {
                    hasDirectExpenses = true;
                }
            });
        });

        // Arreglo final que consumirá Chart.js
        const datasets = [];
        
        // Si hay gastos directos o si no hay subcategorías en absoluto, añade la línea de la categoría principal
        if (hasDirectExpenses || subcategories.length === 0) {
            // Si tiene hijas Y además gastos directos, renombra su leyenda a "General" para diferenciar la línea principal de las sublíneas
            if (subcategories.length > 0 && hasDirectExpenses) {
                datasetsMap[mainCategory.id].label = 'General';
            }
            // Agrega el dataset estructurado
            datasets.push(datasetsMap[mainCategory.id]);
        }

        // Filtra y añade las subcategorías que valga la pena mostrar
        subcategories.forEach(sub => {
            // Condición: Solo agrega la línea de la subcategoría si al menos un día tuvo un gasto mayor a 0 (Evita líneas planas)
            if (datasetsMap[sub.id].data.some(val => val > 0)) {
                datasets.push(datasetsMap[sub.id]);
            }
        });

        // Ordena a la vista dibujar el gráfico de Chart.js con los labels del eje X y las líneas preparadas
        this.view.renderChart(labels, datasets);
    }
}

// Exporta el controlador de detalles de categoría
export default CategoryDetailsController;
