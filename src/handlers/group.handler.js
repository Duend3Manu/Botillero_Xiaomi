// src/handlers/group.handler.js
"use strict";

/**
 * Etiqueta a todos los participantes de un grupo.
 * @param {Client} client - El objeto del cliente de WhatsApp.
 * @param {Message} message - El objeto del mensaje que activó el comando.
 */
async function handleTagAll(client, message) {
    try {
        const chat = message.chat;

        // 1. Verificar si el chat es un grupo
        if (!chat.isGroup) {
            return message.reply("Este comando solo se puede usar en grupos.");
        }

        // 2. Obtener todos los participantes del grupo
        const participants = chat.participants;
        
        let text = "";
        let mentions = [];

        // 3. Construir el texto y la lista de menciones (con IDs)
        for (let participant of participants) {
            // El ID serializado del participante se usa para la mención
            mentions.push(participant.id._serialized);
            text += `@${participant.id.user} `;
        }

        // 4. Enviar el mensaje con el texto y las menciones
        // Se envía al ID del chat, y se pasa la opción 'mentions' con los IDs
        await chat.sendMessage(text, { mentions });

    } catch (e) {
        console.error("Error en handleTagAll:", e);
        message.reply("Hubo un error al intentar etiquetar a todos.");
    }
}

module.exports = {
    handleTagAll
};