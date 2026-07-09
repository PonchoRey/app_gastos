/**
 * Clase CategoryView
 * Administra la vista de "Categorías", mostrando la lista jerárquica de categorías,
 * y manejando el modal para crear, editar o eliminar categorías.
 */
class CategoryView {
    /**
     * Constructor de la vista.
     * Obtiene referencias a los elementos clave del DOM necesarios para la interacción.
     */
    constructor() {
        // Contenedor principal donde se inyecta la lista de categorías
        this.categoriesList = document.getElementById('categoriesList');
        // Instancia del Modal de Bootstrap para crear/editar categorías
        this.categoryModal = new bootstrap.Modal(document.getElementById('categoryModal'));
        // El formulario dentro del modal
        this.categoryForm = document.getElementById('categoryForm');
        
        // Campos del formulario
        this.categoryId = document.getElementById('categoryId'); // Input oculto para el ID si estamos editando
        this.categoryName = document.getElementById('categoryName'); // Nombre
        this.categoryParent = document.getElementById('categoryParent'); // Select para elegir la categoría padre
        this.categoryIcon = document.getElementById('categoryIcon'); // Icono/Emoji
        this.categoryColor = document.getElementById('categoryColor'); // Selector de color hexadecimal
        this.modalTitle = document.getElementById('categoryModalTitle'); // Título del modal que cambia dinámicamente
        this.deleteCategoryBtn = document.getElementById('deleteCategoryBtn'); // Botón de eliminar (oculto al crear)
    }

    /**
     * Enlaza el evento 'submit' del formulario con el controlador.
     * @param {Function} handler - Función del controlador que procesará los datos guardados.
     */
    bindSaveCategory(handler) {
        // Escucha el evento de envío del formulario
        this.categoryForm.addEventListener('submit', event => {
            // Previene el comportamiento por defecto (recarga de página)
            event.preventDefault();
            // Construye un objeto con los datos recolectados del formulario
            const categoryData = {
                // Si hay un valor en ID, se convierte a número (modo edición), de lo contrario es null (modo creación)
                id: this.categoryId.value ? parseInt(this.categoryId.value) : null,
                name: this.categoryName.value,
                // Si se seleccionó un padre, extrae su ID, de lo contrario la categoría es principal (null)
                parent_id: this.categoryParent.value ? parseInt(this.categoryParent.value) : null,
                icon: this.categoryIcon.value,
                color: this.categoryColor.value
            };
            // Pasa los datos al controlador
            handler(categoryData);
        });
    }

    /**
     * Enlaza el clic del botón eliminar con el controlador.
     * @param {Function} handler - Función del controlador que ejecutará el borrado.
     */
    bindDeleteCategory(handler) {
        // Escucha el clic en el botón de eliminar del modal
        this.deleteCategoryBtn.addEventListener('click', () => {
            // Solo procede si existe un ID cargado (es decir, estamos editando una categoría existente)
            if (this.categoryId.value) {
                const id = parseInt(this.categoryId.value);
                // Muestra un diálogo de confirmación nativo del navegador antes de realizar una acción destructiva
                if (confirm('¿Estás seguro de eliminar esta categoría?')) {
                    // Si confirma, llama al controlador
                    handler(id);
                }
            }
        });
    }

    /**
     * Delega el evento de clic en los botones de "Editar" que se generan dinámicamente en la lista.
     * @param {Function} handler - Función del controlador para cargar datos en el modal.
     */
    bindEditCategory(handler) {
        // Se añade un listener al contenedor padre (event delegation) para atrapar clics en botones creados dinámicamente
        this.categoriesList.addEventListener('click', event => {
            // Verifica si el clic ocurrió en un elemento con la clase .edit-category-btn (o dentro de él)
            if (event.target.closest('.edit-category-btn')) {
                // Obtiene la referencia real al botón
                const btn = event.target.closest('.edit-category-btn');
                // Extrae el ID de la categoría almacenado en el atributo data-id
                const id = parseInt(btn.dataset.id);
                // Pasa el ID al controlador
                handler(id);
            }
        });
    }

    /**
     * Renderiza la lista jerárquica de categorías y subcategorías en la UI.
     * @param {Array} structuredCategories - Arreglo de categorías principales con sus subcategorías anidadas (.children).
     * @param {Object} totals - Objeto diccionario con los totales acumulados por categoría (monto y conteo).
     */
    renderCategories(structuredCategories, totals = {}) {
        // Limpia el contenedor
        this.categoriesList.innerHTML = '';
        
        // Verifica si no hay categorías para mostrar un estado vacío (Empty state)
        if (structuredCategories.length === 0) {
            this.categoriesList.innerHTML = `
                <div class="text-center py-5">
                    <!-- Icono grande decorativo -->
                    <i class="bi bi-tags text-muted" style="font-size: 3rem; opacity: 0.5;"></i>
                    <p class="mt-3 mb-1 fw-bold" style="color: var(--text-primary);">Aún no tienes categorías</p>
                    <p class="small text-muted mb-4">Crea una categoría para empezar a organizar tus gastos.</p>
                </div>
            `;
            return;
        }

        // Itera sobre las categorías principales
        structuredCategories.forEach((cat, index) => {
            // Crea el contenedor base para esta categoría
            const item = document.createElement('div');
            item.className = 'list-group-item p-0 border-0';
            item.style.backgroundColor = 'transparent';
            item.style.marginBottom = '8px';
            
            // Intenta obtener los totales precalculados de esta categoría (o valores por defecto 0 si no tiene gastos)
            const catTotal = totals[cat.id] || { count: 0, amount: 0 };
            // Formatea el monto gastado a moneda para visualización
            const amountFormatted = parseFloat(catTotal.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            
            // Alterna el color de fondo para crear bandas (patrón cebra) visualmente separadoras
            const bgColor = index % 2 === 0 ? 'var(--bg-table-row-even)' : 'var(--bg-table-row-odd)';
            
            // Construye el HTML de la "Tarjeta" o "Fila" de la Categoría Principal
            let html = `
                <div class="d-flex justify-content-between align-items-center p-3 rounded table-custom-row" style="background-color: ${bgColor}; border: 1px solid var(--border-table);">
                    <div class="d-flex align-items-center position-relative w-100">
                        <!-- Banda indicadora de color a la izquierda -->
                        <div style="position: absolute; left: -16px; top: 10%; bottom: 10%; width: 3px; background-color: ${cat.color}; border-radius: 0 4px 4px 0;"></div>
                        <!-- Icono o un signo de interrogación si no existe -->
                        <span class="fs-4 me-3">${cat.icon || '❓'}</span>
                        <div class="flex-grow-1">
                            <h6 class="mb-0 fw-bold" style="color: var(--text-table-body); font-size: 0.95rem;">${cat.name}</h6>
                            <!-- Muestra el conteo de transacciones y el monto total en la categoría principal -->
                            <small style="color: var(--text-table-header);">${catTotal.count} gastos • $${amountFormatted}</small>
                        </div>
                        <div>
                            <!-- Botón para editar esta categoría principal; incluye data-id -->
                            <button class="btn btn-sm edit-category-btn" data-id="${cat.id}" style="background-color: transparent; border: none;" title="Editar">
                                <i class="bi bi-pencil" style="color: var(--accent-warning); font-size: 0.9rem;"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Verificamos si esta categoría principal tiene subcategorías (hijos)
            if (cat.children && cat.children.length > 0) {
                // Si tiene hijos, abrimos un bloque indentado (ms-3) con un borde lateral (border-left)
                html += '<div class="ms-3 mt-1 ps-2" style="border-left: 2px solid var(--border-table);">';
                
                // Iteramos sobre cada subcategoría
                cat.children.forEach(sub => {
                    // Extraemos totales específicos de la subcategoría
                    const subTotal = totals[sub.id] || { count: 0, amount: 0 };
                    const subAmount = parseFloat(subTotal.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    
                    // Añadimos el HTML para la subcategoría, usando un estilo ligeramente distinto (borde dashed, menor padding)
                    html += `
                        <div class="d-flex justify-content-between align-items-center p-2 rounded table-custom-row mt-1" style="background-color: var(--bg-table-row-even); border: 1px dashed var(--border-table);">
                            <div class="d-flex align-items-center w-100">
                                <span class="fs-5 me-2">${sub.icon || '❓'}</span>
                                <div class="flex-grow-1">
                                    <h6 class="mb-0 fw-bold" style="color: var(--text-table-body); font-size: 0.85rem;">${sub.name}</h6>
                                    <small style="color: var(--text-table-header); font-size: 0.75rem;">${subTotal.count} gastos • $${subAmount}</small>
                                </div>
                                <div>
                                    <!-- Botón de edición de la subcategoría -->
                                    <button class="btn btn-sm edit-category-btn p-1" data-id="${sub.id}" style="background-color: transparent; border: none;">
                                        <i class="bi bi-pencil" style="color: var(--text-table-header); font-size: 0.8rem;"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                // Cerramos el contenedor de las subcategorías
                html += '</div>';
            }

            // Asignamos el HTML acumulado (padre + hijos) al elemento principal de lista y lo inyectamos
            item.innerHTML = html;
            this.categoriesList.appendChild(item);
        });
    }

    /**
     * Rellena el campo "Select" del formulario con las categorías principales que pueden actuar como padres.
     * @param {Array} mainCategories - Lista de categorías que no tienen parent_id.
     */
    populateParentSelect(mainCategories) {
        // Opción predeterminada vacía, lo que implica que la categoría a crear/editar será "Principal"
        this.categoryParent.innerHTML = '<option value="">Ninguna (Es categoría principal)</option>';
        // Añade una etiqueta <option> por cada categoría principal
        mainCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id; // El valor que se enviará es el ID
            option.textContent = cat.name; // El texto visible es el nombre
            this.categoryParent.appendChild(option);
        });
    }

    /**
     * Abre el modal (ventana flotante) preparándolo para crear o editar.
     * @param {Object|null} category - Objeto de categoría si es edición, null si es creación.
     */
    openModal(category = null) {
        // Limpia el formulario previniendo datos sucios de usos anteriores
        this.categoryForm.reset();
        
        if (category) {
            // MODO EDICIÓN
            this.modalTitle.textContent = 'Editar Categoría';
            // Carga los datos existentes en los campos del formulario
            this.categoryId.value = category.id;
            this.categoryName.value = category.name;
            // Maneja casos donde parent_id puede ser null
            this.categoryParent.value = category.parent_id || '';
            this.categoryIcon.value = category.icon;
            this.categoryColor.value = category.color;
            // Muestra el botón de eliminar
            this.deleteCategoryBtn.classList.remove('d-none');
        } else {
            // MODO CREACIÓN
            this.modalTitle.textContent = 'Nueva Categoría';
            // Limpia el ID oculto
            this.categoryId.value = '';
            // Asigna un color aleatorio o predeterminado para facilitar la creación rápida
            this.categoryColor.value = '#5B5FC7'; 
            // Oculta el botón de eliminar, ya que no se puede eliminar algo que no existe
            this.deleteCategoryBtn.classList.add('d-none');
        }
        
        // Manda la orden a Bootstrap para mostrar el elemento
        this.categoryModal.show();
    }

    /**
     * Cierra y oculta el modal programáticamente.
     */
    closeModal() {
        this.categoryModal.hide();
    }
}

export default CategoryView;
