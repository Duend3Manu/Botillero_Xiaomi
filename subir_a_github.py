import os
import subprocess

def limpiar_bloqueo():
    lock_path = '.git/index.lock'
    if os.path.exists(lock_path):
        print("⚠️ Eliminando index.lock para desbloquear el repo...")
        os.remove(lock_path)

def es_repo_git():
    return os.path.exists(".git")

def remoto_configurado():
    remotos = subprocess.check_output(["git", "remote"]).decode()
    return "origin" in remotos

def detectar_conflicto():
    estado = subprocess.check_output(["git", "status"]).decode()
    return "Unmerged paths" in estado or "CONFLICT" in estado

def obtener_rama_actual():
    return subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]).decode().strip()

def mostrar_cambios(status_output):
    print("📋 Cambios detectados:")
    for line in status_output.splitlines():
        if line.strip().startswith("new file:") or line.strip().startswith("modified:"):
            print("  -", line.strip())

def ejecutar_comandos(comandos):
    for cmd in comandos:
        print(f"🔧 Ejecutando: {cmd}")
        resultado = subprocess.run(cmd, shell=True)
        if resultado.returncode != 0:
            print("❌ Falló este paso. Revisión necesaria.")
            break

def main():
    print("🚀 Iniciando Botillero Uploader...\n")
    
    if not es_repo_git():
        print("❌ Esta carpeta no es un repositorio Git.")
        return

    limpiar_bloqueo()

    if not remoto_configurado():
        print("❌ No encontré 'origin'. Agregalo con:")
        print("   git remote add origin https://github.com/Duend3Manu/Botillero_Xiaomi.git")
        return

    subprocess.run(["git", "add", "--all"])
    status_output = subprocess.check_output(["git", "status"]).decode()

    if "Changes to be committed" not in status_output:
        print("⚠️ No hay cambios que subir.")
        return

    mostrar_cambios(status_output)

    if detectar_conflicto():
        print("⚠️ Se detectaron conflictos.")
        print("🛠️ Usá: git restore, git rebase --abort, o git reset --hard origin/main")
        return

    mensaje = input("📝 Escribí el mensaje del commit: ").strip() or "actualización sin descripción"
    print(f"📨 Usando mensaje: '{mensaje}'")

    rama = obtener_rama_actual()
    confirmar = input("🚀 ¿Hacer push ahora? (s/n): ").strip().lower()
    if confirmar != "s":
        print("🛑 Push cancelado por el usuario.")
        return

    comandos = [
        f'git commit -m "{mensaje}"',
        f'git pull origin {rama} --rebase',
        f'git push origin {rama}'
    ]

    ejecutar_comandos(comandos)

    print("\n🎉 ¡Listo, Manu! Tu bot está en GitHub y sigue creciendo con sabor a código casero.\n")

if __name__ == "__main__":
    main()
