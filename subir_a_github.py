"""
Script optimizado para subir cambios a GitHub con validaciones robustas.
Autor: Duende Manu
Versión: 2.0.0
"""

import os
import subprocess
import sys
from pathlib import Path


class GitUploader:
    """Gestor optimizado para operaciones con Git."""
    
    COUNTER_FILE = ".push_counter"
    GIT_DIR = ".git"
    PREFIXES_CAMBIOS = ["new file:", "modified:", "deleted:", "renamed:"]
    
    @staticmethod
    def limpiar_bloqueo():
        """Elimina el archivo de bloqueo de git si existe."""
        lock_path = Path(GitUploader.GIT_DIR) / "index.lock"
        if lock_path.exists():
            try:
                lock_path.unlink()
                print("✅ index.lock eliminado correctamente.")
            except OSError as e:
                print(f"⚠️ No se pudo eliminar index.lock: {e}")
    
    @staticmethod
    def es_repo_git():
        """Verifica si el directorio actual es un repositorio Git."""
        return Path(GitUploader.GIT_DIR).is_dir()
    
    @staticmethod
    def ejecutar_comando_git(args, descripcion=""):
        """Ejecuta un comando git y retorna stdout, stderr y código de retorno."""
        try:
            resultado = subprocess.run(
                ["git"] + args,
                capture_output=True,
                text=True,
                check=False
            )
            return resultado.stdout, resultado.stderr, resultado.returncode
        except FileNotFoundError:
            print("❌ Git no está instalado o no está en PATH.")
            sys.exit(1)
    
    @staticmethod
    def remoto_configurado():
        """Verifica que exista el remoto 'origin'."""
        stdout, stderr, code = GitUploader.ejecutar_comando_git(["remote"])
        return code == 0 and "origin" in stdout
    
    @staticmethod
    def detectar_conflicto():
        """Detecta conflictos de merge."""
        stdout, _, code = GitUploader.ejecutar_comando_git(["status"])
        if code != 0:
            return False
        return "Unmerged paths" in stdout or "CONFLICT" in stdout
    
    @staticmethod
    def obtener_rama_actual():
        """Obtiene el nombre de la rama actual."""
        stdout, _, code = GitUploader.ejecutar_comando_git(
            ["rev-parse", "--abbrev-ref", "HEAD"]
        )
        if code != 0:
            print("❌ No se pudo obtener la rama actual.")
            sys.exit(1)
        return stdout.strip()
    
    @staticmethod
    def mostrar_cambios(status_output):
        """Muestra los cambios detectados en el repositorio."""
        cambios = []
        for line in status_output.splitlines():
            if any(line.strip().startswith(p) for p in GitUploader.PREFIXES_CAMBIOS):
                cambios.append(line.strip())
        
        if cambios:
            print("📋 Cambios detectados:")
            for cambio in cambios:
                print(f"  • {cambio}")
        return len(cambios) > 0
    
    @staticmethod
    def agregar_todos_cambios():
        """Agrega todos los cambios al staging area."""
        _, stderr, code = GitUploader.ejecutar_comando_git(["add", "--all"])
        if code != 0:
            print(f"❌ Error al agregar cambios: {stderr}")
            return False
        return True
    
    @staticmethod
    def obtener_estado():
        """Obtiene el estado actual del repositorio."""
        stdout, stderr, code = GitUploader.ejecutar_comando_git(["status"])
        if code != 0:
            print(f"❌ Error al obtener estado: {stderr}")
            return None
        return stdout
    
    @staticmethod
    def hay_cambios_pendientes(status_output):
        """Verifica si hay cambios pendientes de commit."""
        return "Changes to be committed" in status_output and "nothing to commit" not in status_output
    
    @staticmethod
    def sincronizar_remoto(rama):
        """Sincroniza con el remoto antes de hacer push."""
        print(f"🔄 Sincronizando con 'origin/{rama}'...")
        
        # Intentar fetch primero (no afecta archivos locales)
        _, _, code = GitUploader.ejecutar_comando_git(
            ["fetch", "origin", rama]
        )
        if code == 0:
            # Verificar si hay cambios upstream
            stdout, _, code = GitUploader.ejecutar_comando_git(
                ["rev-list", "--count", f"HEAD..origin/{rama}"]
            )
            if code == 0 and stdout.strip() != "0":
                print("⚠️ Hay cambios en el remoto. Realizando rebase...")
                _, stderr, code = GitUploader.ejecutar_comando_git(
                    ["rebase", f"origin/{rama}"]
                )
                if code != 0:
                    print("❌ Error durante rebase. Resuelve conflictos manualmente.")
                    if stderr:
                        print(f"   Detalles: {stderr}")
                    return False
            else:
                print("✅ Tu rama está actualizada con el remoto.")
        else:
            print("⚠️ No se pudo contactar con el remoto. Continuando sin sincronizar...")
        
        return True
    
    @staticmethod
    def gestionar_contador():
        """Lee, incrementa y guarda el contador de actualizaciones."""
        counter_file = Path(GitUploader.COUNTER_FILE)
        counter = 0
        
        if counter_file.exists():
            try:
                counter = int(counter_file.read_text().strip())
            except (ValueError, OSError):
                print(f"⚠️ Reiniciando contador en '{GitUploader.COUNTER_FILE}'.")
        
        counter += 1
        try:
            counter_file.write_text(str(counter))
        except OSError as e:
            print(f"⚠️ No se pudo guardar contador: {e}")
        
        return counter
    
    @staticmethod
    def sanitizar_mensaje(mensaje):
        """Sanitiza el mensaje para evitar problemas con shell."""
        # Escape de caracteres especiales
        mensaje = mensaje.replace('\\', '\\\\')
        mensaje = mensaje.replace('"', '\\"')
        mensaje = mensaje.replace('$', '\\$')
        mensaje = mensaje.replace('`', '\\`')
        return mensaje
    
    @staticmethod
    def hacer_commit(mensaje):
        """Realiza el commit con el mensaje proporcionado."""
        mensaje_sanitizado = GitUploader.sanitizar_mensaje(mensaje)
        _, stderr, code = GitUploader.ejecutar_comando_git(
            ["commit", "-m", mensaje_sanitizado]
        )
        if code != 0:
            print(f"❌ Error durante commit: {stderr}")
            return False
        print("✅ Commit realizado exitosamente.")
        return True
    
    @staticmethod
    def hacer_push(rama):
        """Realiza el push a la rama especificada."""
        _, stderr, code = GitUploader.ejecutar_comando_git(
            ["push", "origin", rama]
        )
        if code != 0:
            if "secret" in stderr.lower() or "push protection" in stderr.lower():
                print("⚠️ GITHUB PUSH PROTECTION: Se detectaron secretos en el commit.")
                print("   Por favor, sigue el enlace de GitHub para resolver.")
                print("   También puedes ejecutar: git reset --soft HEAD~1")
                print("   Luego remueve los secretos y vuelve a hacer commit.")
            else:
                print(f"❌ Error durante push: {stderr}")
            return False
        print("✅ Push completado exitosamente.")
        return True

def main():
    """Función principal del script."""
    print("🚀 Iniciando Botillero Uploader v2.0.0...\n")
    
    # Validaciones iniciales
    if not GitUploader.es_repo_git():
        print("❌ Esta carpeta no es un repositorio Git.")
        sys.exit(1)
    
    GitUploader.limpiar_bloqueo()
    
    if not GitUploader.remoto_configurado():
        print("❌ No encontré 'origin'. Agregalo con:")
        print("   git remote add origin https://github.com/Duend3Manu/Botillero_Xiaomi.git")
        sys.exit(1)
    
    # Agregar cambios
    if not GitUploader.agregar_todos_cambios():
        sys.exit(1)
    
    # Obtener estado
    status_output = GitUploader.obtener_estado()
    if status_output is None:
        sys.exit(1)
    
    # Verificar si hay cambios
    if not GitUploader.hay_cambios_pendientes(status_output):
        print("⚠️ No hay cambios que subir.")
        print("✅ Tu repositorio ya está actualizado.")
        return
    
    # Mostrar cambios
    GitUploader.mostrar_cambios(status_output)
    
    # Detectar conflictos
    if GitUploader.detectar_conflicto():
        print("⚠️ Se detectaron conflictos.")
        print("🛠️ Usá: git restore, git rebase --abort, o git reset --hard origin/main")
        sys.exit(1)
    
    # Obtener rama y sincronizar
    rama = GitUploader.obtener_rama_actual()
    if not GitUploader.sincronizar_remoto(rama):
        sys.exit(1)
    
    # Solicitar información al usuario
    try:
        update_number = GitUploader.gestionar_contador()
        
        print("📝 Escribí el mensaje del commit (opcional): ", end="", flush=True)
        user_message = input().strip()
        
        if user_message:
            commit_message = f"{user_message} (Update #{update_number})"
        else:
            commit_message = f"Actualización automática #{update_number}"
        
        print(f"\n📨 Mensaje: '{commit_message}'")
        
        confirmar = input("🚀 ¿Hacer push ahora? (s/n): ").strip().lower()
        if confirmar != "s":
            print("🛑 Push cancelado por el usuario.")
            return
    
    except KeyboardInterrupt:
        print("\n🛑 Operación cancelada por el usuario.")
        sys.exit(1)
    
    # Realizar commit y push
    if not GitUploader.hacer_commit(commit_message):
        sys.exit(1)
    
    if not GitUploader.hacer_push(rama):
        sys.exit(1)
    
    print("\n🎉 ¡Listo, Manu! Tu bot está en GitHub y sigue creciendo con sabor a código casero.\n")


if __name__ == "__main__":
    main()
