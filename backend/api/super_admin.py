# api/super_admin.py

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from db import db_utils
from api.auth import require_role
from schemas.super_admin import (
    AdminCreate, UserRoleUpdate, UserResponse,
    CameraCreate, CameraUpdate, TripwireCreate, TripwireUpdate,
    SystemSettingUpdate
)

router = APIRouter(
    prefix="/superadmin",
    tags=["Super Admin"],
    # This dependency applies the super_admin role check to all routes in this router.
    dependencies=[Depends(require_role(["super_admin"]))]
)

# --- User Management Endpoints ---

@router.post("/users/create/admin", status_code=status.HTTP_201_CREATED, summary="Create a new Admin User")
def create_admin_user(admin_data: AdminCreate):
    """
    Creates a new user with the 'admin' role.
    Only accessible by super admins.
    """
    # Hash the provided password before storing it
    hashed_password = bcrypt.hashpw(admin_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Get the role_id for 'admin'
    roles = {role[1]: role[0] for role in db_utils.get_all_roles()}
    admin_role_id = roles.get("admin")
    
    if not admin_role_id:
        raise HTTPException(status_code=500, detail="Admin role not found in database.")

    user_id = db_utils.add_user(
        employee_id=admin_data.employee_id,
        employee_name=admin_data.employee_name,
        username=admin_data.username,
        hashed_password=hashed_password,
        role_id=admin_role_id,
        department_id=admin_data.department_id
    )
    
    if not user_id:
        raise HTTPException(status_code=409, detail="User with this Employee ID or Username already exists.")
        
    return {"message": f"Admin user '{admin_data.employee_name}' created successfully.", "user_id": user_id}

@router.put("/users/{employee_id}/role", summary="Change a User's Role")
def change_user_role(employee_id: str, role_update: UserRoleUpdate):
    """
    Updates the role of an existing user.
    A super admin cannot have their own role changed.
    """
    user = db_utils.get_user_by_employee_id(employee_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    # Prevent a super admin from changing their own role
    if user[1] == 'SUPER001': # Assuming 'SUPER001' is the protected super admin employee_id
        raise HTTPException(status_code=403, detail="The primary super admin's role cannot be changed.")

    db_utils.update_user(employee_id, {"role_id": role_update.new_role_id})
    return {"message": f"Role for user {employee_id} has been updated."}

@router.get("/users", response_model=List[UserResponse], summary="List All Users")
def list_all_users():
    """
    Retrieves a list of all users in the system with their details.
    """
    users_raw = db_utils.get_all_users_with_details()
    # Convert list of tuples to list of UserResponse objects
    return [
        UserResponse(
            id=u[0], employee_id=u[1], employee_name=u[2], username=u[3],
            role_name=u[4], department_name=u[5], is_active=u[6]
        ) for u in users_raw
    ]

@router.delete("/users/{employee_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a User")
def delete_user_account(employee_id: str):
    """
    Deletes a user account from the system.
    The primary super admin account cannot be deleted.
    """
    if employee_id == 'SUPER001':
        raise HTTPException(status_code=403, detail="The primary super admin account cannot be deleted.")
    
    db_utils.delete_user(employee_id)
    return

# --- Camera and Tripwire Configuration Endpoints ---

@router.post("/cameras", status_code=status.HTTP_201_CREATED, summary="Add a New Camera")
def add_new_camera(camera_data: CameraCreate):
    """
    Adds a new camera to the system and configures its initial tripwires.
    """
    cam_id = db_utils.add_camera(
        name=camera_data.camera_name,
        cam_type=camera_data.camera_type,
        stream_url=camera_data.stream_url,
        res_w=camera_data.resolution_w,
        res_h=camera_data.resolution_h,
        fps=camera_data.fps,
        gpu_id=camera_data.gpu_id,
        user=camera_data.username,
        pw=camera_data.encrypted_password
    )
    if not cam_id:
        raise HTTPException(status_code=500, detail="Failed to create the camera in the database.")
    
    for tripwire in camera_data.tripwires:
        db_utils.add_tripwire(cam_id, **tripwire.dict())
        
    return {"message": "Camera and tripwires added successfully.", "camera_id": cam_id}

@router.put("/cameras/{camera_id}", summary="Update Camera Settings")
def update_camera_settings(camera_id: int, camera_update: CameraUpdate):
    """
    Updates the settings for an existing camera.
    """
    update_data = camera_update.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")
    
    db_utils.update_camera(camera_id, update_data)
    return {"message": f"Camera {camera_id} updated successfully."}

@router.delete("/cameras/{camera_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a Camera")
def delete_camera_from_system(camera_id: int):
    """
    Deletes a camera and its associated tripwires from the system.
    """
    db_utils.delete_camera(camera_id)
    return

@router.post("/cameras/{camera_id}/tripwires", status_code=status.HTTP_201_CREATED, summary="Add a Tripwire to a Camera")
def add_tripwire_to_camera(camera_id: int, tripwire_data: TripwireCreate):
    """
    Adds a new tripwire to an existing camera.
    """
    tw_id = db_utils.add_tripwire(camera_id, **tripwire_data.dict())
    if not tw_id:
        raise HTTPException(status_code=500, detail="Failed to add tripwire.")
    return {"message": "Tripwire added successfully.", "tripwire_id": tw_id}

@router.put("/cameras/tripwires/{tripwire_id}", summary="Update a Tripwire")
def update_tripwire_settings(tripwire_id: int, tripwire_update: TripwireUpdate):
    """
    Updates the settings for an existing tripwire.
    """
    update_data = tripwire_update.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")
        
    db_utils.update_tripwire(tripwire_id, update_data)
    return {"message": f"Tripwire {tripwire_id} updated successfully."}

@router.delete("/cameras/tripwires/{tripwire_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a Tripwire")
def delete_tripwire_from_system(tripwire_id: int):
    """

    Deletes a tripwire from the system.
    """
    db_utils.delete_tripwire(tripwire_id)
    return

# --- System Settings Endpoints ---

@router.get("/settings", summary="Get All System Settings")
def get_all_system_settings():
    """
    Retrieves all current system configuration settings.
    """
    return db_utils.get_system_settings()

@router.put("/settings", summary="Update a System Setting")
def update_a_system_setting(setting: SystemSettingUpdate):
    """
    Updates a single system setting in the database.
    """
    db_utils.update_system_setting(
        setting_key=setting.setting_key,
        setting_value=setting.setting_value,
        data_type=setting.data_type
    )
    return {"message": f"Setting '{setting.setting_key}' has been updated."}

