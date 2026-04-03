// src/handlers/alias.handler.js
"use strict";

const aliasService = require('../services/alias.service');

/**
 * Maneja comandos de alias:
 * !addalias [número] [nickname] - Agregar alias
 * !listalias - Listar todos los aliases
 * !delalias [número] - Eliminar alias
 */
async function handleAliasCommand(message, command, args) {
    const userId = message.author || message.from;
    
    switch (command) {
        case 'addalias':
            return handleAddAlias(args, userId);
        
        case 'listalias':
            return handleListAliases();
        
        case 'delalias':
            return handleDeleteAlias(args);
        
        default:
            return null;
    }
}

/**
 * Agregar o actualizar alias
 * Uso: !addalias 5634354354 Huaso
 */
function handleAddAlias(args, userId) {
    if (args.length < 2) {
        return '❌ Uso: `!addalias [número] [nickname]`\nEjemplo: `!addalias 5634354354 Huaso`';
    }
    
    const phoneNumber = args[0].replace(/[^\d@]/g, '');
    const nickname = args.slice(1).join(' ');
    
    // Validar número
    if (phoneNumber.length < 10) {
        return '❌ El número debe tener al menos 10 dígitos.';
    }
    
    // Validar nickname
    if (nickname.length < 2 || nickname.length > 50) {
        return '❌ El nickname debe tener entre 2 y 50 caracteres.';
    }
    
    try {
        aliasService.setAlias(phoneNumber, nickname);
        return `✅ Alias guardado: *${nickname}* → \`${phoneNumber}\``;
    } catch (err) {
        console.error('Error al guardar alias:', err);
        return '❌ Error al guardar el alias.';
    }
}

/**
 * Listar todos los aliases
 */
function handleListAliases() {
    try {
        const aliases = aliasService.listAllAliases();
        
        if (Object.keys(aliases).length === 0) {
            return '📋 No hay aliases registrados aún.\n\nUsa: `!addalias [número] [nickname]`';
        }
        
        let result = '*📋 Aliases Registrados:*\n\n';
        
        for (const [phone, alias] of Object.entries(aliases)) {
            result += `• *${alias}* → \`${phone}\`\n`;
        }
        
        return result;
    } catch (err) {
        console.error('Error al listar aliases:', err);
        return '❌ Error al listar aliases.';
    }
}

/**
 * Eliminar alias
 */
function handleDeleteAlias(args) {
    if (args.length < 1) {
        return '❌ Uso: `!delalias [número o nickname]`';
    }
    
    const identifier = args[0].toLowerCase().trim();
    const aliases = aliasService.listAllAliases();
    
    // Buscar por número o por alias
    let phoneToDelete = null;
    
    if (identifier.match(/^\d+$/)) {
        // Es un número
        phoneToDelete = identifier;
    } else {
        // Buscar por alias
        for (const [phone, alias] of Object.entries(aliases)) {
            if (alias.toLowerCase() === identifier) {
                phoneToDelete = phone;
                break;
            }
        }
    }
    
    if (!phoneToDelete || !aliases[phoneToDelete]) {
        return `❌ No encontré alias para: ${identifier}`;
    }
    
    try {
        const deletedAlias = aliases[phoneToDelete];
        aliasService.deleteAlias(phoneToDelete);
        return `✅ Alias eliminado: *${deletedAlias}*`;
    } catch (err) {
        console.error('Error al eliminar alias:', err);
        return '❌ Error al eliminar el alias.';
    }
}

/**
 * Procesar menciones en un mensaje (sin comando)
 * Se usa en el event handler para detectar menciones automáticas
 */
async function processMentionsInChat(client, message) {
    try {
        const result = aliasService.processMentionsInMessage(message.body);
        
        // Si no hay menciones encontradas, retornar null
        if (!result.hasMatches || result.mentions.length === 0) {
            return null;
        }
        
        // Preparar menciones
        const mentions = result.mentions.map(phone => `${phone}@s.whatsapp.net`);
        const mentionText = result.foundAliases
            .map(m => `*@${m.alias}*`)
            .join(', ');
        
        // Log para debug
        console.log(`(Alias) -> Menciones detectadas: ${mentionText} en chat ${message.from}`);
        
        return {
            hasMentions: true,
            mentions,
            foundAliases: result.foundAliases,
            mentionText
        };
        
    } catch (err) {
        console.error('(Alias) -> Error al procesar menciones:', err);
        return null;
    }
}

module.exports = {
    handleAliasCommand,
    processMentionsInChat,
    handleAddAlias,
    handleListAliases,
    handleDeleteAlias
};
