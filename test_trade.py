import requests

API_URL = "https://testnet.perpl.xyz/api"

def fetch_market_data():
    print("Connecting to Perpl Testnet...")
    url = f"{API_URL}/v1/pub/context"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print("\nSuccessfully connected to Perpl!")
            print(f"Chain ID: {data.get('chain', {}).get('chain_id')}")
            print("\nAvailable Markets on Testnet:")
            for market in data.get('markets', []):
                print(f"ID: {market.get('id')} | Symbol: {market.get('symbol')}")
        else:
            print(f"Failed to connect. HTTP Status: {response.status_code}")
    except Exception as e:
        print(f"Error connecting: {e}")

if __name__ == "__main__":
    fetch_market_data()