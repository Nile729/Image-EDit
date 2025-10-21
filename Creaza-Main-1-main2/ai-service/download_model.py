#!/usr/bin/env python3
"""
Download LapSRN model for image enhancement
"""
import os
import urllib.request

MODEL_URL = "https://github.com/fannymonori/TF-LapSRN/raw/master/export/LapSRN_x4.pb"
MODEL_PATH = "LapSRN_x4.pb"

def download_model():
    if os.path.exists(MODEL_PATH):
        print(f"Model already exists: {MODEL_PATH}")
        return
    
    print(f"Downloading LapSRN model from {MODEL_URL}")
    try:
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print(f"Model downloaded successfully: {MODEL_PATH}")
        print(f"Model size: {os.path.getsize(MODEL_PATH) / 1024 / 1024:.1f} MB")
    except Exception as e:
        print(f"Failed to download model: {e}")
        print("Please download manually from:")
        print(MODEL_URL)

if __name__ == "__main__":
    download_model()