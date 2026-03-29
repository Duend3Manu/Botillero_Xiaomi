#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script de prueba para verificar que playwright funciona correctamente
"""

import sys
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

def test_playwright():
    """Prueba básica de Playwright"""
    try:
        print("✅ Importación de playwright: OK")
        
        with sync_playwright() as p:
            print("✅ sync_playwright context: OK")
            
            browser = p.chromium.launch(headless=True)
            print("✅ Chromium browser launched: OK")
            
            page = browser.new_page()
            print("✅ New page created: OK")
            
            # Test rápido de navegación
            page.goto("https://www.google.com", wait_until="domcontentloaded", timeout=10000)
            print("✅ Page navigation: OK")
            
            title = page.title()
            print(f"✅ Page title: {title}")
            
            browser.close()
            print("✅ Browser closed: OK")
            
        print("\n🎉 TODOS LOS TESTS PASARON - Playwright está correctamente instalado")
        return True
        
    except PlaywrightTimeoutError as e:
        print(f"❌ Timeout Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_playwright()
    sys.exit(0 if success else 1)
