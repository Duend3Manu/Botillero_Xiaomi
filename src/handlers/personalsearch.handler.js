// src/handlers/personalsearch.handler.js
"use strict";
const { MessageMedia } = require('whatsapp-web.js');
const { getPatenteDataFormatted, getRutData } = require('../utils/apiService');
const axios = require('axios');
const FormData = require('form-data');
const { spawn } = require('child_process'); // Importar spawn
const path = require('path'); // Importar path

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
 * Maneja la búsqueda de información de números de teléfono. (VERSIÓN CORREGIDA Y MEJORADA)
 * @param {import('whatsapp-web.js').Client} client - El objeto del cliente de WhatsApp.
 * @param {import('whatsapp-web.js').Message} message - El objeto del mensaje de WhatsApp.
 */
async function handlePhoneSearch(client, message) {
    try {
        const phoneNumber = message.body.replace(/!num|!tel/g, '').trim();
        if (!phoneNumber) {
            return await message.reply('⚠️ Falta el número.');
        }

        await message.reply(`📞 Procesando consulta para *${phoneNumber}*...`);
        await message.react('⏳');

        // Usamos los datos simulados para la versión final de la prueba
        const responseText = "Este es un texto de prueba con formato *negrita* y emojis 😃.";
        const imageUrl = "https://i.pinimg.com/originals/66/b8/58/66b858099df3127e83cb1f1168f7a2c6.jpg";
        const chatId = message.chatId;

        // Lógica final combinada (equivalente a Prueba 4)
        const media = await MessageMedia.fromUrl(imageUrl, { unsafeMime: true });
        await client.sendMessage(chatId, media, { caption: responseText });

        await message.react('✅');
        console.log("Comando !tel finalizado con éxito con datos de prueba.");

    } catch (error) {
        console.error("Error en handlePhoneSearch:", error);
        await message.reply(`❌ Ocurrió un error al procesar la consulta.`);
        await message.react('❌');
    }
}

module.exports = {
    handlePatenteSearch,
    handleTneSearch,
    handlePhoneSearch
};