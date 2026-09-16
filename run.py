#!/usr/bin/env python3
"""
Ponto de Entrada Principal da Aplicação 'Cofre de Documentos' em Python.
Para executar o servidor backend em Python:
    python3 run.py [porta]
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.server import rodar_servidor

if __name__ == "__main__":
    porta = 5001
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        porta = int(sys.argv[1])
    rodar_servidor(porta=porta)
