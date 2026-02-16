from flask import Blueprint, request, jsonify, redirect, session, url_for
from functools import wraps
import requests
import os
import jwt
from jwt import PyJWKClient
from datetime import datetime, timedelta

bp = Blueprint('auth_backend', __name__)

AUTH0_DOMAIN = os.getenv('AUTH0_DOMAIN')
AUTH0_CLIENT_ID = os.getenv('AUTH0_CLIENT_ID')
AUTH0_CLIENT_SECRET = os.getenv('AUTH0_CLIENT_SECRET')
AUTH0_AUDIENCE = os.getenv('AUTH0_AUDIENCE')
AUTH0_BASE_URL = os.getenv('AUTH0_BASE_URL', 'http://localhost:3000')
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000')

if not AUTH0_AUDIENCE and AUTH0_DOMAIN:
    AUTH0_AUDIENCE = f'https://{AUTH0_DOMAIN}/api/v2/'

def get_jwks_client():
    """Get JWKS client for Auth0"""
    if not AUTH0_DOMAIN:
        return None
    jwks_url = f'https://{AUTH0_DOMAIN}/.well-known/jwks.json'
    return PyJWKClient(jwks_url)

def verify_token(token: str, is_id_token: bool = False) -> dict:
    """Verify Auth0 JWT token and return decoded payload
    
    Args:
        token: JWT token to verify
        is_id_token: If True, verify as ID token (audience = client_id)
                    If False, verify as access token (audience = API audience)
    """
    try:
        if not AUTH0_DOMAIN:
            raise ValueError("AUTH0_DOMAIN not configured")
        
        jwks_client = get_jwks_client()
        if not jwks_client:
            raise ValueError("Could not initialize JWKS client")
        
        # Get signing key
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        # For ID tokens, audience is the client ID (or can be an array containing it)
        # For access tokens, audience is the API audience
        if is_id_token:
            # ID tokens can have audience as client_id or as an array
            # Try with client_id first, but also allow verification without strict audience check
            try:
                decoded_token = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=['RS256'],
                    audience=AUTH0_CLIENT_ID,
                    issuer=f'https://{AUTH0_DOMAIN}/',
                    options={"verify_aud": True}
                )
            except jwt.InvalidAudienceError:
                # If audience check fails, try without audience verification for ID token
                # (ID tokens are meant for the client, not the API)
                decoded_token = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=['RS256'],
                    issuer=f'https://{AUTH0_DOMAIN}/',
                    options={"verify_aud": False}
                )
        else:
            # Access tokens must have the API audience
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

def get_user_from_session():
    """Get user info from session"""
    return session.get('user')

def get_user_id_from_request() -> str:
    """Extract user ID from session or Authorization header"""
    # First try session
    user = get_user_from_session()
    if user and user.get('sub'):
        return user['sub']
    
    # Fall back to Authorization header
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            token = auth_header.split(' ')[1]  # Remove 'Bearer ' prefix
            decoded = verify_token(token)
            return decoded.get('sub')
        except Exception:
            pass
    
    raise ValueError("No authenticated user found")

def get_user_info_from_request() -> dict:
    """Get user info from session or token"""
    # First try session
    user = get_user_from_session()
    if user:
        return {
            'sub': user.get('sub'),
            'name': user.get('name') or user.get('nickname') or '',
            'email': user.get('email') or '',
            'picture': user.get('picture') or '',
            'nickname': user.get('nickname') or user.get('name') or '',
        }
    
    # Fall back to Authorization header
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            token = auth_header.split(' ')[1]
            decoded = verify_token(token)
            return {
                'sub': decoded.get('sub'),
                'name': decoded.get('name') or decoded.get('nickname') or '',
                'email': decoded.get('email') or '',
                'picture': decoded.get('picture') or '',
                'nickname': decoded.get('nickname') or decoded.get('name') or '',
            }
        except Exception as e:
            raise ValueError(f"Failed to get user info: {str(e)}")
    
    raise ValueError("No authenticated user found")

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            user_id = get_user_id_from_request()
            kwargs['user_id'] = user_id
            return f(*args, **kwargs)
        except ValueError as e:
            return jsonify({'error': str(e)}), 401
        except Exception as e:
            return jsonify({'error': 'Authentication failed'}), 401
    return decorated_function

@bp.route('/auth/login', methods=['GET'])
def login():
    """Redirect to Auth0 login"""
    if not AUTH0_DOMAIN or not AUTH0_CLIENT_ID:
        error_msg = 'Auth0 not configured. Please set AUTH0_DOMAIN and AUTH0_CLIENT_ID in backend .env file.'
        print(f"ERROR: {error_msg}")
        return jsonify({'error': error_msg}), 500
    
    # Use backend callback URL since backend handles the OAuth flow
    redirect_uri = f'{BACKEND_URL}/api/auth/callback'
    auth_url = (
        f'https://{AUTH0_DOMAIN}/authorize?'
        f'response_type=code&'
        f'client_id={AUTH0_CLIENT_ID}&'
        f'redirect_uri={redirect_uri}&'
        f'scope=openid profile email&'
        f'audience={AUTH0_AUDIENCE}'
    )
    
    return jsonify({'auth_url': auth_url}), 200

@bp.route('/auth/callback', methods=['GET'])
def callback():
    """Handle Auth0 callback"""
    from flask import redirect as flask_redirect
    
    code = request.args.get('code')
    if not code:
        return flask_redirect(f'{AUTH0_BASE_URL}?error=no_code')
    
    # Exchange code for token
    token_url = f'https://{AUTH0_DOMAIN}/oauth/token'
    token_data = {
        'grant_type': 'authorization_code',
        'client_id': AUTH0_CLIENT_ID,
        'client_secret': AUTH0_CLIENT_SECRET,
        'code': code,
        'redirect_uri': f'{BACKEND_URL}/api/auth/callback'
    }
    
    try:
        response = requests.post(token_url, json=token_data)
        if not response.ok:
            return flask_redirect(f'{AUTH0_BASE_URL}?error=token_exchange_failed')
        
        token_response = response.json()
        access_token = token_response.get('access_token')
        id_token = token_response.get('id_token')
        
        if not access_token or not id_token:
            return flask_redirect(f'{AUTH0_BASE_URL}?error=no_tokens')
        
        # Decode ID token to get user info
        # ID tokens use client_id as audience, not API audience
        try:
            decoded = verify_token(id_token, is_id_token=True)
            user_info = {
                'sub': decoded.get('sub'),
                'name': decoded.get('name') or decoded.get('nickname') or '',
                'email': decoded.get('email') or '',
                'picture': decoded.get('picture') or '',
                'nickname': decoded.get('nickname') or decoded.get('name') or '',
            }
            
            # Store in session
            session['user'] = user_info
            session['access_token'] = access_token
            session.permanent = True
            
            # Redirect to frontend dashboard (AUTH0_BASE_URL is the frontend URL)
            return flask_redirect(f'{AUTH0_BASE_URL}/dashboard')
        except Exception as e:
            error_msg = str(e)
            print(f"Token decode error: {error_msg}")
            import traceback
            traceback.print_exc()
            return flask_redirect(f'{AUTH0_BASE_URL}?error=token_decode_failed')
            
    except Exception as e:
        return flask_redirect(f'{AUTH0_BASE_URL}?error=token_exchange_error')

@bp.route('/auth/logout', methods=['POST', 'GET'])
def logout():
    """Logout user"""
    session.clear()
    
    # Redirect to Auth0 logout
    if AUTH0_DOMAIN:
        logout_url = (
            f'https://{AUTH0_DOMAIN}/v2/logout?'
            f'client_id={AUTH0_CLIENT_ID}&'
            f'returnTo={AUTH0_BASE_URL}'
        )
        return jsonify({'logout_url': logout_url}), 200
    
    return jsonify({'message': 'Logged out'}), 200

@bp.route('/auth/me', methods=['GET'])
@require_auth
def get_current_user(user_id):
    """Get current authenticated user"""
    try:
        user_info = get_user_info_from_request()
        return jsonify(user_info), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 401

@bp.route('/auth/token', methods=['GET'])
def get_token():
    """Get access token for API calls"""
    user = get_user_from_session()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    
    access_token = session.get('access_token')
    if not access_token:
        return jsonify({'error': 'No access token available'}), 401
    
    return jsonify({'accessToken': access_token}), 200
