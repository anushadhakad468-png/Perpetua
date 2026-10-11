"""
Perpetua Configuration Module
Loads network, exchange addresses, and credentials from environment variables.
"""

import os
from dataclasses import dataclass
from dotenv import load_dotenv

# Ensure environment variables are loaded from the root .env
load_dotenv()


@dataclass
class Config:
    """Network and protocol configuration for Perpetua on Monad Testnet."""
    
    # Private Key for the burner wallet (Hex string without or with 0x)
    private_key: str = os.getenv("PRIVATE_KEY", "")
    
    # Perpl Exchange REST API Base URL
    api_url: str = os.getenv("PERPL_API_URL", "https://testnet.perpl.xyz/api").rstrip("/")
    
    # Perpl WebSocket Base URL (note: no /api prefix)
    ws_url: str = os.getenv("PERPL_WS_URL", "wss://testnet.perpl.xyz").rstrip("/")
    
    # Monad Testnet Chain ID
    chain_id: int = int(os.getenv("PERPL_CHAIN_ID", "10143"))
    
    # Monad RPC Endpoint
    rpc_url: str = os.getenv("PERPL_RPC_URL", "https://testnet-rpc.monad.xyz")
    
    # Perpl Exchange Smart Contract Instance on Monad Testnet
    exchange_address: str = os.getenv("PERPL_EXCHANGE_ADDRESS", "0x1964c32f0be608e7d29302aff5e61268e72080cc")
    
    # Collateral Token Address (AUSD on Testnet)
    collateral_token_address: str = os.getenv("PERPL_COLLATERAL_TOKEN", "0xa9012a055bd4e0edff8ce09f960291c09d5322dc")
    
    # Optional Pre-Enrolled API Key credentials
    api_key: str = os.getenv("PERPL_API_KEY", "")
    api_key_secret: str = os.getenv("PERPL_API_KEY_SECRET", "")
    
    # Monad Explorer URL for receipts
    explorer_url: str = os.getenv("EXPLORER_URL", "https://testnet.monadscan.com").rstrip("/")
    
    # Request timeout in seconds
    request_timeout: float = float(os.getenv("REQUEST_TIMEOUT", "10.0"))

    def validate(self) -> None:
        """Validates that critical configurations are present."""
        if not self.private_key:
            raise ValueError(
                "PRIVATE_KEY is missing in .env. Please configure your burner wallet private key."
            )
