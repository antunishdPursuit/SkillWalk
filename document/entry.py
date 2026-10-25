from pathlib import Path
import os, subprocess
subprocess.Popen(["python","/input/ollama_bridge.py"])
os.chdir("/work")
os.environ["DOCUMENT_OLLAMA_BASE"]="http://127.0.0.1:11434"
os.environ["DOCUMENT_EMBEDDING_BASE"]="http://127.0.0.1:11434"
os.execvp("streamlit",["streamlit","run","/input/app.py","--server.address=0.0.0.0","--server.port=8501","--server.baseUrlPath="+os.environ["DOCUMENT_SESSION"],"--server.headless=true","--browser.gatherUsageStats=false","--server.fileWatcherType=none","--server.maxUploadSize=10","--client.toolbarMode=viewer","--server.enableXsrfProtection=true","--server.enableCORS=true"])
