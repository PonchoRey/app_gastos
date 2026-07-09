// Importamos el servicio de base de datos para manejar las operaciones CRUD relacionadas a los gastos
import dbService from '../services/DatabaseService.js';

/**
 * Clase ExpenseModel
 * Representa el modelo de datos para los Gastos (Expenses).
 * Interactúa con el DatabaseService para leer, insertar, actualizar y borrar registros de gastos.
 */
class ExpenseModel {
    /**
     * Constructor de la clase ExpenseModel.
     * Inicializa las propiedades básicas del modelo.
     */
    constructor() {
        // Define el nombre de la tabla o "store" en SQLite donde se guardan los registros de gastos
        this.storeName = 'expenses';
    }

    /**
     * Obtiene todos los gastos registrados en la base de datos.
     * @returns {Promise<Array>} Una promesa que resuelve a un arreglo con todos los gastos.
     */
    async getAll() {
        // Llama al servicio de base de datos para obtener todos los registros de 'expenses'
        return await dbService.getAll(this.storeName);
    }

    /**
     * Crea un nuevo registro de gasto en la base de datos.
     * @param {Object} expenseData - Objeto que contiene los datos del gasto a crear (monto, categoría, fecha, etc.).
     * @returns {Promise<any>} Una promesa que resuelve al resultado de la inserción.
     */
    async create(expenseData) {
        // Regla de negocio: Asegurarse de que la fecha de registro (date_recorded) exista.
        // Si el objeto expenseData no trae una fecha, se le asigna la fecha y hora actual en formato ISOString.
        if (!expenseData.date_recorded) {
            // Genera la fecha actual y la convierte a string estándar ISO (ej: '2023-10-05T14:48:00.000Z')
            expenseData.date_recorded = new Date().toISOString();
        }
        // Llama al servicio de base de datos para insertar el gasto ya validado
        return await dbService.insert(this.storeName, expenseData);
    }

    /**
     * Actualiza los datos de un gasto existente en la base de datos.
     * @param {Object} expenseData - Objeto con los datos del gasto modificados, debe incluir el ID.
     * @returns {Promise<any>} Una promesa que resuelve al resultado de la actualización.
     */
    async update(expenseData) {
        // Llama al servicio de base de datos para ejecutar la actualización en 'expenses'
        return await dbService.update(this.storeName, expenseData);
    }

    /**
     * Elimina un registro de gasto de la base de datos dado su ID.
     * @param {number|string} id - El identificador único del gasto a eliminar.
     * @returns {Promise<any>} Una promesa que resuelve al resultado de la eliminación.
     */
    async delete(id) {
        // Llama al servicio de base de datos para borrar el registro correspondiente en 'expenses'
        return await dbService.delete(this.storeName, id);
    }

    /**
     * Filtra los gastos basándose en un rango de fechas. 
     * Útil para generar reportes en el dashboard o vistas de historial filtradas por periodo.
     * @param {Date} startDate - Objeto Date representando el inicio del periodo.
     * @param {Date} endDate - Objeto Date representando el final del periodo.
     * @returns {Promise<Array>} Una promesa que resuelve a un arreglo de gastos que caen dentro del rango especificado.
     */
    async getExpensesByDateRange(startDate, endDate) {
        // Primero, obtiene absolutamente todos los gastos registrados en la tabla
        const allExpenses = await this.getAll();
        
        // Retorna un nuevo arreglo filtrando la colección completa
        return allExpenses.filter(exp => {
            // Convierte la cadena date_recorded almacenada en SQLite a un objeto Date real de JavaScript
            const expDate = new Date(exp.date_recorded);
            // Compara que la fecha del gasto sea mayor o igual a la inicial y menor o igual a la final del rango
            return expDate >= startDate && expDate <= endDate;
        });
    }
}

// Exportamos la clase por defecto para ser usada en los controladores correspondientes
export default ExpenseModel;
