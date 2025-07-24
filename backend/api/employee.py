# api/employee.py

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from db import db_utils
from api.auth import require_role, get_current_user, TokenData
from schemas.employee import AttendanceRecord

router = APIRouter(
    prefix="/employee",
    tags=["Employee"],
    # This dependency ensures that a user must be logged in to access these endpoints.
    # The logic within each endpoint will further filter data to the specific user.
    dependencies=[Depends(require_role(["employee", "admin", "super_admin"]))]
)

@router.get("/me/attendance", response_model=List[AttendanceRecord], summary="Get My Attendance Records")
async def get_my_attendance_records(
    current_user: TokenData = Depends(get_current_user),
    limit: int = 100
):
    """
    Retrieves the attendance records for the currently authenticated user.
    An employee can only see their own records.
    """
    # The get_current_user dependency gives us the logged-in user's token data.
    # We use the username from the token to find their user details in the database.
    user_db_data = db_utils.get_user_for_login(current_user.username)
    
    if not user_db_data:
        raise HTTPException(status_code=404, detail="Current user not found in database.")
        
    user_id = user_db_data[0] # The first element returned is the user's internal ID.

    # Fetch attendance records specifically for this user_id
    records_raw = db_utils.get_attendance_for_user(user_id, limit=limit)
    
    # Convert the raw database tuples into Pydantic model instances
    return [
        AttendanceRecord(
            id=rec[0],
            event_type=rec[1],
            event_timestamp=rec[2],
            camera_name=rec[3],
            source=rec[4]
        ) for rec in records_raw
    ]

@router.get("/me/status", summary="Get My Current Work Status")
async def get_my_status(current_user: TokenData = Depends(get_current_user)):
    """
    Retrieves the most recent attendance event to determine the user's
    current work status (e.g., 'checked_in' or 'checked_out').
    """
    user_db_data = db_utils.get_user_for_login(current_user.username)
    if not user_db_data:
        raise HTTPException(status_code=404, detail="Current user not found in database.")
        
    user_id = user_db_data[0]
    
    # Get the single most recent record
    latest_records = db_utils.get_attendance_for_user(user_id, limit=1)
    
    if not latest_records:
        return {"status": "no_records_found", "last_event": None}
    
    last_event = latest_records[0]
    # The event_type of the most recent record determines the status
    status = "checked_in" if last_event[1] == "check_in" else "checked_out"
    
    return {"status": status, "last_event_time": last_event[2]}

