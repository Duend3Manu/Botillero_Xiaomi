# 📝 Sistema de Aliases - Botillero

## ¿Qué es el Sistema de Aliases?

El sistema de aliases permite que el bot identifique y etiquete a usuarios del grupo por su **apodo (nickname)** en lugar de su número de teléfono. Los aliases se **guardan manualmente** editando el archivo de configuración.

## Cómo Usar

### 1️⃣ **Agregar un Alias - Editar manualmente**

Abre el archivo: `config/aliases.json`

**Antes:**
```json
{
  "comment": "Aliases de usuarios - Formato: numero_whatsapp -> nickname"
}
```

**Después (agrega los usuarios):**
```json
{
  "5634354354": "Huaso",
  "5612345678": "Tito",
  "5698765432": "Javi"
}
```

Los formatos válidos para números de WhatsApp son:
- `56XXXXXXXXX` (formato chileno con 56)
- `XXXXXXXXX` (sin código de país)
- Cualquier formato con dígitos

**Ejemplo completo:**
```json
{
  "5634354354": "Huaso",
  "5612345678": "Tito",
  "5698765432": "Javi",
  "5699876543": "Carlitos",
  "56987654321": "Pedrito"
}
```

### 2️⃣ **Guardar y Aplicar**

Una vez que edites el archivo `config/aliases.json`:
1. Guarda los cambios (`Ctrl + S` en VS Code)
2. **El bot carga automáticamente los aliases al reiniciarse**
3. Los cambios tomarán efecto sin necesidad de reiniciar si solo son ediciones

## Funcionalidad de Detección Automática

Cuando escribas un mensaje en el grupo que contenga un alias registrado, el bot **automáticamente lo etiquetará**:

### Ejemplo:
- Tienes en `aliases.json`: `"5634354354": "Huaso"`
- Tú escribes en el grupo: "Hola, ¿dónde está el Huaso?"
- El bot automáticamente:
  1. Detecta la mención a "Huaso"
  2. Responde: `✓ Detecté mención a: @Huaso`
  3. Etiqueta a la persona mediante WhatsApp

## 📁 Almacenamiento

Los aliases se guardan en: `config/aliases.json`

Este archivo se carga automáticamente cuando el bot inicia.

Formato simple:
```json
{
  "NUMERO_WHATSAPP": "nickname",
  "5634354354": "Huaso"
}
```

## ⚙️ Detalles Técnicos

### Archivos Involucrados:
- `src/services/alias.service.js` - Lógica de gestión de aliases
- `config/aliases.json` - Base de datos de aliases (editar manualmente)
- `index.js` - Detección automática en mensajes

### Características:
✅ Búsqueda insensible a mayúsculas/minúsculas  
✅ Detección de palabras completas (no coincidencias parciales)  
✅ Múltiples menciones en un mismo mensaje  
✅ Persistencia automática en JSON  
✅ Sin comandos - Solo edición manual

## 🎯 Casos de Uso

1. **Identificación rápida de usuarios**: En lugar de recordar números, usas apodos
2. **Menciones automáticas**: El bot detecta cuando alguien menciona a un usuario por su apodo y lo etiqueta
3. **Gestión de grupo**: Mantén un registro de usuarios conocidos con sus apodos

## 📌 Notas Importantes

- Los aliases se detectan como **palabras completas** (no subcadenas)
- El bot solo responde a menciones en **grupos** (no en chats individuales)
- Los cambios al archivo se aplican automáticamente la próxima vez que el bot procese un mensaje
- Los números pueden tener cualquier formato (con o sin código de país)
- Los apodos deben tener al menos 2 caracteres

## 💡 Ejemplo Completo

**Paso 1: Editar `config/aliases.json`**
```json
{
  "5634354354": "Huaso",
  "5612345678": "Tito"
}
```

**Paso 2: Guardar el archivo**

**Paso 3: En el grupo, alguien escribe:**
```
Hola, ¿donde está el Huaso?
```

**Resultado: El bot responde:**
```
✓ Detecté mención a: @Huaso
[@Huaso es etiquetado automáticamente]
```
