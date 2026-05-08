import os
import base64

from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes


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


def verify_password(stored_hash, password, salt):
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )

    key = kdf.derive(password.encode("utf-8"))

    return base64.urlsafe_b64encode(key).decode() == stored_hash