import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Si Render nos da una base de datos externa, la usa. Si estás en tu PC, usa el archivo local "barberia.db".
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./barberia.db")

# Ajuste automático requerido si usamos PostgreSQL en Render
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Los argumentos de conexión cambian dependiendo de si es SQLite (local) o Postgres (nube)
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()