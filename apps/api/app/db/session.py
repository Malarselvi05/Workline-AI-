from sqlalchemy import create_engine, MetaData, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Query, with_loader_criteria, Session
import os
from dotenv import load_dotenv
from app.core.context import get_org_id

load_dotenv()

# Use SQLite by default for easier local setup
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./workline.db")

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

metadata = MetaData(naming_convention=naming_convention)
Base = declarative_base(metadata=metadata)

@event.listens_for(Session, "do_orm_execute")
def _do_orm_execute(orm_execute_state):
    # Only apply if we have an org_id context
    org_id = get_org_id()
    
    if (
        org_id is not None
        and not orm_execute_state.is_column_load
        and not orm_execute_state.is_relationship_load
    ):
        # print(f"DEBUG: Applying org_id={org_id} filter to {orm_execute_state.statement}")
        # This is the modern way in SQLAlchemy 2.0 to apply global filters
        # It handles limit/offset/joins correctly
        orm_execute_state.statement = orm_execute_state.statement.options(
            with_loader_criteria(
                Base,
                lambda cls: hasattr(cls, "org_id") and cls.org_id == org_id,
                include_aliases=True,
                track_closure_variables=False
            )
        )

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
