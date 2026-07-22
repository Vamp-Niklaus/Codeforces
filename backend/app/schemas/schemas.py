from pydantic import BaseModel
from typing import Optional, List

class ProblemStateUpsert(BaseModel):
    problem_id: str
    contest_id: int
    is_read: Optional[bool] = None
    is_starred: Optional[bool] = None

class ProblemStateResponse(BaseModel):
    id: str
    user_id: str
    problem_id: str
    contest_id: int
    is_read: bool
    is_starred: bool
    updated_at: str

    class Config:
        from_attributes = True

class UserHistoryUpsert(BaseModel):
    item_type: str  # "PROBLEM" or "CONTEST"
    item_id: str
    title: str
    contest_id: Optional[int] = None

