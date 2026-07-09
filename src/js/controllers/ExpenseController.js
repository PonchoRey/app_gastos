// Importa el modelo que interactúa con la tabla de gastos en la base de datos
import ExpenseModel from '../models/ExpenseModel.js';
// Importa la vista que maneja el formulario de captura y edición de gastos/ingresos
import ExpenseView from '../views/ExpenseView.js';

/**
 * Clase ExpenseController
 * Actúa como intermediario entre ExpenseModel y ExpenseView.
 * Maneja la lógica de negocio para la creación, validación, actualización y eliminación de transacciones.
 */
class ExpenseController {
    /**
     * Constructor del controlador de Gastos.
     */
    constructor() {
        // Instancia su propio modelo
        this.model = new ExpenseModel();
        // Instancia su propia vista
        this.view = new ExpenseView();

        // Enlaza el evento de "Guardar" de la vista (submit del form) con el manejador local
        this.view.bindSaveExpense(this.handleSaveExpense.bind(this));
        // Enlaza el evento de "Eliminar" de la vista con el manejador local
        this.view.bindDeleteExpense(this.handleDeleteExpense.bind(this));
    }

    /**
     * Prepara la vista del formulario para editar un gasto existente.
     * @param {Object} expense - Objeto con los datos del gasto seleccionado.
     */
    loadForEdit(expense) {
        // Llama a la vista para rellenar los inputs con la información
        this.view.loadForEdit(expense);
        // Si el enrutador global está disponible, navega forzadamente hacia la pantalla del formulario
        if (window.app) {
            window.app.navigate('add-expense-view');
        }
    }

    /**
     * Carga las categorías desde la base de datos y le dice a la vista que rellene el menú <select>.
     * Se llama típicamente cada vez que se entra a la pantalla del formulario para asegurar datos frescos.
     */
    async loadCategoriesForSelect() {
        // Verifica que el controlador de categorías esté disponible globalmente
        if (window.app && window.app.categoryController) {
            // Solicita la jerarquía de categorías ya estructurada
            const structured = await window.app.categoryController.model.getStructuredCategories();
            // Envía la jerarquía a la vista para que construya los <optgroup> y <option>
            this.view.populateCategoriesDropdown(structured);
        }
    }

    /**
     * Maneja la lógica de guardar un gasto/ingreso cuando el usuario envía el formulario.
     * @param {Object} expenseData - Objeto construido por la vista con todos los datos capturados.
     */
    async handleSaveExpense(expenseData) {
        try {
            // Verifica si los datos incluyen un ID, lo que significa que estamos actualizando un registro existente
            if (expenseData.id) {
                // Actualiza en SQLite
                await this.model.update(expenseData);
                // Muestra notificación de éxito
                window.app.showToast("Gasto actualizado exitosamente.");
            } else {
                // Si no hay ID, es una inserción nueva
                await this.model.create(expenseData);
                window.app.showToast("Gasto registrado exitosamente.");
            }
            // Una vez guardado, limpia el formulario a su estado original (vacío, modo creación)
            this.view.resetForm();
            
            // Lógica de navegación post-guardado:
            // Regresa automáticamente al usuario a la pantalla del dashboard (resumen)
            if(window.app) {
                window.app.navigate('dashboard-view');
                // Adicionalmente, fuerza al dashboard a recalcular los totales y re-dibujar su gráfica
                if(window.app.dashboardController) {
                    window.app.dashboardController.loadDashboardData();
                }
            }
        } catch (error) {
            // En caso de que falle la promesa de SQLite (ej. validaciones de esquema, bloqueos)
            console.error("Error al guardar gasto:", error);
            window.app.showToast("Hubo un error al guardar el gasto.", "danger");
        }
    }

    /**
     * Maneja el proceso de eliminar un gasto desde el formulario de edición.
     * @param {number} id - Identificador del registro a borrar.
     */
    async handleDeleteExpense(id) {
        // Dialog de confirmación por seguridad para evitar borrados accidentales
        if (confirm("¿Estás seguro de que deseas eliminar este gasto?")) {
            try {
                // Ejecuta la consulta de borrado en SQLite
                await this.model.delete(id);
                // Resetea la vista para que no siga mostrando los datos del gasto borrado
                this.view.resetForm();
                window.app.showToast("Gasto eliminado exitosamente.");
                
                // Retorna al dashboard
                if(window.app) {
                    window.app.navigate('dashboard-view');
                    // Refresca la información del dashboard
                    if(window.app.dashboardController) {
                        window.app.dashboardController.loadDashboardData();
                    }
                }
            } catch (error) {
                console.error("Error al eliminar gasto:", error);
                window.app.showToast("Hubo un error al eliminar el gasto.", "danger");
            }
        }
    }
}

export default ExpenseController;
