# api/auth.py

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional, Union

# This form is still needed to correctly parse the login request body
from fastapi.security import OAuth2PasswordRequestForm

from db import db_utils

# --- Configuration ---
# In a real app, load these from a config file or environment variables.
SECRET_KEY = "your-super-secret-key-that-is-long-and-random" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# --- Router Setup ---
router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

# --- Pydantic Models (Data Shapes) ---

class TokenData(BaseModel):
    """Pydantic model for the data encoded in the JWT."""
    username: Optional[str] = None
    role: Optional[str] = None

class User(BaseModel):
    """Pydantic model for user details."""
    username: str
    role: str
    is_active: bool

# --- Core Authentication Functions ---

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed one."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a new JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- NEW: Dependency to get token from httpOnly cookie ---

def get_token_from_cookie(request: Request) -> str | None:
    """Dependency to extract the JWT from the request's cookies."""
    return request.cookies.get("access_token")

# --- UPDATED: Dependency for Getting Current User ---

async def get_current_user(token: str = Depends(get_token_from_cookie)) -> TokenData:
    """
    Dependency to decode and validate a token from the cookie and return user data.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        raise credentials_exception
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: Union[str, None] = payload.get("sub")
        role: Union[str, None] = payload.get("role")
        
        if username is None or role is None:
            raise credentials_exception
            
        token_data = TokenData(username=username, role=role)

    except JWTError:
        raise credentials_exception
    
    return token_data

# --- Dependency for Role-Based Access Control (No changes needed here) ---

def require_role(required_roles: list[str]):
    """
    A dependency factory that creates a dependency to check for required roles.
    """
    async def role_checker(current_user: TokenData = Depends(get_current_user)) -> TokenData:
        if not current_user.role or current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User does not have required role. Required: {required_roles}"
            )
        return current_user
    return role_checker

# --- API Endpoints ---

@router.post("/token", summary="Create access token for user")
async def login_for_access_token(
    response: Response, 
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    The main login endpoint. Verifies credentials and sets a secure, httpOnly
    cookie with the access token.
    """
    user_data = db_utils.get_user_for_login(form_data.username)
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    
    user_id, role, hashed_password = user_data
    if not verify_password(form_data.password, hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": form_data.username, "role": role},
        expires_delta=access_token_expires
    )

    # Set the token in a secure, httpOnly cookie instead of returning it in the body
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=True, # Set to True in production for HTTPS
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    return {"status": "success", "role": role}

@router.post("/logout", summary="Log out user")
async def logout(response: Response):
    """
    Logs the user out by deleting the access token cookie.
    """
    response.delete_cookie("access_token")
    return {"status": "success", "message": "Logged out"}


@router.get("/me", response_model=User, summary="Get current user details")
async def read_users_me(current_user: TokenData = Depends(get_current_user)):
    """An example protected endpoint to get the current user's info."""
    
    assert current_user.username is not None
    assert current_user.role is not None

    return User(username=current_user.username, role=current_user.role, is_active=True)
