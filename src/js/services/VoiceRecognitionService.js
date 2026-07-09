// Importa el plugin comunitario de Capacitor para interactuar con la API nativa de reconocimiento de voz del dispositivo
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

/**
 * Clase VoiceRecognitionService
 * Gestiona el acceso al micrófono y el reconocimiento de voz nativo en dispositivos móviles.
 */
class VoiceRecognitionService {
    /**
     * Constructor del servicio.
     * Inicializa el estado para saber si ya se está escuchando o no.
     */
    constructor() {
        // Bandera (flag) que previene lanzar múltiples escuchas simultáneas
        this.isListening = false;
    }

    /**
     * Verifica si el dispositivo y plataforma actual soportan el reconocimiento de voz nativo.
     * @returns {Promise<boolean>} True si es soportado, false si no.
     */
    async isSupported() {
        try {
            // Llama al método estático available() del plugin
            const { available } = await SpeechRecognition.available();
            // Retorna el booleano que indica disponibilidad
            return available;
        } catch(e) {
            // Si hay un error (ej. entorno web no soportado o plugin ausente), asume false
            return false;
        }
    }

    /**
     * Inicia la captura de audio y la transcripción de voz a texto.
     * @returns {Promise<string>} Promesa que resuelve a la cadena de texto transcrita.
     */
    async startListening() {
        try {
            // Por precaución, si la bandera interna dice que ya estamos escuchando, 
            // manda una instrucción para detener cualquier proceso previo pendiente
            if (this.isListening) {
                await SpeechRecognition.stop();
            }
            
            // Revisa el estado de los permisos de micrófono otorgados por el usuario a la app
            let perm = await SpeechRecognition.checkPermissions();
            // Si el permiso no ha sido explícitamente 'granted' (concedido)
            if (perm.speechRecognition !== 'granted') {
                // Lanza el diálogo nativo del sistema operativo solicitando el permiso
                perm = await SpeechRecognition.requestPermissions();
            }

            // Si después de solicitarlo sigue sin ser concedido
            if (perm.speechRecognition !== 'granted') {
                // Interrumpe la operación y lanza un error
                throw new Error("Permiso de micrófono denegado.");
            }

            // Cambia el estado a activo, para bloquear reentradas concurrentes
            this.isListening = true;

            // Iniciar escucha nativa mediante el plugin
            const result = await SpeechRecognition.start({
                // Configura el idioma a español (México)
                language: 'es-MX',
                // Limita los resultados al mejor intento (evita devolver múltiples variaciones alternativas)
                maxResults: 1,
                // Muestra un mensaje guía a nivel de sistema operativo (si este lo soporta en su UI)
                prompt: 'Dime qué compraste y cuánto costó',
                // Define que queremos el resultado final, no resultados parciales mientras el usuario aún habla
                partialResults: false,
                // Oculta popups nativos que algunos dispositivos muestran por defecto; usaremos UI propia
                popup: false
            });

            // Terminó la escucha (ya sea por silencio detectado o error nativo), bajamos la bandera
            this.isListening = false;

            // Verifica que el resultado contenga datos válidos en el arreglo 'matches'
            if (result && result.matches && result.matches.length > 0) {
                // Retorna la primera cadena (mejor coincidencia)
                return result.matches[0];
            } else {
                // Si no hay texto, asume que no se escuchó la voz y lanza un error
                throw new Error("No se escuchó ningún audio.");
            }

        } catch(e) {
            // En caso de cualquier excepción (crash, cancelación del usuario), bajamos la bandera preventivamente
            this.isListening = false;
            // Si el plugin lanza un error indicando que ya está ocupado
            if (e.message && e.message.includes('already started')) {
                // Formatea el error para que sea amigable para el usuario final
                throw new Error("El micrófono ya está escuchando. Por favor, intenta de nuevo.");
            }
            // Relanza otros errores no manejados hacia el controlador
            throw e;
        }
    }

    /**
     * Fuerza la detención de la escucha y captura de audio nativa.
     */
    async stopListening() {
        // Baja inmediatamente la bandera interna
        this.isListening = false;
        try {
            // Manda la orden de stop al plugin nativo
            await SpeechRecognition.stop();
        } catch(e) {
            // Ignora errores al detener (p.ej si ya estaba detenido)
        }
    }
}

// Exporta una única instancia como Singleton
const voiceRecognitionService = new VoiceRecognitionService();
export default voiceRecognitionService;
