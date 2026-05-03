import requests
import base64
from datetime import datetime
import os
from typing import Optional

from sqlalchemy.orm import Session
import models

class MpesaClient:
    def __init__(self):
        # These are now fallbacks or defaults
        self.env = os.getenv("MPESA_ENV", "sandbox")
        self.base_url = "https://sandbox.safaricom.co.ke" if self.env == "sandbox" else "https://api.safaricom.co.ke"

    def _get_setting(self, db: Session, key: str, default: Optional[str] = None) -> Optional[str]:
        setting = db.query(models.SystemSettings).filter(models.SystemSettings.key == key).first()
        if setting:
            return setting.value
        return os.getenv(key.upper(), default)

    def get_access_token(self, db: Session) -> Optional[str]:
        consumer_key = self._get_setting(db, "mpesa_consumer_key").strip()
        consumer_secret = self._get_setting(db, "mpesa_consumer_secret").strip()
        env = self._get_setting(db, "mpesa_env", "sandbox").strip()
        base_url = "https://sandbox.safaricom.co.ke" if env == "sandbox" else "https://api.safaricom.co.ke"
        
        print(f"DEBUG: M-Pesa Env: {env}, Base URL: {base_url}")
        
        api_url = f"{base_url}/oauth/v1/generate?grant_type=client_credentials"
        auth_string = f"{consumer_key}:{consumer_secret}"
        encoded_auth = base64.b64encode(auth_string.encode()).decode()
        
        headers = {
            "Authorization": f"Basic {encoded_auth}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(api_url, headers=headers)
        print(f"DEBUG: Token Request Status: {response.status_code}, Response: {response.text}")
        if response.status_code == 200:
            token = response.json().get("access_token")
            if token:
                token = token.strip()
                print(f"DEBUG: Clean Token (repr): {repr(token)}")
                return token
        return None

    def stk_push(self, db: Session, amount: int, phone_number: str, callback_url: str, account_ref: str):
        access_token = self.get_access_token(db)
        if not access_token:
            return {"error": "Failed to get access token"}

        shortcode = self._get_setting(db, "mpesa_shortcode").strip()
        passkey = self._get_setting(db, "mpesa_passkey").strip()
        env = self._get_setting(db, "mpesa_env", "sandbox").strip()
        base_url = "https://sandbox.safaricom.co.ke" if env == "sandbox" else "https://api.safaricom.co.ke"

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode()
        
        # Always use CustomerPayBillOnline for Paybill shortcodes
        transaction_type = "CustomerPayBillOnline"

        api_url = f"{base_url}/mpesa/stkpush/v1/processrequest"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "BusinessShortCode": int(shortcode),
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": transaction_type,
            "Amount": int(amount),
            "PartyA": phone_number,
            "PartyB": int(shortcode),
            "PhoneNumber": phone_number,
            "CallBackURL": callback_url,
            "AccountReference": account_ref.replace("#", ""),
            "TransactionDesc": f"Payment for {account_ref}"
        }
        
        print(f"DEBUG: STK Push URL: {api_url}")
        print(f"DEBUG: STK Push Payload (partial): { {k:v for k,v in payload.items() if k != 'Password'} }")
        
        response = requests.post(api_url, json=payload, headers=headers)
        return response.json()

# Instantiate global client
mpesa = MpesaClient()

