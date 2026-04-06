import os


def create_app():
    # Imports live here so scripts can `import app.db.*` without pulling Flask/SQLAlchemy.
    from flask import Flask
    from flask_cors import CORS

    from app.db.mongodb import init_db
    from app.db.postgres import init_pg, run_alembic_migrations
    from app.config.cloudinary_config import init_cloudinary

    app = Flask(__name__)

    # Configuration
    app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 hours
    # Frontend (e.g. :3000) and API (:5001) are different origins; Lax blocks the session cookie on
    # fetch(..., credentials: 'include'). SameSite=None + Secure lets the browser attach the cookie
    # on cross-origin API calls (Chrome allows Secure cookies on http://localhost).
    _cross_site = os.getenv('SESSION_COOKIE_CROSS_SITE', 'true').strip().lower() in (
        '1',
        'true',
        'yes',
    )
    if _cross_site:
        app.config['SESSION_COOKIE_SAMESITE'] = 'None'
        app.config['SESSION_COOKIE_SECURE'] = True
    else:
        app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
        app.config['SESSION_COOKIE_SECURE'] = False

    # CORS configuration
    cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
    CORS(app, origins=cors_origins, supports_credentials=True)

    # Initialize MongoDB (non-blocking - will connect on first request)
    try:
        init_db()
    except Exception as e:
        print(f"Warning: MongoDB connection failed: {e}")
        print("Backend will start but database operations will fail until MongoDB is available.")

    # Postgres: migrations must succeed or the API will query missing tables (do not swallow errors).
    if os.getenv("DATABASE_URL"):
        run_alembic_migrations()
        init_pg()
        print("Postgres engine initialized", flush=True)

    # Initialize Cloudinary
    init_cloudinary()

    # Register blueprints
    from app.routes import items, health, profiles, chat, auth_backend, okrs, shares, integrations, webhooks, orgs, google_email, notifications
    app.register_blueprint(items.bp, url_prefix='/api')
    app.register_blueprint(profiles.bp, url_prefix='/api')
    app.register_blueprint(chat.bp, url_prefix='/api')
    app.register_blueprint(auth_backend.bp, url_prefix='/api')
    app.register_blueprint(okrs.bp, url_prefix='/api')
    app.register_blueprint(shares.bp, url_prefix='/api')
    app.register_blueprint(integrations.bp, url_prefix='/api')
    app.register_blueprint(webhooks.bp, url_prefix='/api')
    app.register_blueprint(orgs.bp, url_prefix='/api')
    app.register_blueprint(google_email.bp, url_prefix='/api')
    app.register_blueprint(notifications.bp, url_prefix='/api')
    app.register_blueprint(health.bp)

    return app
