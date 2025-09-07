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

async function handleStickerToMedia(client, message) {
    // Implementación con carga segura de 'sharp'
    let sharp;
    try {
        sharp = require('sharp');
    } catch (err) {
        console.error("----------- ERROR CRÍTICO: FALTA LA LIBRERÍA 'SHARP' -----------");
        console.error("Por favor, detén el bot y ejecuta 'npm install sharp' en tu terminal y luego reinícialo.");
        return message.reply("❌ Error: La función para convertir imágenes no está disponible. El administrador debe instalar la librería 'sharp'.");
    }

    if (!message.hasQuotedMsg) {
        return message.reply("Para usar este comando, debes responder a un sticker.");
    }

    const quotedMsg = await message.getQuotedMessage();

    if (!quotedMsg.hasMedia || quotedMsg.type !== 'sticker') {
        return message.reply("Eso no parece ser un sticker.");
    }

    await message.react('⏳');
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    fs.mkdirSync(tempDir, { recursive: true });
    
    let outputPath;

    try {
        const media = await quotedMsg.downloadMedia();
        const inputBuffer = Buffer.from(media.data, 'base64');

        if (quotedMsg.isAnimated) {
            outputPath = path.join(tempDir, `sticker_${Date.now()}.gif`);
            await sharp(inputBuffer, { animated: true }).gif().toFile(outputPath);
        } else {
            outputPath = path.join(tempDir, `sticker_${Date.now()}.png`);
            await sharp(inputBuffer).png().toFile(outputPath);
        }

        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
            const mediaToSend = MessageMedia.fromFilePath(outputPath);
            await message.reply(mediaToSend, undefined, { caption: "¡Aquí tienes!" });
            await message.react('✅');
        } else {
            throw new Error('La conversión no generó un archivo de salida válido.');
        }

    } catch (e) {
        console.error("Error al convertir sticker a media:", e);
        await message.react('❌');
        message.reply("Ucha, no pude convertir ese sticker. Puede que el formato no sea compatible.");
    } finally {
        if (outputPath && fs.existsSync(outputPath)) {
            try {
                fs.unlinkSync(outputPath);
            } catch (unlinkErr) {
                console.error(`Error al eliminar archivo temporal: ${unlinkErr}`);
            }
        }
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
            return getCountdownMessage(moment.tz(`${year}-09-18 00:00:00`, 'America/Santiago'), 'el 18', '🇨🇱');
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
    handleStickerToMedia,
    getSoundCommands,
    handleJoke,
    handleCountdown,
};
