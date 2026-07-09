/**
 * Clase ExpenseView
 * Maneja la UI de la pantalla "Registrar Gasto" (que técnicamente podría soportar Ingresos).
 * Administra el formulario de captura, edición y eliminación de un registro.
 */
class ExpenseView {
    /**
     * Constructor de la vista.
     * Enlaza los elementos de la interfaz de usuario con variables internas para su control.
     */
    constructor() {
        // Elemento Formulario de Registro
        this.expenseForm = document.getElementById('expenseForm');
        // Input para el Monto Numérico
        this.expenseAmount = document.getElementById('expenseAmount');
        // Select Desplegable para seleccionar la Categoría del gasto
        this.expenseCategory = document.getElementById('expenseCategory');
        // Input de tipo fecha (date)
        this.expenseDate = document.getElementById('expenseDate');
        // Textarea para añadir descripciones o notas opcionales
        this.expenseNote = document.getElementById('expenseNote');
        
        // Elementos Radio Buttons para Métodos de Pago
        this.methodCard = document.getElementById('methodCard'); // Tarjeta (por defecto)
        this.methodCash = document.getElementById('methodCash'); // Efectivo
        this.methodTransfer = document.getElementById('methodTransfer'); // Transferencia
        this.methodDebit = document.getElementById('methodDebit'); // Débito
        
        // Elementos específicos de edición
        this.expenseId = document.getElementById('expenseId'); // Input oculto para identificar el registro
        this.expenseFormTitle = document.getElementById('expenseFormTitle'); // Título dinámico (Nuevo vs Editar)
        this.deleteExpenseBtn = document.getElementById('deleteExpenseBtn'); // Botón de eliminación
        
        // Toggle Switch (Interruptor) para alternar entre "Gasto" e "Ingreso"
        this.expenseTypeToggle = document.getElementById('expenseTypeToggle');
        this.labelExpense = document.getElementById('labelExpense');
        this.labelIncome = document.getElementById('labelIncome');
        
        // Si el toggle existe en el DOM, se le asigna un event listener de cambio para ajustar colores
        if (this.expenseTypeToggle) {
            this.expenseTypeToggle.addEventListener('change', () => this._updateToggleColors());
        }
        
        // Inicializa el campo de fecha con el día de hoy por defecto al cargar la vista
        if (this.expenseDate) {
            // Extrae la porción 'YYYY-MM-DD' de la fecha actual en la zona horaria local
            this.expenseDate.value = this._getLocalDateString();
            // Deshabilita la fecha en modo creación (solo se permite editar fecha al modificar un gasto viejo)
            this.expenseDate.disabled = true;
        }

        // Formateador automático (máscara) para el input numérico del monto (separa con comas)
        if (this.expenseAmount) {
            // Cada que el usuario ingresa un caracter, se llama a la función formateadora privada
            this.expenseAmount.addEventListener('input', (e) => this._formatAmountInput(e));
        }
    }

    /**
     * [Privado] Formatea en tiempo real el campo de texto del monto (e.g. 1000 -> 1,000).
     * @param {Event} e - El evento Input disparado por el teclado.
     */
    _formatAmountInput(e) {
        // Obtiene el valor actual tecleado
        let value = e.target.value;
        // Elimina mediante expresión regular todos los caracteres que no sean dígitos numéricos o punto
        value = value.replace(/[^\d.]/g, '');
        
        // Divide el valor separándolo por el punto para analizar la parte entera y decimal
        const parts = value.split('.');
        // Previene múltiples puntos decimales: Si hay más de uno, pega los demás al bloque decimal
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // Si hay texto después del filtrado
        if (value.length > 0) {
            // Si el valor tiene decimales
            if (parts.length > 1) {
                let intPart = parts[0];
                // Formatea la parte entera con separadores de miles
                if (intPart !== '') {
                    intPart = parseInt(intPart).toLocaleString('en-US');
                }
                // Vuelve a unir la parte entera formateada con el punto y su parte decimal
                e.target.value = intPart + '.' + parts[1];
            } else {
                // Si no hay decimales, simplemente formatea todo el número como entero
                e.target.value = parseInt(value).toLocaleString('en-US');
            }
        } else {
            // Si quedó vacío, asigna string vacío
            e.target.value = '';
        }
    }

    /**
     * [Privado] Obtiene la fecha local en formato YYYY-MM-DD
     * @param {Date} dateObj - Objeto fecha (por defecto la actual)
     * @returns {string} Fecha formateada
     */
    _getLocalDateString(dateObj = new Date()) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * [Privado] Actualiza los colores de las etiquetas de Gasto e Ingreso dependiendo de la posición del Toggle.
     */
    _updateToggleColors() {
        if (!this.expenseTypeToggle || !this.labelExpense || !this.labelIncome) return;
        
        // Si el checkbox está marcado (true -> es modo Ingreso)
        if (this.expenseTypeToggle.checked) {
            // Resetea el color del label de gasto y lo pone en tono secundario (gris)
            this.labelExpense.style.color = '';
            this.labelExpense.classList.remove('text-danger');
            this.labelExpense.style.setProperty('color', 'var(--bs-secondary)', 'important');
            // Resalta la etiqueta de Ingreso con un color verde indicativo (#13A10E)
            this.labelIncome.style.setProperty('color', '#13A10E', 'important');
        } else {
            // Si no está marcado (false -> es modo Gasto)
            // Resetea el ingreso a secundario grisáceo
            this.labelIncome.style.color = '';
            this.labelIncome.style.setProperty('color', 'var(--bs-secondary)', 'important');
            // Resalta el gasto con el color de acento de peligro (rojo suave)
            this.labelExpense.style.setProperty('color', 'var(--accent-danger-light)', 'important');
        }
    }

    /**
     * Enlaza la acción de guardar el formulario con el controlador.
     * @param {Function} handler - Función a llamar pasando el objeto de datos.
     */
    bindSaveExpense(handler) {
        this.expenseForm.addEventListener('submit', event => {
            // Previene recarga de la página
            event.preventDefault();

            // Lógica para determinar qué RadioButton está marcado
            let paymentMethod = 'tarjeta'; // Valor por defecto fallback
            if (this.methodCash && this.methodCash.checked) paymentMethod = 'efectivo';
            if (this.methodTransfer && this.methodTransfer.checked) paymentMethod = 'transferencia';
            if (this.methodDebit && this.methodDebit.checked) paymentMethod = 'debito';

            // Extrae la fecha seleccionada o toma la fecha de hoy local si no hubiera campo
            const dateVal = this.expenseDate ? this.expenseDate.value : this._getLocalDateString();

            // Lógica para asignar la hora del registro
            let finalDateStr;
            if (this.expenseId.value && this._editingOriginalDate && dateVal === this._getLocalDateString(new Date(this._editingOriginalDate))) {
                // Si estamos editando y no se cambió el día, preservamos la fecha y hora original exacta
                finalDateStr = this._editingOriginalDate;
            } else {
                // Si es un registro nuevo, o si el usuario cambió el día durante la edición, usamos la hora actual
                const now = new Date();
                const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                finalDateStr = new Date(`${dateVal}T${timeString}`).toISOString();
            }

            // Ensambla el objeto con los datos procesados para el modelo
            const expenseData = {
                // Convierte a número si hay ID oculto, sino lo deja null
                id: this.expenseId.value ? parseInt(this.expenseId.value) : null,
                // Convierte a flotante removiendo antes las comas agregadas por la máscara
                amount: parseFloat(this.expenseAmount.value.replace(/,/g, '')),
                // Parsea el ID de categoría seleccionada
                category_id: parseInt(this.expenseCategory.value),
                payment_method: paymentMethod,
                note: this.expenseNote.value,
                // Usa la fecha calculada
                date_recorded: finalDateStr,
                // Define el tipo transaccional dependiendo del estado del toggle
                type: this.expenseTypeToggle && this.expenseTypeToggle.checked ? 'income' : 'expense'
            };

            // Llama a la función provista inyectándole los datos listos
            handler(expenseData);
        });
    }

    /**
     * Enlaza el clic en el botón de eliminación rojo con el controlador.
     * @param {Function} handler - Función a invocar pasando el ID del registro.
     */
    bindDeleteExpense(handler) {
        this.deleteExpenseBtn.addEventListener('click', () => {
            // Solo avanza si realmente hay un ID para borrar (se está editando)
            if (this.expenseId.value) {
                // Delega al controlador pasándole el ID convertido a entero
                handler(parseInt(this.expenseId.value));
            }
        });
    }

    /**
     * Rellena el formulario con los datos de un gasto existente para modo "Edición".
     * @param {Object} expense - El registro extraído de la base de datos.
     */
    loadForEdit(expense) {
        // Guarda la fecha original para preservarla (incluyendo su hora) si no se cambia de día
        this._editingOriginalDate = expense.date_recorded;

        // Carga los identificadores, la categoría y notas
        this.expenseId.value = expense.id;
        // Aplica el formato de separadores con máximo 2 decimales para renderizarlo
        this.expenseAmount.value = expense.amount ? expense.amount.toLocaleString('en-US', {maximumFractionDigits: 2}) : '';
        this.expenseCategory.value = expense.category_id;
        this.expenseNote.value = expense.note || '';
        
        // Si hay una fecha en el registro, extrae la fecha local y se la asigna al input tipo 'date'
        if (this.expenseDate && expense.date_recorded) {
            this.expenseDate.value = this._getLocalDateString(new Date(expense.date_recorded));
            // Bloquea el campo de fecha para que no pueda ser editado según regla de negocio
            this.expenseDate.disabled = true;
        }

        // Bloquea el campo de categoría para que no pueda ser editado
        this.expenseCategory.disabled = true;

        // Selección dinámica del Radio Button correspondiente al método de pago usado
        const method = expense.payment_method;
        if (method === 'efectivo' && this.methodCash) this.methodCash.checked = true;
        else if (method === 'transferencia' && this.methodTransfer) this.methodTransfer.checked = true;
        else if (method === 'debito' && this.methodDebit) this.methodDebit.checked = true;
        else if (this.methodCard) this.methodCard.checked = true; // Por defecto o catch-all

        // Ajusta el estado visual y funcional del switch (Toggle) dependiendo del tipo
        if (this.expenseTypeToggle) {
            this.expenseTypeToggle.checked = expense.type === 'income';
            this._updateToggleColors();
        }

        // Actualiza el título y muestra el botón destructor
        this.expenseFormTitle.textContent = 'Editar Registro';
        this.deleteExpenseBtn.classList.remove('d-none');
    }

    /**
     * Llena el campo <select> de categorías de forma jerárquica.
     * Agrupa subcategorías debajo de un <optgroup> con el nombre de su categoría padre.
     * @param {Array} structuredCategories - Estructura de categorías principales con arreglo 'children'.
     */
    populateCategoriesDropdown(structuredCategories) {
        // Guarda el valor actual seleccionado para restaurarlo después de reconstruir el DOM
        const previousValue = this.expenseCategory.value;

        // Inicializa el HTML interno dejando solo una opción deshabilitada por defecto de instrucción
        this.expenseCategory.innerHTML = '<option value="" selected disabled>Seleccionar...</option>';
        
        // Itera sobre el árbol de categorías
        structuredCategories.forEach(mainCat => {
            // Verifica si la categoría principal tiene elementos hijos (subcategorías)
            if (mainCat.children && mainCat.children.length > 0) {
                // Crea un grupo de opciones agrupadas
                const optgroup = document.createElement('optgroup');
                // Etiqueta el grupo con el nombre del Padre (ej: Servicios)
                optgroup.label = mainCat.name;
                
                // Itera sobre los hijos e insértalos en el grupo
                mainCat.children.forEach(sub => {
                    const option = document.createElement('option');
                    option.value = sub.id; // Guarda el ID de la subcategoría en valor
                    option.textContent = sub.name; // Muestra el texto de la subcategoría
                    optgroup.appendChild(option);
                });
                
                // Añade todo el bloque estructurado al <select> principal
                this.expenseCategory.appendChild(optgroup);
            } else {
                // Si la categoría no tiene hijos, la añade directamente a la raíz del <select>
                const option = document.createElement('option');
                option.value = mainCat.id;
                option.textContent = mainCat.name;
                this.expenseCategory.appendChild(option);
            }
        });

        // Restaura el valor seleccionado si existía previamente
        if (previousValue) {
            this.expenseCategory.value = previousValue;
        }
    }

    /**
     * Limpia completamente el formulario, regresándolo a su estado predeterminado de 'Creación'.
     */
    resetForm() {
        // Resetea la fecha original de edición si existía
        this._editingOriginalDate = null;
        // Resetea los campos base HTML de forma nativa
        this.expenseForm.reset();
        // Vacía el campo de control oculto ID
        this.expenseId.value = '';
        
        // Habilita nuevamente la categoría para nuevos registros
        this.expenseCategory.disabled = false;
        
        // Restaura la fecha actual local y la desactiva
        if (this.expenseDate) {
            this.expenseDate.value = this._getLocalDateString();
            this.expenseDate.disabled = true;
        }
        // Restaura el switch al modo Gasto predeterminado
        if (this.expenseTypeToggle) {
            this.expenseTypeToggle.checked = false;
            this._updateToggleColors();
        }
        // Restaura títulos y esconde eliminación
        this.expenseFormTitle.textContent = 'Registrar G - I';
        this.deleteExpenseBtn.classList.add('d-none');
    }
}

export default ExpenseView;
