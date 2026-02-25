from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import models
from app.auth.jwt import decode_token
from app.core.context import set_org_id
import logging

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise credentials_exception
    
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    
    # Set org_id in context for the multi-tenancy listener
    if user.org_id:
        set_org_id(user.org_id)
        
    return user

async def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    return current_user

def check_role(roles: list):
    async def role_checker(current_user: models.User = Depends(get_current_active_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The user doesn't have enough privileges"
            )
        return current_user
    return role_checker

require_admin = Depends(check_role(["admin"]))
require_editor = Depends(check_role(["admin", "editor"]))
require_viewer = Depends(check_role(["admin", "editor", "viewer"]))
