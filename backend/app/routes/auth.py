import requests
import os
from functools import wraps
from flask import request, jsonify

AUTH0_DOMAIN = os.getenv('AUTH0_DOMAIN')
AUTH0_AUDIENCE = os.getenv('AUTH0_AUDIENCE')
if not AUTH0_AUDIENCE and AUTH0_DOMAIN:
    AUTH0_AUDIENCE = f'https://{AUTH0_DOMAIN}/api/v2/'

def get_jwks():
    """Fetch Auth0 JWKS (JSON Web Key Set)"""
    jwks_url = f'https://{AUTH0_DOMAIN}/.well-known/jwks.json'
    response = requests.get(jwks_url)
    return response.json()

def verify_token(token: str) -> dict:
    """Verify Auth0 JWT token and return decoded payload"""
    try:
        import jwt
        from jwt import PyJWKClient
        
        if not AUTH0_DOMAIN:
            raise ValueError("AUTH0_DOMAIN not configured")
        
        # Create JWKS client
        jwks_url = f'https://{AUTH0_DOMAIN}/.well-known/jwks.json'
        jwks_client = PyJWKClient(jwks_url)
        
        # Get signing key
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        # Decode and verify token
        decoded_token = jwt.decode(
            token,
            signing_key.key,
            algorithms=['RS256'],
            audience=AUTH0_AUDIENCE,
            issuer=f'https://{AUTH0_DOMAIN}/'
        )
        
        return decoded_token
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError as e:
        raise ValueError(f"Invalid token: {str(e)}")

def get_user_id_from_token() -> str:
    """Extract user ID from Authorization header"""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        raise ValueError("No authorization header")
    
    try:
        token = auth_header.split(' ')[1]  # Remove 'Bearer ' prefix
        decoded = verify_token(token)
        return decoded.get('sub')  # Auth0 user ID is in 'sub' claim
    except Exception as e:
        raise ValueError(f"Failed to get user ID: {str(e)}")

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            user_id = get_user_id_from_token()
            # Add user_id to kwargs so route handlers can access it
            kwargs['user_id'] = user_id
            return f(*args, **kwargs)
        except ValueError as e:
            return jsonify({'error': str(e)}), 401
        except Exception as e:
            return jsonify({'error': 'Authentication failed'}), 401
    return decorated_function
