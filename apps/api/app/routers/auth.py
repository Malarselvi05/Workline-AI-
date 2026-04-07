from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import models
from app.schemas.auth import LoginRequest, Token, UserResponse, SignupRequest
from app.auth.jwt import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=Token)
async def signup(response: Response, signup_data: SignupRequest, db: Session = Depends(get_db)):
    print(f"[PY] auth.py | signup | L12: Logic flowing")
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == signup_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create a default organisation for the new user
    new_org = models.Organisation(name=f"{signup_data.name}'s Org", plan="basic")
    db.add(new_org)
    db.commit()
    db.refresh(new_org)
    
    # Create the new user
    new_user = models.User(
        name=signup_data.name,
        email=signup_data.email,
        password_hash=get_password_hash(signup_data.password),
        role="admin",
        org_id=new_org.id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate tokens
    access_token = create_access_token(data={"sub": new_user.email})
    refresh_token = create_refresh_token(data={"sub": new_user.email})
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,
        samesite="lax",
        secure=False,
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token
    }

@router.post("/login", response_model=Token)
async def login(response: Response, login_data: LoginRequest, db: Session = Depends(get_db)):
    print(f"[PY] auth.py | login | L56: Keep it up")
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})
    
    # Set refresh token in HTTP-only cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,  # 7 days
        samesite="lax",
        secure=False,  # Set to True in production with HTTPS
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token
    }

@router.post("/refresh", response_model=Token)
async def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    print(f"[PY] auth.py | refresh_token | L85: Code alive")
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        # Fallback to body if cookie not present (for non-browser clients)
        # But for M2 let's stick to the cookie as per plan
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")
    
    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    
    email = payload.get("sub")
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    new_access_token = create_access_token(data={"sub": user.email})
    new_refresh_token = create_refresh_token(data={"sub": user.email})
    
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,
        samesite="lax",
        secure=False,
    )
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "refresh_token": new_refresh_token
    }

@router.post("/logout")
async def logout(response: Response):
    print(f"[PY] auth.py | logout | L120: Antigravity active")
    response.delete_cookie("refresh_token")
    return {"detail": "Successfully logged out"}

from app.auth.dependencies import get_current_active_user

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: models.User = Depends(get_current_active_user)):
    print(f"[PY] auth.py | get_me | L127: Data processing")
    return current_user