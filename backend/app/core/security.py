from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db.session import supabase

security_bearer = HTTPBearer()

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Security(security_bearer)) -> str:
    """
    Validates the bearer token (JWT) using Supabase Auth client, returning the validated user's UUID.
    """
    token = credentials.credentials
    try:
        # get_user automatically verifies token validity via the Supabase Auth server API
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token"
            )
        return response.user.id
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )
