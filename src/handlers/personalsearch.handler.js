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
            return await message.reply('⚠️ Falta el número de teléfono.');
        }

        await message.reply(`📞 Consultando información para *${phoneNumber}*...`);
        await message.react('⏳');

        const pythonScriptPath = path.join(__dirname, '..' , '..' , 'scripts', 'python', 'phone_info.py');
        const pythonProcess = spawn('python', [pythonScriptPath, phoneNumber]);

        let scriptOutput = '';
        let scriptError = '';

        pythonProcess.stdout.on('data', (data) => {
            scriptOutput += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            scriptError += data.toString();
        });

        pythonProcess.on('close', async (code) => {
            if (code !== 0) {
                console.error(`Error en script de Python (código ${code}): ${scriptError}`);
                await message.reply(`❌ Ocurrió un error al consultar la información. Detalles: ${scriptError}`);
                await message.react('❌');
                return;
            }

            try {
                const result = JSON.parse(scriptOutput);
                if (result.error) {
                    await message.reply(`⚠️ No se encontró información: ${result.error}`);
                    await message.react('🤔');
                    return;
                }

                const media = await MessageMedia.fromUrl(result.image_url, { unsafeMime: true });
                await client.sendMessage(message.chatId, media, { caption: result.text });
                await message.react('✅');

            } catch (parseError) {
                console.error('Error al parsear JSON de Python:', parseError);
                await message.reply(`❌ Error al procesar la respuesta del servicio. Respuesta recibida:\n\n${scriptOutput}`);
                await message.react('❌');
            }
        });

    } catch (error) {
        console.error("Error en handlePhoneSearch:", error);
        await message.reply(`❌ Ocurrió un error inesperado al procesar tu consulta.`);
        await message.react('❌');
    }
}

module.exports = {
    handlePatenteSearch,
    handleTneSearch,
    handlePhoneSearch
};