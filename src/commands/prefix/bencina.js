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
            messagingService.sendLoadingMessage(message);
            const bencinaData = await externalService.getBencinaData(comuna);
            await message.reply(bencinaData);
        } catch (error) {
            console.error('Error en el comando !bencina:', error);
            await message.reply('❌ Hubo un problema al buscar la información. Intenta de nuevo.');
        }
    }
};