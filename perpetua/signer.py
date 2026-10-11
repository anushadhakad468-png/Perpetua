"""
Perpetua Signer Module
Handles secure burner wallet loading, Ed25519 API key management,
and canonical message signing for Perpl exchange requests.
"""

import os
import time
import base64
import secrets
import hashlib
from typing import Dict, Tuple, Optional, Any

from eth_account import Account
from eth_account.signers.local import LocalAccount
from eth_account.messages import encode_typed_data
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.hazmat.primitives import serialization

from .config import Config


def base64url_encode(data: bytes) -> str:
    """Encodes bytes into URL-safe base64 without padding (=), matching Perpl specs."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


class PerplSigner:
    """
    Manages both Ethereum burner wallet (secp256k1) and Perpl API key (Ed25519).
    Provides cryptographically verified signatures for REST requests and order payloads.
    """

    def __init__(self, config: Config):
        self.config = config
        self.config.validate()

        # 1. Initialize Burner Wallet from .env (secp256k1)
        raw_key = self.config.private_key.strip()
        if not raw_key.startswith("0x"):
            raw_key = "0x" + raw_key
        
        self.wallet: LocalAccount = Account.from_key(raw_key)
        self.wallet_address: str = self.wallet.address

        # 2. Initialize or Generate Ed25519 Keypair for Perpl API Authentication
        self.api_key: Optional[str] = self.config.api_key or None
        self.ed25519_priv: Optional[Ed25519PrivateKey] = None

        if self.config.api_key_secret:
            secret_clean = self.config.api_key_secret.strip().removeprefix("0x")
            self.ed25519_priv = Ed25519PrivateKey.from_private_bytes(bytes.fromhex(secret_clean))
        else:
            # Deterministically derive or generate an Ed25519 key based on the wallet key hash
            # This ensures that restarts use the same Ed25519 public key if not explicitly set
            seed = hashlib.sha256(f"perpetua-ed25519:{self.config.private_key}".encode()).digest()
            self.ed25519_priv = Ed25519PrivateKey.from_private_bytes(seed)
            if not self.api_key:
                # Placeholder identifier until enrolled or if running locally
                self.api_key = f"key_{self.wallet_address[:10].lower()}"

    @property
    def ed25519_public_hex(self) -> str:
        """Returns the 32-byte Ed25519 public key formatted as a 0x-prefixed hex string."""
        if not self.ed25519_priv:
            raise RuntimeError("Ed25519 private key is not initialized.")
        pub: Ed25519PublicKey = self.ed25519_priv.public_key()
        raw = pub.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )
        return "0x" + raw.hex()

    def sign_rest_headers(self, method: str, target: str, body: str = "") -> Dict[str, str]:
        """
        Signs a REST request target using Perpl's canonical string specification:
        
        Canonical format:
          <chain_id>
          <HTTP_METHOD>
          <request-target>
          <timestamp_ms>
          <nonce>
          <sha256(body) hex>

        Returns the headers required:
          X-API-Key, X-API-Timestamp, X-API-Nonce, X-API-Signature
        """
        if not self.ed25519_priv or not self.api_key:
            return {}

        method_upper = method.upper()
        timestamp = str(int(time.time() * 1000))
        nonce = base64url_encode(secrets.token_bytes(16))
        body_hash = hashlib.sha256(body.encode("utf-8")).hexdigest()

        canonical_parts = [
            str(self.config.chain_id),
            method_upper,
            target,
            timestamp,
            nonce,
            body_hash,
        ]
        canonical_str = "\n".join(canonical_parts)

        signature_bytes = self.ed25519_priv.sign(canonical_str.encode("utf-8"))
        signature_b64 = base64url_encode(signature_bytes)

        headers = {
            "X-API-Key": self.api_key,
            "X-API-Timestamp": timestamp,
            "X-API-Nonce": nonce,
            "X-API-Signature": signature_b64,
        }
        if body:
            headers["Content-Type"] = "application/json"

        return headers

    def sign_eip712(self, typed_data: Dict[str, Any]) -> str:
        """
        Signs an EIP-712 structured data payload using the burner wallet private key.
        Returns the hex signature string.
        """
        signable_message = encode_typed_data(full_message=typed_data)
        signed_message = self.wallet.sign_message(signable_message)
        return signed_message.signature.hex()

    def sign_digest_pop(self, digest: bytes) -> str:
        """
        Generates Ed25519 Proof-of-Possession (POP) signature over a 32-byte digest.
        """
        if not self.ed25519_priv:
            raise RuntimeError("Ed25519 key not loaded.")
        sig = self.ed25519_priv.sign(digest)
        return "0x" + sig.hex()
