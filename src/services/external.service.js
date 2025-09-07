"use strict";

const pythonService = require('./python.service');

async function getBencinaData(comuna) {
    if (!comuna) {
        return "Debes especificar una comuna. Ejemplo: `!bencina santiago`";
    }
    try {
        console.log(`(Servicio Externo) -> Ejecutando bencina.py para ${comuna}...`);
        // RUTA CORREGIDA: Solo se pasa el nombre del script. El python.service se encarga de la ruta completa.
        const bencinaData = await pythonService.executeScript('bencina.py', [comuna]);
        return bencinaData;
    } catch (error) {
        console.error("Error en getBencinaData:", error.message);
        return "No pude obtener los precios de la bencina en este momento.";
    }
}

async function getTraductorStatus() {
    try {
        console.log(`(Servicio Externo) -> Ejecutando transbank.py...`);
        // RUTA CORREGIDA
        const statusData = await pythonService.executeScript('transbank.py');
        return statusData;
    } catch (error) {
        console.error("Error en getTraductorStatus:", error.message);
        return "No pude obtener el estado de Transbank en este momento.";
    }
}

async function getBolsaData() {
    try {
        console.log(`(Servicio Externo) -> Ejecutando bolsa.py...`);
        // RUTA CORREGIDA
        const bolsaData = await pythonService.executeScript('bolsa.py');
        return bolsaData;
    } catch (error) {
        console.error("Error en getBolsaData:", error.message);
        return "No pude obtener los datos de la bolsa en este momento.";
    }
}

module.exports = {
    getBencinaData,
    getTraductorStatus,
    getBolsaData,
};
