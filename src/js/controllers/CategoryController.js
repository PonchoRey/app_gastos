// Importa el modelo de datos de categorías para hacer consultas a la base de datos
import CategoryModel from '../models/CategoryModel.js';
// Importa la vista correspondiente para manipular la interfaz de categorías
import CategoryView from '../views/CategoryView.js';

/**
 * Clase CategoryController
 * Actúa como intermediario (Controlador en MVC) entre CategoryModel y CategoryView.
 * Orquesta la carga de datos, el cálculo de totales y la gestión de eventos de usuario en la pantalla de Categorías.
 */
class CategoryController {
    /**
     * Constructor del controlador.
     * Instancia el modelo y la vista, y hace el 'bind' (enlace) de los eventos de la UI
     * con los métodos locales de esta clase.
     */
    constructor() {
        // Inicializa el modelo de categorías
        this.model = new CategoryModel();
        // Inicializa la vista de categorías
        this.view = new CategoryView();

        // Bindings: Le decimos a la vista qué funciones de este controlador debe llamar cuando el usuario interactúe
        // Se usa .bind(this) para asegurar que dentro de estas funciones, 'this' siga refiriéndose al controlador
        this.view.bindSaveCategory(this.handleSaveCategory.bind(this));
        this.view.bindDeleteCategory(this.handleDeleteCategory.bind(this));
        this.view.bindEditCategory(this.handleEditCategory.bind(this));

        // Nota: La carga inicial de datos no se hace en el constructor
        // Se realiza llamando al método loadCategories() desde el app.js cuando el enrutador muestra esta sección
    }

    /**
     * Carga todas las categorías desde la BD, calcula los gastos totales de cada una,
     * y manda a renderizar la vista.
     */
    async loadCategories() {
        // Obtiene las categorías estructuradas (principales con sus subcategorías) desde el modelo
        const structured = await this.model.getStructuredCategories();
        
        // Diccionario (objeto) para almacenar los totales gastados por categoría (id -> {count, amount})
        const totals = {};
        
        // Verifica si la aplicación global y su controlador de gastos están disponibles para acceder a las transacciones
        if (window.app && window.app.expenseController) {
            // Carga absolutamente todos los gastos de la base de datos (Nota: en bases enormes esto podría ser lento, pero para SQLite local está bien)
            const expenses = await window.app.expenseController.model.getAll();
            
            // Itera sobre cada gasto para sumar sus montos y contarlos por categoría
            expenses.forEach(ex => {
                // Si la categoría de este gasto no existe en el diccionario, la inicializa en cero
                if(!totals[ex.category_id]) totals[ex.category_id] = { count: 0, amount: 0 };
                // Incrementa el número de transacciones para esa categoría
                totals[ex.category_id].count++;
                // Suma el valor monetario del gasto al total de esa categoría
                totals[ex.category_id].amount += ex.amount;
            });

            // Lógica para consolidar (sumar) los gastos de las subcategorías dentro de su categoría padre principal
            structured.forEach(cat => {
                // Obtiene el total actual del padre (sus propios gastos directos) o lo inicializa en cero
                let catTotal = totals[cat.id] || { count: 0, amount: 0 };
                // Si este padre tiene hijas (subcategorías)
                if (cat.children && cat.children.length > 0) {
                    // Itera sobre las hijas
                    cat.children.forEach(sub => {
                        // Obtiene el total de la hija
                        const subTotal = totals[sub.id] || { count: 0, amount: 0 };
                        // Le suma el conteo y monto de la hija al padre
                        catTotal.count += subTotal.count;
                        catTotal.amount += subTotal.amount;
                    });
                    // Reasigna el gran total acumulado (padre + hijas) al diccionario usando el ID del padre
                    totals[cat.id] = catTotal;
                }
            });
        }

        // Pide a la vista que dibuje el HTML usando las categorías ordenadas y sus totales numéricos
        this.view.renderCategories(structured, totals);
    }

    /**
     * Prepara y abre la ventana modal para crear una NUEVA categoría.
     * Llena previamente el <select> de padres disponibles.
     */
    async prepareCreateModal() {
        // Obtiene todas las categorías planas (no estructuradas) desde la BD
        const allCategories = await this.model.getAll();
        // Filtra para dejar solo aquellas que NO tienen padre (es decir, que ya son principales)
        // Regla de negocio: Una subcategoría no puede tener sub-subcategorías (jerarquía de 1 solo nivel)
        const mainCategories = allCategories.filter(cat => !cat.parent_id);
        // Envía esta lista al <select> del formulario en la vista
        this.view.populateParentSelect(mainCategories);
        // Ordena a la vista mostrar el modal vacío
        this.view.openModal();
    }

    /**
     * Maneja el evento de click en el botón "Editar" de alguna categoría en la lista.
     * Carga sus datos y prepara el modal.
     * @param {number} id - El ID de la categoría a editar.
     */
    async handleEditCategory(id) {
        // Busca en la base de datos la categoría específica
        const category = await this.model.getById(id);
        if (category) {
            // Trae todas las categorías
            const allCategories = await this.model.getAll();
            // Evitar que una categoría sea padre de sí misma, filtrando su propio ID de la lista de padres seleccionables
            const mainCategories = allCategories.filter(cat => !cat.parent_id && cat.id !== id);
            // Llena el <select> de la vista
            this.view.populateParentSelect(mainCategories);
            // Ordena a la vista mostrar el modal, pasándole los datos existentes para rellenar los inputs
            this.view.openModal(category);
        }
    }

    /**
     * Maneja el envío del formulario del modal (Guardar). Crea o Actualiza según sea el caso.
     * @param {Object} categoryData - Objeto con los datos capturados en el formulario.
     */
    async handleSaveCategory(categoryData) {
        try {
            // Verifica si el objeto trae un ID válido; de ser así, es una Edición
            if (categoryData.id) {
                // Actualiza en la base de datos
                await this.model.update(categoryData);
            } else {
                // Si no trae ID, es una Creación. Se asegura que la clave id no interfiera con el Auto Increment de SQLite
                delete categoryData.id; 
                // Inserta en la base de datos
                await this.model.create(categoryData);
            }
            // Una vez guardado, cierra el modal
            this.view.closeModal();
            // Recarga toda la lista de categorías en pantalla para reflejar los cambios
            await this.loadCategories();
            
            // Notifica al controlador de gastos (si existe) que la estructura de categorías cambió
            // Esto es crucial para que el <select> de categorías al crear un Gasto siempre esté actualizado
            if(window.app && window.app.expenseController) {
                window.app.expenseController.loadCategoriesForSelect();
            }
            // Muestra mensaje flotante de éxito al usuario
            window.app.showToast("Categoría guardada exitosamente.");
        } catch (error) {
            console.error("Error guardando categoría:", error);
            // Si algo falla, avisa al usuario
            window.app.showToast("Hubo un error al guardar la categoría.", "danger");
        }
    }

    /**
     * Maneja la solicitud de eliminar una categoría.
     * Incluye validaciones estrictas de reglas de negocio antes de borrar.
     * @param {number} id - ID de la categoría a borrar.
     */
    async handleDeleteCategory(id) {
        try {
            // VALIDACIÓN DE NEGOCIO 1: Verificar si la categoría tiene hijas (subcategorías)
            const allCategories = await this.model.getAll();
            const hasSubcategories = allCategories.some(c => c.parent_id == id);
            if (hasSubcategories) {
                // Si tiene hijas, aborta e informa al usuario. Evita crear "categorías huérfanas"
                window.app.showToast("No puedes eliminar una categoría principal que tiene subcategorías.", "warning");
                return;
            }

            // VALIDACIÓN DE NEGOCIO 2: Verificar si la categoría ya fue usada en alguna transacción
            if (window.app && window.app.expenseController) {
                const expenses = await window.app.expenseController.model.getAll();
                // Busca si algún gasto tiene en su campo category_id el ID que queremos borrar
                const hasExpenses = expenses.some(ex => ex.category_id == id);
                if (hasExpenses) {
                    // Si tiene gastos, aborta. Evita romper la vista de transacciones o el dashboard
                    window.app.showToast("No puedes eliminar una categoría con gastos asociados.", "warning");
                    return; 
                }
            }

            // Si pasa todas las validaciones de negocio, borra el registro permanentemente
            await this.model.delete(id);
            // Cierra el modal de edición
            this.view.closeModal(); 
            // Recarga la vista
            await this.loadCategories();
            
            // Actualiza selectores externos de otras vistas
            if(window.app && window.app.expenseController) {
                window.app.expenseController.loadCategoriesForSelect();
            }
            // Informa éxito
            window.app.showToast("Categoría eliminada exitosamente.");
        } catch (error) {
            console.error("Error eliminando categoría:", error);
            window.app.showToast("Hubo un error al eliminar.", "danger");
        }
    }
}

// Se exporta la clase para poder ser instanciada desde la clase principal App
export default CategoryController;
