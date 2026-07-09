// Importa los componentes necesarios para trabajar con SQLite a través de Capacitor (plugin comunitario)
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
// Importa el core de Capacitor para detectar la plataforma
import { Capacitor } from '@capacitor/core';

/**
 * Clase DatabaseService
 * Gestiona el ciclo de vida de la base de datos local SQLite.
 * Se encarga de la inicialización, creación de tablas, y provee métodos genéricos CRUD.
 */
class DatabaseService {
    /**
     * Constructor del servicio de base de datos.
     * Prepara las variables y determina el entorno de ejecución.
     */
    constructor() {
        // Instancia la conexión a SQLite usando el plugin
        this.sqlite = new SQLiteConnection(CapacitorSQLite);
        // Define el nombre del archivo/almacén de la base de datos
        this.dbName = 'gastos_db';
        // Inicializa la variable de instancia de base de datos en null
        this.db = null;
        // Determina si la app está corriendo de forma nativa (iOS/Android) o en la web (browser)
        this.isNative = Capacitor.isNativePlatform();
    }

    /**
     * Inicializa la conexión a la base de datos.
     * Si está en entorno web, espera a que cargue el worker de WASM.
     * Verifica la consistencia y establece la conexión principal.
     */
    async init() {
        // Comprueba si el entorno es web (no es plataforma nativa)
        if (!this.isNative) {
            // Espera a que el Custom Element 'jeep-sqlite' (usado para emular SQLite en web con WASM) esté cargado en el DOM
            await customElements.whenDefined('jeep-sqlite');
            // Inicializa el almacenamiento web para SQLite (generalmente IndexedDB bajo el capó)
            await this.sqlite.initWebStore();
        }

        // Verifica que el sistema de conexiones sea consistente y no tenga estados corruptos
        const ret = await this.sqlite.checkConnectionsConsistency();
        // Comprueba si ya existe una conexión previa activa hacia 'gastos_db'
        const isConn = (await this.sqlite.isConnection(this.dbName, false)).result;
        
        // Si hay consistencia y existe la conexión...
        if (ret.result && isConn) {
            // ...recupera esa conexión existente para reutilizarla
            this.db = await this.sqlite.retrieveConnection(this.dbName, false);
        } else {
            // ...de lo contrario, crea una nueva conexión indicando nombre, sin cifrado ('no-encryption'), versión 1
            this.db = await this.sqlite.createConnection(this.dbName, false, "no-encryption", 1, false);
        }
        
        // Abre efectivamente la base de datos para que acepte consultas
        await this.db.open();

        // Ejecuta el proceso de inicialización de la estructura (tablas)
        await this.initializeTables();
    }

    /**
     * Crea la estructura de tablas si estas no existen.
     * Además, aplica alteraciones necesarias y llama al método de "sembrado" (seed) de datos iniciales.
     */
    async initializeTables() {
        // Define el query SQL para crear la tabla de categorías
        const createCategories = `
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                parent_id INTEGER,
                icon TEXT,
                color TEXT
            );
        `;
        
        // Define el query SQL para crear la tabla de gastos
        const createExpenses = `
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                amount REAL NOT NULL,
                category_id INTEGER,
                payment_method TEXT,
                note TEXT,
                date_recorded TEXT NOT NULL,
                type TEXT DEFAULT 'expense'
            );
        `;

        // Ejecuta la creación de la tabla de categorías
        await this.db.execute(createCategories);
        // Ejecuta la creación de la tabla de gastos
        await this.db.execute(createExpenses);
        
        // Intenta agregar una columna 'type' a la tabla 'expenses' (útil en casos donde la app se actualiza de una versión vieja a una nueva)
        try {
            await this.db.execute("ALTER TABLE expenses ADD COLUMN type TEXT DEFAULT 'expense'");
        } catch(e) {
            // Si la columna ya existe, SQLite arrojará un error, el cual atrapamos e ignoramos silenciosamente
        }

        // Llama a la función para poblar categorías por defecto si la tabla está vacía
        await this.seedInitialCategories();
    }

    /**
     * Siembra (Seeds) categorías esenciales en la base de datos si el usuario no tiene ninguna.
     * Esta es una regla de negocio del proyecto.
     */
    async seedInitialCategories() {
        // Consulta todos los registros en la tabla 'categories'
        const categories = await this.getAll('categories');
        // Si el número de registros es 0, significa que la base de datos está recién creada
        if (categories.length === 0) {
            // Define un arreglo de objetos con las categorías por defecto
            const defaultCategories = [
                { name: 'Alimentación', parent_id: null, icon: '🍎', color: '#ffb3ba' },
                { name: 'Transporte', parent_id: null, icon: '🚗', color: '#ffdfba' },
                { name: 'Servicios', parent_id: null, icon: '🏠', color: '#ffffba' },
                // Las subcategorías hacen referencia a 'parent_id' 3 (Servicios)
                { name: 'Agua', parent_id: 3, icon: '💧', color: '#baffc9' },
                { name: 'Luz', parent_id: 3, icon: '⚡', color: '#bae1ff' }
            ];
            
            // Itera secuencialmente sobre cada categoría por defecto
            for (const cat of defaultCategories) {
                // Inserta la categoría en la tabla
                await this.insert('categories', cat);
            }
        }
    }

    /**
     * Método genérico para insertar un objeto en una tabla.
     * @param {string} tableName - Nombre de la tabla.
     * @param {Object} data - Objeto con pares clave-valor a insertar.
     * @returns {Promise<number>} El ID del último registro insertado.
     */
    async insert(tableName, data) {
        // Extrae las claves del objeto y las une con comas (ej. "name,icon,color")
        const keys = Object.keys(data).join(',');
        // Extrae los valores. Si es null, inserta la palabra clave NULL de SQL. Si no, lo encierra en comillas simples.
        const values = Object.values(data).map(v => (v === null ? 'NULL' : `'${v}'`)).join(',');
        
        // Construye el query de inserción de forma dinámica
        const statement = `INSERT INTO ${tableName} (${keys}) VALUES (${values})`;
        // Ejecuta el query utilizando .run() en lugar de .query()
        const res = await this.db.run(statement);
        
        // Si estamos en entorno web, es necesario forzar un guardado en disco/almacenamiento persistente explícitamente
        if (!this.isNative) await this.sqlite.saveToStore(this.dbName);
        // Retorna el ID autoincremental asignado por SQLite
        return res.changes.lastId;
    }

    /**
     * Método genérico para actualizar un registro existente.
     * @param {string} tableName - Nombre de la tabla.
     * @param {Object} data - Objeto con las propiedades a actualizar, debe contener un campo 'id'.
     */
    async update(tableName, data) {
        // Extrae el ID identificador
        const id = data.id;
        // Crea una cadena de actualizaciones estilo "columna='valor'" separada por comas
        const updates = Object.keys(data)
            // Filtra y descarta el campo 'id' para no intentar actualizar la llave primaria
            .filter(k => k !== 'id')
            // Transforma cada clave y valor, manejando valores null adecuadamente
            .map(k => `${k}=${data[k] === null ? 'NULL' : `'${data[k]}'`}`)
            // Une todos los campos generados con comas
            .join(',');

        // Construye el query dinámico de actualización
        const statement = `UPDATE ${tableName} SET ${updates} WHERE id=${id}`;
        // Ejecuta la actualización
        await this.db.run(statement);
        
        // Fuerza el guardado si estamos en versión web
        if (!this.isNative) await this.sqlite.saveToStore(this.dbName);
    }

    /**
     * Método genérico para borrar un registro por su ID.
     * @param {string} tableName - Nombre de la tabla.
     * @param {number|string} id - ID del registro a borrar.
     */
    async delete(tableName, id) {
        // Construye el query de eliminación
        const statement = `DELETE FROM ${tableName} WHERE id=${id}`;
        // Ejecuta el query
        await this.db.run(statement);
        
        // Fuerza guardado local en la web
        if (!this.isNative) await this.sqlite.saveToStore(this.dbName);
    }

    /**
     * Obtiene todos los registros de una tabla.
     * @param {string} tableName - Nombre de la tabla.
     * @returns {Promise<Array>} Un arreglo de objetos correspondientes a las filas.
     */
    async getAll(tableName) {
        // Query básico de selección total
        const statement = `SELECT * FROM ${tableName}`;
        // Ejecuta la consulta (query() en vez de run()) que devuelve filas
        const res = await this.db.query(statement);
        // Devuelve el array de valores de la respuesta, o un array vacío si no hay data
        return res.values || [];
    }

    /**
     * Obtiene un solo registro específico por ID.
     * @param {string} tableName - Nombre de la tabla.
     * @param {number|string} id - ID a buscar.
     * @returns {Promise<Object|null>} El objeto encontrado, o null si no existe.
     */
    async getById(tableName, id) {
        // Construye la consulta filtrada por ID
        const statement = `SELECT * FROM ${tableName} WHERE id=${id}`;
        // Ejecuta la consulta
        const res = await this.db.query(statement);
        // Verifica si values existe y tiene al menos un elemento; retorna el primer elemento o null
        return res.values && res.values.length > 0 ? res.values[0] : null;
    }
}

// Instancia la clase como Singleton y la exporta
const dbService = new DatabaseService();
export default dbService;
