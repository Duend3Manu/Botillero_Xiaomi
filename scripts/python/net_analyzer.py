import sys
import socket
import whois
import dns.resolver
import ipapi
import ssl
import requests
from datetime import datetime
import io

# Forzamos a que la salida estándar (lo que se imprime) use siempre la codificación UTF-8.
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def detailed_port_scan(ip_address):
    """
    --- ¡NUEVO Y MEJORADO! ---
    Realiza un escaneo de puertos detallado con descripciones de seguridad.
    """
    report = ["--- 🛡️ Escaneo de Puertos (Hacking Ético) ---"]
    
    # Ampliamos la lista de puertos a escanear, incluyendo puertos comunes para servicios y posibles vulnerabilidades.
    common_ports = {
        # Puertos de Servicios Comunes
        21: ("FTP", "⚠️ Abierto. El tráfico (incluyendo contraseñas) no está cifrado. Usar FTPS/SFTP."),
        22: ("SSH", "✅ Abierto. Acceso seguro a la shell. Asegurar con contraseñas fuertes o claves SSH."),
        23: ("Telnet", "🚨 ¡PELIGRO! Abierto. Protocolo obsoleto y totalmente inseguro. Debe cerrarse inmediatamente."),
        25: ("SMTP", "✅ Abierto. Servidor de correo. Verificar configuración para prevenir Open Relay."),
        53: ("DNS", "✅ Abierto. Servidor de nombres de dominio. Esencial para la resolución de dominios."),
        80: ("HTTP", "⚠️ Abierto. Tráfico web no cifrado. Se recomienda redirigir todo a HTTPS (puerto 443)."),
        110: ("POP3", "⚠️ Abierto. Protocolo de correo obsoleto y no cifrado. Usar IMAPS/HTTPS."),
        143: ("IMAP", "⚠️ Abierto. Protocolo de correo no cifrado. Usar IMAPS."),
        443: ("HTTPS", "✅ Abierto. Tráfico web seguro. Esencial para cualquier sitio web moderno."),
        
        # Puertos de Bases de Datos y Administración
        3306: ("MySQL/MariaDB", "🚨 ¡PELIGRO! Generalmente no debería estar expuesto a internet. Riesgo de ataques."),
        5432: ("PostgreSQL", "🚨 ¡PELIGRO! Al igual que MySQL, no debería estar expuesto públicamente."),
        3389: ("RDP", "⚠️ Abierto. Escritorio Remoto de Windows. Riesgo alto si no está bien securizado (NLA, contraseñas fuertes)."),
        
        # Puertos Alternativos y de Proxy
        8080: ("HTTP-Proxy/Alt", "✅ Abierto. Común para servidores de aplicaciones o proxies. Revisar qué servicio corre detrás."),
        8443: ("HTTPS-Alt", "✅ Abierto. Alternativa común para HTTPS. Revisar qué servicio corre detrás.")
    }
    
    open_ports_details = []
    
    for port, (service, advice) in common_ports.items():
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.4) # Timeout aún más rápido para un escaneo ágil
        if sock.connect_ex((ip_address, port)) == 0:
            # Añadimos el servicio y el consejo de seguridad
            open_ports_details.append(f"`{port}/{service}`: {advice}")
        sock.close()
    
    if open_ports_details:
        report.extend(open_ports_details)
    else:
        report.append("✅ ¡Excelente! No se encontraron puertos de riesgo comunes abiertos.")
        
    return "\n".join(report)

def analyze_nic_cl(domain, ip_address):
    """
    Análisis especializado para dominios .cl.
    """
    report = [f"🔍 *Análisis para dominio chileno:* `{domain}` ({ip_address})\n"]
    try:
        report.append("--- 🇨🇱 WHOIS (NIC Chile) ---")
        with socket.create_connection(("whois.nic.cl", 43), timeout=10) as s:
            s.sendall((domain + "\r\n").encode())
            response = b""
            while True: data = s.recv(4096); response += data;_ = not data or data
        text_response = response.decode('utf-8', errors='ignore')
        if "no existe" in text_response.lower():
             report.append(f"⚠️ El dominio `{domain}` no se encuentra registrado.")
        elif text_response:
            lines = text_response.splitlines()
            found_data = False
            for line in lines:
                if "Fecha de creación:" in line: report.append(f"Creado: `{line.split(':', 1)[1].strip()}`"); found_data = True
                if "Fecha de expiración:" in line: report.append(f"Expira: `{line.split(':', 1)[1].strip()}`"); found_data = True
                if "Servidores de nombre:" in line: ns_list = ', '.join(line.split(':', 1)[1].strip().split()); report.append(f"Servidores de Nombre: `{ns_list}`"); found_data = True
            if not found_data: report.append("⚠️ No se encontraron datos públicos.")
        else: report.append("⚠️ No se pudo obtener respuesta de NIC Chile.")
    except Exception as e:
        report.append(f"⚠️ Error en la conexión a NIC Chile: {e}")
    
    report.append("")
    # --- ¡Llamamos al nuevo escaneo detallado! ---
    report.append(detailed_port_scan(ip_address))
    return "\n".join(report)

def analyze_international_domain(domain, ip_address):
    """
    Análisis completo para dominios internacionales.
    """
    report = [f"🔍 *Análisis para:* `{domain}` ({ip_address})\n"]
    try:
        geo_info = ipapi.location(ip=ip_address, output='json')
        report.append(f"--- 📍 GeoIP ---\nPaís: `{geo_info.get('country_name', 'N/A')}`\nCiudad: `{geo_info.get('city', 'N/A')}`\nISP: `{geo_info.get('org', 'N/A')}`\n")
    except: report.append("--- 📍 GeoIP ---\n⚠️ No se pudo obtener geolocalización.\n")
    try:
        report.append("--- 🛡️ SSL & Servidor ---")
        headers = requests.head(f"https://{domain}", timeout=5, allow_redirects=True).headers
        report.append(f"Servidor Web: `{headers.get('Server', 'No identificado')}`")
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.socket(), server_hostname=domain) as s:
            s.settimeout(5); s.connect((domain, 443)); cert = s.getpeercert()
        issuer = dict(x[0] for x in cert.get('issuer', []))
        valid_to = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
        report.append(f"Certificado SSL por: `{issuer.get('commonName', 'N/A')}`\nExpira: `{valid_to.strftime('%Y-%m-%d')}`\n")
    except: report.append("⚠️ No se pudo obtener información SSL/Servidor.\n")
    try:
        report.append("--- 🌐 Registros DNS ---")
        report.append(f"*A (IPv4):* `{', '.join([str(r) for r in dns.resolver.resolve(domain, 'A')])}`")
        report.append(f"*NS:* `{', '.join(sorted([str(r) for r in dns.resolver.resolve(domain, 'NS')]))}`")
        report.append(f"*MX (Correo):* `{', '.join(sorted([f'{r.preference} {r.exchange}' for r in dns.resolver.resolve(domain, 'MX')]))}`\n")
    except: report.append("⚠️ No se pudieron obtener registros DNS.\n")
    try:
        report.append("--- ℹ️ WHOIS ---")
        w = whois.whois(domain)
        creation_date = w.creation_date[0] if isinstance(w.creation_date, list) else w.creation_date
        expiration_date = w.expiration_date[0] if isinstance(w.expiration_date, list) else w.expiration_date
        report.append(f"Registrador: `{w.registrar}`\nCreado: `{creation_date.strftime('%Y-%m-%d') if creation_date else 'N/A'}`\nExpira: `{expiration_date.strftime('%Y-%m-%d') if expiration_date else 'N/A'}`\n")
    except: report.append("⚠️ No se pudo obtener información de WHOIS.\n")
    
    # --- ¡Llamamos al nuevo escaneo detallado! ---
    report.append(detailed_port_scan(ip_address))
    return "\n".join(report)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python net_analyzer.py <dominio_o_ip>", file=sys.stderr); sys.exit(1)
    target = sys.argv[1].lower()
    try:
        ip_address = socket.gethostbyname(target)
        if target.endswith('.cl'):
            full_report = analyze_nic_cl(target, ip_address)
        else:
            full_report = analyze_international_domain(target, ip_address)
        print(full_report)
    except socket.gaierror:
        print(f"❌ No se pudo resolver '{target}'.", file=sys.stderr); sys.exit(1)
    except Exception as e:
        print(f"Ocurrió un error: {e}", file=sys.stderr); sys.exit(1)

