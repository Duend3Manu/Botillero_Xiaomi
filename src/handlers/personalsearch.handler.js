// src/handlers/personalsearch.handler.js
"use strict";

const { getPatenteDataFormatted, getRutData } = require('../utils/apiService');
const { MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');
const FormData = require('form-data');

/**
 * Maneja la búsqueda de patentes de vehículos.
 * @param {import('whatsapp-web.js').Message} message - El objeto del mensaje de WhatsApp.
 */
async function handlePatenteSearch(message) {
    const patente = message.body.replace(/!patente|!pat/i, '').trim().toUpperCase();

    if (!patente || patente.length !== 6 || !/^[A-Z0-9]+$/.test(patente)) {
        return message.reply(`🚨 El formato de la patente es inválido.\n\n*Usa:* \`!pat ABC123\`\nDebe tener *6 caracteres*, solo letras y números, sin espacios.`);
    }
    
    await message.react('⏳');
    const nombre = message._data && message._data.notifyName ? message._data.notifyName : 'amigo(a)';
    await message.reply(`¡Hola ${nombre}! 🚗 Estoy procesando tu consulta de patente *${patente}*...`);
    
    const result = await getPatenteDataFormatted(patente);
    await message.react(result.error ? '❌' : '✅');
    return message.reply(result.error ? result.message : result.data);
}

/**
 * Maneja la búsqueda de información de la TNE por RUT.
 * @param {import('whatsapp-web.js').Message} message - El objeto del mensaje de WhatsApp.
 */
async function handleTneSearch(message) {
    const rutRegex = /([0-9]{1,9}-?[0-9kK])$/i;
    const matchRut = message.body.match(rutRegex);

    if (!matchRut) {
        return message.reply("Debes ingresar un RUT válido después del comando. Ejemplo: `!tne 12345678-9`");
    }
    
    const rut = matchRut[1];
    await message.react('⏳');
    await message.reply(`Estoy buscando información para el RUT *${rut.toUpperCase()}*...`);

    const result = await getRutData(rut);

    let responseText;
    if (result.error) {
        responseText = `⚠️ Error al buscar el RUT *${rut.toUpperCase()}*: ${result.message}`;
    } else {
        const userData = result.data;
        responseText = `
👤 *Datos de la TNE (RUT: ${rut.toUpperCase()})*:

📛 *Nombre Completo:* ${userData.primerNombre || 'No disponible'} ${userData.apellidoPaterno || 'No disponible'}
🔢 *Folio TNE:* ${userData.tneFolio || 'No disponible'}
🗓️ *Período TNE:* ${userData.tnePeriodo || 'No disponible'}
🎓 *Tipo de TNE:* ${userData.tneTipo || 'No disponible'}
✅ *Estado TNE:* ${userData.tneEstado || 'No disponible'}
📅 *Fecha de Solicitud:* ${userData.soliFech || 'No disponible'}
📝 *Estado de Solicitud:* ${userData.soliEstado || 'No disponible'}
ℹ️ *Observaciones:* ${userData.observaciones || 'No disponible'}
        `.trim();
    }
    
    return message.reply(responseText);
}

/**
 * Maneja la búsqueda de información de números de teléfono.
 * @param {import('whatsapp-web.js').Client} client - El objeto del cliente de WhatsApp.
 * @param {import('whatsapp-web.js').Message} message - El objeto del mensaje de WhatsApp.
 */
async function handlePhoneSearch(client, message) {
        const phoneNumber = message.body.replace(/!num|!tel/g, '').trim();
    const senderId = message.author || message.from; // Use message.author for groups, message.from for direct messages

    if (!phoneNumber) {
        await client.sendMessage(message.from, `⚠️ Por favor, ingresa un número de teléfono después del comando. @${senderId}`);
        await message.react('❌');
        return;
    }

    await message.react('⏳');
    try {
        let data = new FormData();
        data.append('tlfWA', phoneNumber);

        const response = await axios.post('https://celuzador.porsilapongo.cl/celuzadorApi.php', data, {
            headers: { 'User-Agent': 'CeludeitorAPI-TuCulitoSacaLlamaAUFAUF', ...data.getHeaders() }
        });

        if (response.data.estado === 'correcto') {
            const linkRegex = /\*Link Foto\* : (https?:\/\/[^\s]+)(?=\*Estado)/;
            const urlMatch = response.data.data.match(linkRegex);

            let cleanData = response.data.data.replace(linkRegex, '').trim();
            const captionText = `ℹ️ Información del número ℹ️\n@${senderId} ${cleanData}`;

            if (urlMatch && urlMatch[1]) {
                const media = await MessageMedia.fromUrl(urlMatch[1]);
                await client.sendMessage(message.from, media, { caption: "Mensaje de prueba con media." });
            } else {
                await client.sendMessage(message.from, "Mensaje de prueba sin media.");
            }
            await message.react('☑️');
        } else {
            await client.sendMessage(message.from, `@${senderId} ${response.data.data}`, { mentions: [senderId] });
            await message.react('❌');
        }
    } catch (error) {
        console.error("Error en handlePhoneSearch:", error);
        await client.sendMessage(message.from, `@${senderId} ⚠️ Hubo un error al buscar la información del número. Por favor, intenta nuevamente más tarde.`, { mentions: [senderId] });
        await message.react('❌');
    }
}

module.exports = {
    handlePatenteSearch,
    handleTneSearch,
    handlePhoneSearch
};