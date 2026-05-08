import os
import base64
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from flask import Flask, request, jsonify
from auth import generate_salt, hash_password, verify_password

app = Flask(__name__)


@app.post("/hash")
def generate_salt():
    return os.urandom(16)  

def hash_password(password, salt):
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = kdf.derive(password.encode("utf-8"))
    return base64.urlsafe_b64encode(key).decode()


@app.post("/verify")
def verify_password(stored_hash, password, salt):
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = kdf.derive(password.encode("utf-8"))
    return base64.urlsafe_b64encode(key).decode() == stored_hash


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6000)