import os
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


_engine = None
_SessionLocal = None


def init_pg():
    """
    Initialize SQLAlchemy engine + session factory.

    Uses DATABASE_URL, e.g. postgresql+psycopg://user:pass@localhost:5432/hackathon
    """
    global _engine, _SessionLocal
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is not set")

    # pool_pre_ping helps with stale connections (common in serverless/containers)
    _engine = create_engine(database_url, pool_pre_ping=True, future=True)
    _SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False, future=True)
    return _engine


def get_engine():
    global _engine
    if _engine is None:
        init_pg()
    return _engine


def get_session_factory():
    global _SessionLocal
    if _SessionLocal is None:
        init_pg()
    return _SessionLocal


@contextmanager
def pg_session():
    SessionLocal = get_session_factory()
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

