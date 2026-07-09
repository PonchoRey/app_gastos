// Importa la vista principal del Dashboard
import DashboardView from '../views/DashboardView.js';
// Importa los servicios que proveen soporte de reconocimiento de voz e IA generativa
import voiceRecognitionService from '../services/VoiceRecognitionService.js';
import aiService from '../services/AiService.js';

/**
 * Clase DashboardController
 * Orquesta la lógica principal de la aplicación, controla la vista de inicio (dashboard)
 * y el flujo especial de grabación de gastos por voz con IA.
 */
class DashboardController {
    /**
     * Constructor del controlador del Dashboard.
     */
    constructor() {
        // Inicializa la vista del dashboard
        this.view = new DashboardView();
        
        // Nota explicativa: No se instancian los modelos (ExpenseModel, CategoryModel) aquí.
        // Se usarán de manera global a través del controlador instanciado en 'app.js' para 
        // mantener una única fuente de verdad y evitar recargas redundantes.
        
        // Estado de la fecha actual seleccionada en el dashboard
        this.currentDashboardDate = new Date();
        
        // Enlaza los eventos de la vista con los manejadores (handlers) de esta clase
        this.view.bindMonthNavigation(this.handlePrevMonth.bind(this), this.handleNextMonth.bind(this));
        this.view.bindVoiceRecord(this.handleVoiceRecord.bind(this));
        this.view.bindCancelVoice(this.handleCancelVoice.bind(this));
    }

    /**
     * Carga todos los datos para rellenar la pantalla principal (Dashboard),
     * aplicando el filtro de tiempo exacto del mes seleccionado, calculando totales y renderizando.
     */
    async loadDashboardData() {
        // Actualiza primero la etiqueta visual
        this.view.updateMonthLabel(this.currentDashboardDate);
        // Referencia directa a los modelos alojados en los otros controladores globales
        const expenseModel = window.app.expenseController.model;
        const categoryModel = window.app.categoryController.model;

        // Carga concurrente de la data maestra
        const allExpenses = await expenseModel.getAll();
        const allCategories = await categoryModel.getAll();

        // 1. Filtrado Temporal de todas las transacciones (usando el mes actual seleccionado)
        const filteredExpenses = this.filterExpensesByExactMonth(allExpenses, this.currentDashboardDate);
        
        // 2. Separación de transacciones por tipo (Gastos vs Ingresos)
        const filteredRealExpenses = filteredExpenses.filter(e => e.type !== 'income');
        const filteredIncomes = filteredExpenses.filter(e => e.type === 'income');
        
        // 3. Cálculos Financieros Usando Array.reduce()
        // Acumula la suma total de gastos
        const totalExpenses = filteredRealExpenses.reduce((acc, curr) => acc + curr.amount, 0);
        // Acumula la suma total de ingresos
        const totalIncomes = filteredIncomes.reduce((acc, curr) => acc + curr.amount, 0);
        // Calcula el balance neto o flujo de caja
        const totalBalance = totalIncomes - totalExpenses;
        
        // Ordena a la vista dibujar las tarjetas de resúmenes superiores
        this.view.renderTotals(totalBalance, totalIncomes, totalExpenses);

        // 3.5. Cálculos de Métodos de Pago
        const paymentTotals = {
            credito: 0,
            debito: 0,
            efectivo: 0,
            transferencia: 0
        };
        
        filteredRealExpenses.forEach(exp => {
            const method = exp.payment_method ? exp.payment_method.toLowerCase() : 'efectivo';
            if (paymentTotals[method] !== undefined) {
                paymentTotals[method] += exp.amount;
            } else {
                paymentTotals.efectivo += exp.amount; // fallback
            }
        });
        
        this.view.renderPaymentMethodsTotals(paymentTotals);

        // 4. Agrupación por Categoría PRINCIPAL para alimentar la gráfica de dona y la lista inferior
        const groupedByMainCat = {};
        
        filteredRealExpenses.forEach(exp => {
            // Busca la categoría del gasto actual
            const cat = allCategories.find(c => c.id == exp.category_id);
            // Por defecto, asume que es la categoría principal
            let mainCat = cat;
            // Regla de Negocio: Si la categoría tiene un padre, entonces pertenece a una subcategoría.
            // Para la vista principal del dashboard, se suman los gastos de las subcategorías a su respectiva categoría padre.
            if (cat && cat.parent_id) {
                // Busca al padre; si no lo encuentra por alguna anomalía, hace fallback a ella misma
                mainCat = allCategories.find(c => c.id == cat.parent_id) || cat;
            }
            // Determina el ID final de la agrupación (con manejo de fallbacks a un grupo 'unknown')
            const mainCatId = mainCat ? mainCat.id : 'unknown';
            
            // Si la categoría agrupada no existe aún en el diccionario, la inicializa
            if(!groupedByMainCat[mainCatId]) {
                groupedByMainCat[mainCatId] = {
                    category: mainCat || { id: 'unknown', name: 'Otros', color: '#ccc', icon: '❓' },
                    total: 0
                };
            }
            // Acumula el monto del gasto en su correspondiente categoría padre
            groupedByMainCat[mainCatId].total += exp.amount;
        });

        // Convierte el diccionario/objeto de agrupaciones en un Arreglo (Array) para poder manipularlo con métodos listados
        // y lo ordena de manera descendente (los gastos más pesados primero)
        const groupedDataArray = Object.values(groupedByMainCat).sort((a, b) => b.total - a.total);

        // Prepara los vectores paralelos de datos para enviar a Chart.js (la dona)
        const chartLabels = [];
        const chartValues = [];
        const chartColors = [];

        // Extrae las propiedades de cada agrupación hacia los vectores
        groupedDataArray.forEach(item => {
            chartLabels.push(item.category.name);
            chartValues.push(item.total);
            chartColors.push(item.category.color);
        });

        // 5. Renderizado Final
        // Pide a la vista que dibuje la lista de categorías debajo de la gráfica
        this.view.renderCategoryList(groupedDataArray);

        // Pide a la vista que dibuje la gráfica de dona pasándole los vectores de Chart.js y el monto central
        this.view.renderChart({
            labels: chartLabels,
            values: chartValues,
            colors: chartColors
        }, totalExpenses);
    }

    /**
     * Utilidad (helper) que filtra un listado general de gastos dejando solo los que caen dentro 
     * del mes y año exactos de la fecha proporcionada.
     * @param {Array} expenses - Listado de todas las transacciones.
     * @param {Date} targetDate - Fecha que determina el mes y año a filtrar.
     * @returns {Array} Listado de transacciones filtradas.
     */
    filterExpensesByExactMonth(expenses, targetDate) {
        // Primer día del mes a las 00:00:00
        const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        // Último día del mes a las 23:59:59.999
        const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

        // Filtra el array, retornando solo aquellos elementos cuya fecha caiga dentro del rango del mes
        return expenses.filter(exp => {
            const expDate = new Date(exp.date_recorded);
            return expDate >= startDate && expDate <= endDate;
        });
    }

    /**
     * Navega al mes anterior y recarga los datos.
     */
    handlePrevMonth() {
        this.currentDashboardDate.setMonth(this.currentDashboardDate.getMonth() - 1);
        this.loadDashboardData();
    }

    /**
     * Navega al mes siguiente y recarga los datos.
     */
    handleNextMonth() {
        this.currentDashboardDate.setMonth(this.currentDashboardDate.getMonth() + 1);
        this.loadDashboardData();
    }

    /**
     * Manejador del flujo de Inteligencia Artificial (Microfono -> Reconocimiento de Voz -> Gemini API -> BD).
     */
    async handleVoiceRecord() {
        try {
            // Verifica silenciosamente si existe la API Key primero. 
            // Esto sirve para que, si el usuario cancela el prompt de introducir la clave, el flujo se detenga aquí y NO abra el micrófono en vano.
            aiService.getApiKey();

            // Muestra el overlay visual indicando que está escuchando (estado 1)
            this.view.showVoiceOverlay();
            
            // Lanza el plugin nativo de reconocimiento de voz y se queda esperando (await) a que el usuario termine de dictar
            const transcript = await voiceRecognitionService.startListening();
            
            // Cambia el overlay visual al estado "Procesando" (estado 2) para indicarle al usuario que terminó de grabar y se está analizando
            this.view.setVoiceOverlayProcessing();
            
            // Obtiene los nombres de TODAS las categorías registradas por el usuario para inyectarlas como contexto en el LLM (Gemini)
            const categoryModel = window.app.categoryController.model;
            const allCategories = await categoryModel.getAll();
            const categoryNames = allCategories.map(c => c.name).join(', '); // Cadena: "Alimentación, Transporte, Mascotas"
            
            // Manda la transcripción de voz y el contexto (categorías) a la API de Gemini
            // Esto tomará algunos milisegundos o segundos dependiendo de la red
            const aiResult = await aiService.processVoiceExpense(transcript, categoryNames);
            
            // Evaluamos la intención (acción) dictada por la IA
            if (aiResult.action === 'add_categories' && aiResult.new_categories) {
                // Procedemos a guardar el lote de categorías
                await this.saveAiCategories(aiResult.new_categories);
                this.view.hideVoiceOverlay();
                window.app.showToast(`¡Se agregaron ${aiResult.new_categories.length} categorías nuevas!`);
                
                // Forzar actualización global de las categorías en los controladores
                if (window.app && window.app.categoryController) {
                    await window.app.categoryController.loadCategories();
                }
                if (window.app && window.app.expenseController) {
                    await window.app.expenseController.loadCategoriesForSelect();
                }
                // Refrescar el dashboard por si cambió la gráfica
                this.loadDashboardData();
            } else if (aiResult.action === 'add_expenses' && aiResult.expenses && Array.isArray(aiResult.expenses)) {
                // Flujo múltiple: Gemini nos devolvió un arreglo de gastos/ingresos
                for (const exp of aiResult.expenses) {
                    await this.saveAiExpense(exp);
                }
                
                this.view.hideVoiceOverlay();
                window.app.showToast(`¡Se registraron ${aiResult.expenses.length} movimientos exitosamente!`);
                
                // Refresca los componentes visuales del dashboard
                this.loadDashboardData();
            } else {
                // Flujo tradicional: Gemini nos devolvió un gasto/ingreso estructurado (singular, retrocompatibilidad)
                await this.saveAiExpense(aiResult);
                
                this.view.hideVoiceOverlay();
                window.app.showToast(`¡${aiResult.type === 'income' ? 'Ingreso' : 'Gasto'} registrado exitosamente!`);
                
                // Refresca los componentes visuales del dashboard
                this.loadDashboardData();
            }
            
        } catch (error) {
            console.error(error);
            // En caso de aborto (el usuario cerró), fallo en permisos, de red, o error de Gemini:
            // Asegura ocultar el overlay
            this.view.hideVoiceOverlay();
            // Muestra un toast (notificación) rojo de advertencia
            window.app.showToast(error.message || "No se pudo procesar la voz.", "danger");
        }
    }

    /**
     * Aborta forzadamente el proceso de reconocimiento de voz en caso de que el usuario pulse cancelar en el overlay.
     */
    handleCancelVoice() {
        // Ordena la detención del plugin nativo del micrófono
        voiceRecognitionService.stopListening();
        // Oculta la vista
        this.view.hideVoiceOverlay();
    }

    /**
     * Mapea y normaliza el resultado obtenido por la IA hacia la base de datos para efectuar el insert real.
     * @param {Object} aiResult - JSON devuelto por Gemini.
     */
    async saveAiExpense(aiResult) {
        const expenseModel = window.app.expenseController.model;
        const categoryModel = window.app.categoryController.model;
        
        // Obtiene las categorías de la base de datos
        const allCategories = await categoryModel.getAll();
        
        let categoryId = null;
        // Estrategia heurística simple para encontrar el ID de categoría:
        // Si Gemini devolvió un nombre de categoría...
        if (aiResult.category_name) {
            // Normaliza a minúsculas
            const aiCatLower = aiResult.category_name.toLowerCase();
            // Busca la categoría localmente que contenga esa palabra o viceversa
            const match = allCategories.find(c => 
                c.name.toLowerCase().includes(aiCatLower) || 
                aiCatLower.includes(c.name.toLowerCase())
            );
            if (match) {
                // Si hizo 'match' (coincidencia), rescata su ID
                categoryId = match.id;
            }
        }
        
        // Regla de salvaguarda (fallback): 
        // Si no se encontró ninguna categoría (o Gemini alucinó un nombre que no coincide), selecciona arbitrariamente la primera categoría que haya
        if (!categoryId && allCategories.length > 0) {
            categoryId = allCategories[0].id;
        }
        
        // Normaliza el método de pago por si la IA devuelve algo diferente
        let parsedMethod = (aiResult.payment_method || 'efectivo').toLowerCase();
        const validMethods = ['efectivo', 'credito', 'transferencia', 'debito'];
        if (!validMethods.includes(parsedMethod)) {
            parsedMethod = 'efectivo';
        }

        // Estructura el registro a insertar como dicta el modelo
        const expenseData = {
            // Transforma con parseFloat para evitar errores de tipo, asume 0 si es NaN (esto evita bloqueos fatales)
            amount: parseFloat(aiResult.amount) || 0,
            category_id: categoryId,
            // Asigna el método de pago extraído por la IA y normalizado
            payment_method: parsedMethod, 
            note: aiResult.note || '',
            // Se asegura de que sea estrictamente 'income' o 'expense'
            type: aiResult.type === 'income' ? 'income' : 'expense',
            date_recorded: new Date().toISOString()
        };
        
        // Efectúa la escritura a la base de datos mediante el modelo
        await expenseModel.create(expenseData);
    }

    /**
     * Guarda un lote de categorías devueltas por la Inteligencia Artificial.
     * @param {Array} categoriesArray - Arreglo de objetos con name, icon y color.
     */
    async saveAiCategories(categoriesArray) {
        const categoryModel = window.app.categoryController.model;
        
        // Iterar sobre las categorías propuestas por la IA
        for (const cat of categoriesArray) {
            const newCategory = {
                name: cat.name || 'Nueva Categoría',
                icon: cat.icon || '📌',
                color: cat.color || '#cccccc',
                parent_id: null // Se guardan como principales por defecto
            };
            
            await categoryModel.create(newCategory);
        }
    }
}

export default DashboardController;
