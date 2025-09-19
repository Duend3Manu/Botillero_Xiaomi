"use strict";

const axios = require('axios');
const FormData = require('form-data');

/**
 * Maneja la búsqueda de contenido en Fapello.
 * @param {import('whatsapp-web.js').Client} client - El objeto del cliente de WhatsApp.
 * @param {import('whatsapp-web.js').Message} message - El objeto del mensaje de WhatsApp.
 */
async function handleFapSearch(client, message) {
    const searchTerm = message.body.slice(5).trim();
    const senderId = message.author || message.from; // Use message.author for groups, message.from for direct messages

    if (!searchTerm) {
        await client.sendMessage(message.from, `Por favor ingresa un término de búsqueda después de !fap`);
        await message.react('❌');
        return;
    }

    await message.react('⏳');
    try {
        const response = await axios.post(
            'https://celuzador.porsilapongo.cl/fappello.php',
            new URLSearchParams({
                'term': searchTerm
            }),
            {
                headers: {
                    'User-Agent': 'CeludeitorAPI-TuCulitoSacaLlamaAUFAUF'
                }
            }
        );

        const resultados = response.data;

        if (resultados && resultados.length > 0) {
            let mensajeRespuesta = `Resultado de la búsqueda para "${searchTerm}":\n\n`;

            resultados.forEach((resultado, index) => {
                mensajeRespuesta += `${index + 1}. ${resultado.name} - ${resultado.profile_url}\n`;
            });

            await client.sendMessage(message.from, mensajeRespuesta);
            await message.react('✅');
        } else {
            await client.sendMessage(message.from, `No se encontraron resultados para "${searchTerm}".`);
            await message.react('❌');
        }

    } catch (error) {
        console.error('Error al realizar la búsqueda en Fapello:', error);
        await client.sendMessage(message.from, `⚠️ Hubo un error al buscar en Fapello. Por favor, intenta nuevamente más tarde.`);
        await message.react('❌');
    }
}

module.exports = {
    handleFapSearch
};
