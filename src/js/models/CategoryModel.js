// Importamos el servicio de base de datos que maneja las operaciones CRUD sobre SQLite
import dbService from '../services/DatabaseService.js';

/**
 * Clase CategoryModel
 * Representa el modelo de datos para las Categorías.
 * Se encarga de interactuar con el servicio de base de datos para realizar operaciones
 * sobre la tabla/almacén 'categories'.
 */
class CategoryModel {
    /**
     * Constructor de la clase CategoryModel.
     * Inicializa las propiedades básicas del modelo.
     */
    constructor() {
        // Define el nombre de la tabla o "store" en la base de datos donde se guardan las categorías
        this.storeName = 'categories';
    }

    /**
     * Obtiene todas las categorías almacenadas en la base de datos.
     * @returns {Promise<Array>} Una promesa que resuelve a un arreglo de objetos de categorías, ordenado alfabéticamente.
     */
    async getAll() {
        // Llama al servicio de base de datos para obtener todos los registros de 'categories'
        const categories = await dbService.getAll(this.storeName);
        // Retorna las categorías ordenadas por la propiedad 'name' usando localeCompare para soporte de español (acentos, ñ, etc.)
        return categories.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    }

    /**
     * Obtiene una categoría específica por su identificador único (ID).
     * @param {number|string} id - El ID de la categoría a buscar.
     * @returns {Promise<Object>} Una promesa que resuelve al objeto de la categoría encontrada.
     */
    async getById(id) {
        // Llama al servicio de base de datos para obtener un registro por ID en 'categories'
        return await dbService.getById(this.storeName, id);
    }

    /**
     * Crea una nueva categoría en la base de datos.
     * @param {Object} categoryData - Objeto que contiene los datos de la nueva categoría.
     * @returns {Promise<any>} Una promesa que resuelve al resultado de la inserción (ej. el ID generado).
     */
    async create(categoryData) {
        // Llama al servicio de base de datos para insertar los datos en 'categories'
        return await dbService.insert(this.storeName, categoryData);
    }

    /**
     * Actualiza los datos de una categoría existente.
     * @param {Object} categoryData - Objeto con los datos actualizados, debe incluir el ID.
     * @returns {Promise<any>} Una promesa que resuelve al resultado de la actualización.
     */
    async update(categoryData) {
        // Llama al servicio de base de datos para actualizar los datos en 'categories'
        return await dbService.update(this.storeName, categoryData);
    }

    /**
     * Elimina una categoría de la base de datos dado su ID.
     * NOTA: Validar antes de llamar a este método si la categoría tiene gastos asociados para mantener la integridad (regla de negocio).
     * @param {number|string} id - El ID de la categoría a eliminar.
     * @returns {Promise<any>} Una promesa que resuelve al resultado de la eliminación.
     */
    async delete(id) {
        // Llama al servicio de base de datos para eliminar el registro en 'categories'
        return await dbService.delete(this.storeName, id);
    }

    /**
     * Helper para obtener las categorías de forma estructurada.
     * Retorna una lista de categorías principales, cada una con un arreglo de sus subcategorías hijas (propiedad 'children').
     * @returns {Promise<Array>} Arreglo de categorías principales enriquecidas con sus hijas.
     */
    async getStructuredCategories() {
        // Obtiene todas las categorías desde la base de datos usando el método definido previamente
        const allCategories = await this.getAll();
        
        // Filtra el arreglo total para encontrar las categorías "principales" (padres)
        const mainCategories = allCategories.filter(cat => {
            // Si la categoría no tiene 'parent_id', significa que es una categoría principal
            if (!cat.parent_id) return true;
            // Si tiene 'parent_id', verificamos que ese padre realmente exista en nuestra lista
            const parentExists = allCategories.some(p => p.id == cat.parent_id);
            // Si el padre no existe, la categoría es huérfana y por seguridad la tratamos como principal
            return !parentExists; 
        });

        // Filtra el arreglo total para encontrar las subcategorías (hijas)
        const subCategories = allCategories.filter(cat => {
            // Si no tiene 'parent_id', no es una subcategoría, es principal
            if (!cat.parent_id) return false;
            // Verificamos que el padre asignado a esta subcategoría exista en la lista
            const parentExists = allCategories.some(p => p.id == cat.parent_id);
            // Solo es una subcategoría válida si su padre existe
            return parentExists; 
        });

        // Mapeamos las categorías principales para inyectarles sus subcategorías correspondientes
        return mainCategories.map(mainCat => {
            // Retornamos un nuevo objeto usando spread operator (...) para copiar las propiedades del padre
            return {
                ...mainCat,
                // Filtramos las subcategorías cuyo 'parent_id' coincida con el 'id' de esta categoría principal
                children: subCategories.filter(subCat => subCat.parent_id == mainCat.id)
            };
        });
    }
}

// Exportamos la clase por defecto para poder instanciarla en otros módulos
export default CategoryModel;
