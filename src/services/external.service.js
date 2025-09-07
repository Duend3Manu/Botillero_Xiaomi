"use strict";

const externalService = require('../../services/external.service');
const messagingService = require('../../services/messaging.service');

module.exports = {
    name: 'bencina',
    aliases: ['bencinas', 'gasolina'],
    description: 'Busca los precios de la bencina en una comuna específica.',
    
    async execute({ client, message, args }) {
        const comuna = args.join(' '); // Une todos los argumentos por si la comuna tiene espacios (ej: "lo prado")

        if (!comuna) {
            await message.reply("Por favor, dime en qué comuna quieres buscar. Ejemplo: `!bencina santiago`");
            return;
        }

        try {
            // --- MEJORA DE EXPERIENCIA DE USUARIO ---
            // Se envía una reacción y un mensaje de texto inmediato para gestionar la espera.
            messagingService.sendLoadingMessage(message);
            await message.reply(`Buscando precios para *${comuna}*... El servicio externo puede demorar unos segundos, ¡gracias por la paciencia! ⌛`);

            // Esta es la línea que puede demorar hasta 6 segundos o más.
            const bencinaData = await externalService.getBencinaData(comuna);

            // Intenta convertir la respuesta a JSON para ver si es un error del script de Python
            try {
                const errorResponse = JSON.parse(bencinaData);
                if (errorResponse && errorResponse.error) {
                    // Si es un error conocido (como el timeout), manda un mensaje amigable
                    console.error("Error desde el script de Python (bencina.py):", errorResponse.error);
                    await message.reply("Lo siento, el servicio de Bencina en Línea no está respondiendo en este momento. 😥\n\nPor favor, intenta de nuevo más tarde.");
                } else {
                    // Si es JSON pero no tiene la clave 'error', lo envía tal cual
                    await message.reply(bencinaData);
                }
            } catch (e) {
                // Si no se puede parsear como JSON, significa que es una respuesta exitosa (texto plano)
                await message.reply(bencinaData);
            }

        } catch (error) {
            console.error('Error en el comando !bencina:', error);
            await message.reply('❌ Hubo un problema al buscar la información. Intenta de nuevo.');
        }
    }
};
