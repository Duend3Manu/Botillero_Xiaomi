// src/services/alias.service.js
"use strict";

const fs = require('fs');
const path = require('path');

const ALIASES_FILE = path.join(__dirname, '../../config/aliases.json');

// --- Inicializar archivo de aliases ---
function ensureAliasesFileExists() {
    if (!fs.existsSync(ALIASES_FILE)) {
        fs.writeFileSync(ALIASES_FILE, JSON.stringify({}, null, 2));
    }
}

// --- Leer todos los aliases ---
function loadAliases() {
    try {
        ensureAliasesFileExists();
        const data = fs.readFileSync(ALIASES_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error al cargar aliases:', err);
        return {};
    }
}

// --- Guardar aliases ---
function saveAliases(aliases) {
    try {
        fs.writeFileSync(ALIASES_FILE, JSON.stringify(aliases, null, 2));
    } catch (err) {
        console.error('Error al guardar aliases:', err);
    }
}

// --- Agregar o actualizar alias ---
function setAlias(phoneNumber, nickname) {
    const aliases = loadAliases();
    const cleanPhone = phoneNumber.replace(/[^\d@]/g, ''); // Limpiar formato
    aliases[cleanPhone] = nickname.toLowerCase().trim();
    saveAliases(aliases);
    return true;
}

// --- Obtener alias por número ---
function getAliasByPhone(phoneNumber) {
    const aliases = loadAliases();
    const cleanPhone = phoneNumber.replace(/[^\d@]/g, '');
    return aliases[cleanPhone] || null;
}

// --- Obtener número por alias ---
function getPhoneByAlias(alias) {
    const aliases = loadAliases();
    const lowerAlias = alias.toLowerCase().trim();
    
    for (const [phone, nick] of Object.entries(aliases)) {
        if (nick.toLowerCase() === lowerAlias) {
            return phone;
        }
    }
    return null;
}

// --- Buscar alias por coincidencia parcial (para menciones) ---
function findAliasesByPartial(text) {
    const aliases = loadAliases();
    const matches = [];
    
    for (const [phone, alias] of Object.entries(aliases)) {
        // Buscar el alias como palabra completa
        const regex = new RegExp(`\\b${alias}\\b`, 'gi');
        const found = text.match(regex);
        
        if (found) {
            matches.push({
                phone,
                alias,
                count: found.length,
                originalMatches: found
            });
        }
    }
    
    return matches;
}

// --- Listar todos los aliases ---
function listAllAliases() {
    return loadAliases();
}

// --- Eliminar alias ---
function deleteAlias(phoneNumber) {
    const aliases = loadAliases();
    const cleanPhone = phoneNumber.replace(/[^\d@]/g, '');
    delete aliases[cleanPhone];
    saveAliases(aliases);
    return true;
}

// --- Procesar mensajes para detectar y reemplazar menciones ---
/**
 * Detecta menciones de aliases en un mensaje y devuelve:
 * - messageWithMentions: texto con etiquetas en lugar de nombres
 * - mentions: array con los números de teléfono a mencionar
 * - foundAliases: array con los aliases encontrados
 */
function processMentionsInMessage(messageText) {
    const foundMatches = findAliasesByPartial(messageText);
    const mentions = [];
    const foundAliases = [];
    let processedMessage = messageText;
    
    // Procesar de mayor a menor para evitar desplazamientos en índices
    foundMatches.sort((a, b) => b.alias.length - a.alias.length);
    
    for (const match of foundMatches) {
        // Agregar a array de menciones (evitar duplicados)
        if (!mentions.includes(match.phone)) {
            mentions.push(match.phone);
            foundAliases.push({
                alias: match.alias,
                phone: match.phone,
                displayName: `@${match.alias}`
            });
        }
    }
    
    return {
        mentions,
        foundAliases,
        hasMatches: foundMatches.length > 0
    };
}

// --- Comando para agregar/actualizar alias ---
function getAddAliasCommand(phoneNumber, nickname) {
    setAlias(phoneNumber, nickname);
    return `✅ Alias guardado: *${nickname}* → ${phoneNumber}`;
}

// --- Comando para listar aliases de un usuario o todos ---
function getListAliasesCommand(userPhone = null) {
    const aliases = loadAliases();
    
    if (Object.keys(aliases).length === 0) {
        return '📋 No hay aliases registrados aún.';
    }
    
    let result = '*📋 Lista de Aliases:*\n\n';
    
    for (const [phone, alias] of Object.entries(aliases)) {
        result += `• *${alias}* → ${phone}\n`;
    }
    
    return result;
}

module.exports = {
    setAlias,
    getAliasByPhone,
    getPhoneByAlias,
    findAliasesByPartial,
    listAllAliases,
    deleteAlias,
    processMentionsInMessage,
    getAddAliasCommand,
    getListAliasesCommand,
    loadAliases
};
