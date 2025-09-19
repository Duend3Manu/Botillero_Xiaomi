"use strict";

const adultService = require('../services/adult.service');

async function handleXvideosSearch(message) {
    const keyword = message.body.substring(message.body.indexOf(' ') + 1).trim();
    if (!keyword) {
        return "Por favor, escribe un término de búsqueda. Ejemplo: `!xv ...`";
    }

    await message.reply("🔞 *Advertencia:* El contenido a continuación es para adultos. Proceda con discreción.");

    const videos = await adultService.searchXvideos(keyword);

    if (videos.length === 0) {
        return `No se encontraron videos para *\"${keyword}\"*.`;
    }

    let replyMessage = `Resultados de búsqueda para *\"${keyword}\"*:\n\n`;
    videos.slice(0, 5).forEach((video, index) => {
        replyMessage += `*${index + 1}. ${video.title}*\n`;
        replyMessage += `Duración: ${video.duration}\n`;
        replyMessage += `URL: ${video.url}\n\n`;
    });
    return replyMessage;
}

module.exports = {
    handleXvideosSearch
};
```