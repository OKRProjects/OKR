import os

from app.repositories.okr_repo_mongo import MongoOKRRepository
from app.repositories.okr_repo_postgres import PostgresOKRRepository


def get_okr_repository():
    """
    Feature flag for progressive migration:
    - OKR_REPOSITORY=mongo (default)
    - OKR_REPOSITORY=postgres
    """
    repo = (os.getenv("OKR_REPOSITORY") or "mongo").strip().lower()
    if repo == "postgres":
        return PostgresOKRRepository()
    return MongoOKRRepository()

