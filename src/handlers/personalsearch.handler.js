// src/handlers/personalsearch.handler.js
"use strict";

const { getPatenteDataFormatted } = require('../utils/apiService');

async function handlePatenteSearch(message) {
    const patente = message.body.replace(/!patente|!pat/i, '').trim();
    if (!patente || patente.length !== 6) {
        return message.reply(`🚨 El formato de la patente es inválido.\n\n*Usa:* \`!pat ABC123\`\nDebe tener *6 caracteres*, solo letras y números, sin espacios.`);
    }
    
    await message.react('⏳');
    const nombre = message._data.notifyName || 'amigo(a)';
    await message.reply(`¡Hola ${nombre}! 🚗 Estoy procesando tu consulta de patente *${patente.toUpperCase()}*...`);
    
    const result = await getPatenteDataFormatted(patente);
    await message.react(result.error ? '❌' : '✅');
    return message.reply(result.error ? result.message : result.data);
}

module.exports = {
    handlePatenteSearch,
};