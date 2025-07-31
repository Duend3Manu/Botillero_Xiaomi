// src/handlers/fun.handler.js
"use strict";

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { MessageMedia } = require('whatsapp-web.js');

// --- Lógica para Stickers ---
async function handleSticker(client, message) {
    let mediaMessage = message;
    if (message.hasQuotedMsg) {
        const quotedMsg = await message.getQuotedMessage();
        if (quotedMsg.hasMedia) {
            mediaMessage = quotedMsg;
        }
    }

    if (mediaMessage.hasMedia && (mediaMessage.type === 'image' || mediaMessage.type === 'video' || mediaMessage.type === 'gif')) {
        try {
            const media = await mediaMessage.downloadMedia();
            message.reply(media, undefined, { sendMediaAsSticker: true, stickerAuthor: "Botillero", stickerName: "Creado por Botillero" });
        } catch (e) {
            message.reply("Hubo un error al crear el sticker.");
            console.error(e);
        }
    } else {
        message.reply("Responde a una imagen o video, o envía uno junto al comando `!s`.");
    }
}

function getCountdownMessage(targetDate, eventName, emoji) {
    const now = moment().tz('America/Santiago');
    const diff = moment.duration(targetDate.diff(now));

    if (diff.asMilliseconds() <= 0) return `¡Feliz ${eventName}! ${emoji}`;

    const days = Math.floor(diff.asDays());
    const hours = diff.hours();
    const minutes = diff.minutes();

    return `Para ${eventName} quedan: ${days} días, ${hours} horas y ${minutes} minutos ${emoji}`;
}

function handleCountdown(command) {
    const year = moment().year();
    switch (command) {
        case '18':
            return getCountdownMessage(moment.tz(`${year}-09-18 00:00:00`, 'America/Santiago'), 'el 18', '🇱');
        case 'navidad':
            return getCountdownMessage(moment.tz(`${year}-12-25 00:00:00`, 'America/Santiago'), 'Navidad', '🎅');
        case 'añonuevo':
            return getCountdownMessage(moment.tz(`${year + 1}-01-01 00:00:00`, 'America/Santiago'), 'Año Nuevo', '🎆');
        default:
            return null;
    }
}

module.exports = {
    handleSticker,
    handleCountdown
};