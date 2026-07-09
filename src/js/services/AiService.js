/**
 * Clase AiService
 * Se encarga de la comunicación con la API de Google Gemini para procesar 
 * dictados de voz y extraer información estructurada sobre gastos.
 */
class AiService {
    /**
     * Constructor de la clase AiService.
     * Inicializa las propiedades necesarias para conectarse a la API de Gemini.
     */
    constructor() {
        // Intenta recuperar la clave de la API guardada previamente en el almacenamiento local del navegador
        this.apiKey = localStorage.getItem('gemini_api_key');
        // Define la URL base del endpoint de la API de Gemini (modelo flash-lite)
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=';
    }

    /**
     * Obtiene y gestiona la API Key.
     * Si no existe en el localStorage, solicita al usuario que la ingrese mediante un prompt.
     * @returns {string|null} La API Key ingresada o recuperada, o null si el usuario cancela.
     */
    getApiKey() {
        // Verifica si la propiedad apiKey está vacía
        if (!this.apiKey) {
            // Lanza un error indicando que falta la clave, esto será atrapado por el controlador 
            // y mostrado como un Toast rojo amigable al usuario, sin usar el prompt nativo.
            throw new Error("Falta la API Key. Por favor, configúrala en la sección de Ajustes.");
        }
        // Devuelve la clave almacenada
        return this.apiKey;
    }

    /**
     * Procesa una cadena de texto (dictado) enviándola a Gemini para extraer los datos del gasto.
     * @param {string} text - El texto hablado por el usuario que ha sido transcrito a texto.
     * @param {string} categoryNames - Una cadena con los nombres de las categorías disponibles en la BD para que la IA elija.
     * @returns {Promise<Object>} Promesa que resuelve a un objeto JSON con 'amount', 'category_name', 'note' y 'type'.
     */
    async processVoiceExpense(text, categoryNames = "") {
        // Asegura que tengamos la clave de API antes de hacer la petición
        const key = this.getApiKey();
        // Si sigue sin haber clave (ej. el usuario canceló el prompt), lanza un error
        if (!key) {
            throw new Error("No se proporcionó una API Key para Gemini.");
        }

        // Construcción del Prompt o instrucción para el LLM
        // Se le asigna el rol de experto, se le dan reglas precisas y se inyecta la lista de categorías válidas
        const promptText = `
Eres un asistente experto en finanzas personales. Tu objetivo es extraer los datos a partir del dictado de voz del usuario.

NUEVAS REGLAS DE INTENCIÓN:
Primero, determina la intención del usuario ("action").
- Si el usuario dice explícitamente palabras como "agrega categorías", "crea categorías", "nuevas categorías", etc., la acción es "add_categories".
- Si el usuario dicta uno o varios gastos o ingresos normales (ej. "pagué", "compré", "recibí", "me pagaron", "después fui"), la acción es "add_expenses".

REGLAS PARA "add_expenses":
1. Genera un arreglo de objetos llamado "expenses" conteniendo todos los gastos e ingresos dictados. Puedes identificar varios si el usuario menciona distintas compras en el mismo dictado.
2. Para cada gasto/ingreso debes extraer:
   - "amount": el monto numérico. Si no menciona cantidad, asigna 0.
   - "category_name": la categoría más lógica basándote EXCLUSIVAMENTE en estas opciones: [${categoryNames}]. Si no encaja, usa "Otros".
   - "note": un resumen breve de ese gasto en particular. No inventes cosas.
   - "type": "expense" para salidas, "income" para entradas.
   - "payment_method": estrictamente "efectivo", "credito", "transferencia" o "debito". Si no lo menciona, asume "efectivo". Si menciona pago con tarjeta y no especifica, usa "debito".

REGLAS PARA "add_categories":
1. Genera un arreglo de objetos llamado "new_categories".
2. Cada categoría debe tener:
   - "name": el nombre que dijo el usuario, capitalizado (Ej: "Cine", "Nómina").
   - "icon": un emoji que la represente mejor.
   - "color": un color hexadecimal representativo y vibrante.

Devuelve ÚNICAMENTE un JSON válido sin markdown, sin código y sin texto adicional.

Esquema si son gastos/ingresos:
{
  "action": "add_expenses",
  "expenses": [
    {
      "amount": 20.5,
      "category_name": "Alimentación",
      "note": "Fui a la tienda",
      "type": "expense",
      "payment_method": "credito"
    },
    {
      "amount": 120,
      "category_name": "Alimentación",
      "note": "Cena de tacos",
      "type": "expense",
      "payment_method": "efectivo"
    }
  ]
}

Esquema si son nuevas categorías:
{
  "action": "add_categories",
  "new_categories": [
    {"name": "Cine", "icon": "🍿", "color": "#E50914"},
    {"name": "Doctor", "icon": "👨‍⚕️", "color": "#008000"}
  ]
}

Texto dictado por el usuario: "${text}"
`;

        try {
            // Realiza la petición HTTP POST a la URL de Gemini agregándole la API Key
            const response = await fetch(this.apiUrl + key, {
                // Especifica el método de la petición
                method: 'POST',
                // Define los encabezados indicando que se enviará contenido en formato JSON
                headers: {
                    'Content-Type': 'application/json'
                },
                // Convierte el objeto JavaScript (el cuerpo de la petición) a una cadena JSON
                body: JSON.stringify({
                    // Estructura de contenido requerida por la API de Gemini
                    contents: [{
                        parts: [{ text: promptText }] // Inserta el prompt construido arriba
                    }],
                    // Configuración para la generación de texto
                    generationConfig: {
                        // Temperatura baja (0.1) para que el modelo sea más determinista y menos creativo (ideal para extraer JSON)
                        temperature: 0.1 
                    }
                })
            });

            // Verifica si la respuesta HTTP no fue exitosa (ej. status 4xx o 5xx)
            if (!response.ok) {
                // Intenta parsear el cuerpo del error que devuelve la API
                const errData = await response.json();
                // Extrae el mensaje de error o usa el statusText por defecto
                const errMsg = errData.error?.message || response.statusText;
                
                // Si la clave es inválida (error de autenticación 401 o 403)
                if (response.status === 401 || response.status === 403 || errMsg.toLowerCase().includes("invalid authentication") || errMsg.toLowerCase().includes("api key")) {
                    // Limpia la propiedad en memoria
                    this.apiKey = null;
                    // Elimina la clave del almacenamiento local para forzar a pedirla de nuevo en el próximo intento
                    localStorage.removeItem('gemini_api_key');
                    // Lanza un error indicativo
                    throw new Error("Clave de API inválida o caducada. Se ha borrado, por favor intenta de nuevo.");
                }
                
                // Lanza un error genérico si falló por otra razón
                throw new Error("Error en la API de Gemini: " + errMsg);
            }

            // Si la petición fue exitosa, parsea la respuesta JSON
            const data = await response.json();
            // Navega por el árbol de la respuesta de Gemini para extraer el texto generado
            let textResponse = data.candidates[0].content.parts[0].text;
            
            // Limpieza del texto recibido: elimina los posibles bloques de código Markdown (```json y ```)
            textResponse = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
            
            // Convierte el string resultante (que debería ser solo la estructura JSON) a un objeto JavaScript
            return JSON.parse(textResponse);
        } catch (error) {
            // Imprime el error en la consola para propósitos de depuración
            console.error("Error en AiService:", error);
            // Vuelve a lanzar el error para que sea manejado por quien invocó este método
            throw error;
        }
    }
}

// Se instancia la clase usando el patrón Singleton de facto y se exporta para su uso global
const aiService = new AiService();
export default aiService;
