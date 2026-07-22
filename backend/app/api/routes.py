from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Dict, Any, Optional

from app.core.security import get_current_user_id
from app.services import codeforces
from app.schemas.schemas import ProblemStateUpsert, UserHistoryUpsert
from app.db.session import supabase

router = APIRouter()

@router.get("/contests")
async def get_contests(phase: Optional[str] = Query(None)):
    """
    Returns contests from Codeforces API filtered by phase (UPCOMING, ONGOING, FINISHED). Cached server-side.
    """
    try:
        contests = await codeforces.fetch_contests(phase=phase)
        return contests
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error fetching contests: {str(e)}"
        )

@router.get("/user/cf-submissions/{handle}")
async def get_user_cf_submissions(handle: str):
    """
    Fetches user problem solve status from Codeforces for a given handle.
    """
    try:
        subs = await codeforces.fetch_user_submissions(handle)
        return subs
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error fetching user submissions for handle {handle}: {str(e)}"
        )

@router.get("/contest/{contest_id}/status")
async def get_contest_status(
    contest_id: int,
    from_idx: int = Query(1, alias="from"),
    count: int = Query(50),
    verdict: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    handle: Optional[str] = Query(None),
    problem_index: Optional[str] = Query(None, alias="problemIndex")
):
    """
    Returns submissions list for a specific contest with filtering.
    """
    try:
        submissions = await codeforces.fetch_contest_status(
            contest_id=contest_id,
            from_idx=from_idx,
            count=count,
            verdict=verdict,
            language=language,
            handle=handle,
            problem_index=problem_index
        )
        return submissions
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error fetching contest status: {str(e)}"
        )



@router.get("/problems")
async def get_problems(
    tag: Optional[str] = None,
    minRating: Optional[int] = Query(None, alias="minRating"),
    maxRating: Optional[int] = Query(None, alias="maxRating")
):
    """
    Returns all Codeforces problems filtered by tag and rating range. Cached.
    """
    try:
        problems = await codeforces.fetch_problems(tag=tag, min_rating=minRating, max_rating=maxRating)
        return problems
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error fetching problems: {str(e)}"
        )

@router.get("/contest/{contest_id}/problems")
async def get_contest_problems(contest_id: int):
    """
    Returns problems for a specific contest. Cached.
    """
    try:
        problems = await codeforces.fetch_contest_problems(contest_id)
        return problems
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error fetching contest problems: {str(e)}"
        )

@router.get("/contest/{contest_id}/problem/{index}/statement")
async def get_problem_statement(contest_id: int, index: str):
    """
    Scrapes and returns the HTML problem statement for a specific problem.
    """
    try:
        html_content = await codeforces.fetch_problem_statement(contest_id, index)
        return {"html": html_content}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error scraping problem statement: {str(e)}"
        )

@router.get("/problem/{contest_id}/{index}/solutions")
async def get_problem_solutions(contest_id: int, index: str):
    """
    Returns the top accepted solutions for a problem, grouped by language.
    """
    try:
        solutions = await codeforces.fetch_problem_solutions(contest_id, index)
        return solutions
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error scraping problem solutions: {str(e)}"
        )

# Authenticated User State Endpoints

@router.get("/user/states")
async def get_user_states(user_id: str = Depends(get_current_user_id)):
    """
    Returns all problem states (is_read, is_starred) for the authenticated user.
    """
    try:
        response = supabase.table("user_problem_states").select("*").eq("user_id", user_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query failed: {str(e)}"
        )

@router.post("/user/problem-state")
async def upsert_user_problem_state(
    state: ProblemStateUpsert,
    user_id: str = Depends(get_current_user_id)
):
    """
    Upserts the user's progress (Read/Starred status) for a specific problem.
    """
    try:
        # Build upsert dictionary
        update_data = {
            "user_id": user_id,
            "problem_id": state.problem_id,
            "contest_id": state.contest_id
        }
        if state.is_read is not None:
            update_data["is_read"] = state.is_read
        if state.is_starred is not None:
            update_data["is_starred"] = state.is_starred

        # Execute upsert on Supabase (row-level security is automatically verified by service_role, but we bind with user_id)
        response = supabase.table("user_problem_states").upsert(
            update_data,
            on_conflict="user_id,problem_id"
        ).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update problem state"
            )
        return response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database upsert failed: {str(e)}"
        )

@router.get("/user/history")
async def get_user_history(user_id: str = Depends(get_current_user_id)):
    """
    Returns user opened activity history from Supabase database.
    """
    try:
        response = supabase.table("user_history").select("*").eq("user_id", user_id).order("updated_at", desc=True).execute()
        return response.data
    except Exception:
        return []

@router.post("/user/history")
async def upsert_user_history(
    history_data: UserHistoryUpsert,
    user_id: str = Depends(get_current_user_id)
):
    """
    Upserts an opened problem or contest item into user history in Supabase.
    """
    try:
        data = {
            "user_id": user_id,
            "item_type": history_data.item_type,
            "item_id": history_data.item_id,
            "title": history_data.title,
            "contest_id": history_data.contest_id,
        }
        res = supabase.table("user_history").upsert(data, on_conflict="user_id,item_type,item_id").execute()
        return res.data[0] if res.data else data
    except Exception:
        return {"status": "ok"}

@router.delete("/user/history")
async def clear_user_history(
    item_type: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user_id)
):
    """
    Clears user history (optionally filtered by item_type).
    """
    try:
        query = supabase.table("user_history").delete().eq("user_id", user_id)
        if item_type:
            query = query.eq("item_type", item_type)
        query.execute()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/user/history/{item_type}/{item_id}")
async def delete_user_history_item(
    item_type: str,
    item_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Deletes a specific user history item.
    """
    try:
        supabase.table("user_history").delete().eq("user_id", user_id).eq("item_type", item_type).eq("item_id", item_id).execute()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

