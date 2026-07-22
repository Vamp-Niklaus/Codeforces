import asyncio
import time
import logging
import httpx
import cloudscraper
from bs4 import BeautifulSoup
from typing import Any, Dict, List, Optional

# Setup logging
logger = logging.getLogger("codeforces_service")
logging.basicConfig(level=logging.INFO)

# Cloudflare bypass scraper
cf_scraper = cloudscraper.create_scraper(
    browser={
        'browser': 'chrome',
        'platform': 'windows',
        'desktop': True
    }
)


class InMemoryCache:
    def __init__(self):
        self.store: Dict[str, Dict[str, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        item = self.store.get(key)
        if item:
            if time.time() < item["expires_at"]:
                return item["data"]
            else:
                del self.store[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: int):
        self.store[key] = {
            "data": value,
            "expires_at": time.time() + ttl_seconds
        }

class RateLimiter:
    def __init__(self, requests_per_sec: float = 4.0):
        self.delay = 1.0 / requests_per_sec
        self.last_request_time = 0.0
        self.lock = asyncio.Lock()

    async def wait(self):
        async with self.lock:
            now = time.time()
            elapsed = now - self.last_request_time
            if elapsed < self.delay:
                await asyncio.sleep(self.delay - elapsed)
            self.last_request_time = time.time()

# Instantiations
cache = InMemoryCache()
rate_limiter = RateLimiter(requests_per_sec=4.0)

# TTL Definitions
CONTEST_TTL = 3600       # 1 hour
PROBLEM_TTL = 3600       # 1 hour
STATEMENT_TTL = 86400    # 24 hours (statements don't change)
SOLUTION_TTL = 86400     # 24 hours

async def cf_get_request(url: str, params: Optional[Dict[str, Any]] = None, parse_json: bool = True, max_retries: int = 3) -> Any:
    """
    Executes a GET request to Codeforces API or website with exponential backoff and rate limiting.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
        "Sec-Ch-Ua": '"Chromium";v="123", "Not:A-Brand";v="8"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
    }
    
    retries = max_retries
    backoff = 0.5
    
    for attempt in range(retries):
        await rate_limiter.wait()
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                response = await client.get(url, params=params, headers=headers)
                
                if response.status_code == 429:
                    logger.warning(f"Codeforces returned 429 Rate Limit. Backing off for {backoff}s.")
                    await asyncio.sleep(backoff)
                    backoff *= 2
                    continue
                
                response.raise_for_status()
                
                if parse_json:
                    data = response.json()
                    if data.get("status") == "OK":
                        return data.get("result")
                    else:
                        raise ValueError(f"Codeforces API error: {data.get('comment')}")
                else:
                    return response.text
        except Exception as e:
            logger.error(f"Error requesting {url} (Attempt {attempt+1}/{retries}): {str(e)}")
            if attempt == retries - 1:
                raise e
            await asyncio.sleep(backoff)
            backoff *= 2

async def cf_scrape_html(url: str) -> str:
    """
    Scrapes HTML from Codeforces using cloudscraper to bypass Cloudflare 403 protections.
    Runs synchronously in an executor thread to avoid blocking the asyncio event loop.
    """
    await rate_limiter.wait()
    loop = asyncio.get_running_loop()
    
    def _do_scrape():
        res = cf_scraper.get(url, timeout=15)
        if res.status_code == 403:
            logger.warning(f"Cloudscraper got 403 for {url}, retrying once with new session...")
            fresh_scraper = cloudscraper.create_scraper()
            res = fresh_scraper.get(url, timeout=15)
        res.raise_for_status()
        return res.text

    try:
        return await loop.run_in_executor(None, _do_scrape)
    except Exception as e:
        logger.error(f"Error scraping HTML from {url} via cloudscraper: {str(e)}")
        raise e



async def fetch_contests(phase: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetches contest list from Codeforces API and filters by phase (BEFORE, CODING, FINISHED, UPCOMING). Caches for 1 hour.
    """
    cache_key = "cf_all_contests"
    cached = cache.get(cache_key)
    
    if cached is None:
        url = "https://codeforces.com/api/contest.list"
        try:
            contests = await cf_get_request(url, parse_json=True)
            cache.set(cache_key, contests, CONTEST_TTL)
            cached = contests
        except Exception as e:
            logger.error(f"Failed to fetch contests from Codeforces: {str(e)}")
            return []

    contests = cached or []
    
    if not phase or phase.upper() == "ALL":
        return contests
        
    p_upper = phase.upper()
    if p_upper in ["BEFORE", "UPCOMING"]:
        filtered = [c for c in contests if c.get("phase") == "BEFORE"]
        filtered.sort(key=lambda x: x.get("startTimeSeconds", 0)) # Soonest upcoming first
        return filtered
    elif p_upper in ["CODING", "ONGOING", "RUNNING"]:
        return [c for c in contests if c.get("phase") == "CODING"]
    elif p_upper == "FINISHED":
        filtered = [c for c in contests if c.get("phase") == "FINISHED"]
        filtered.sort(key=lambda x: x.get("startTimeSeconds", 0), reverse=True) # Newest finished first
        return filtered
        
    return contests


async def fetch_problems(tag: Optional[str] = None, min_rating: Optional[int] = None, max_rating: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Fetches all problems from Codeforces API and applies filtering. Caches global problems for 1 hour.
    """
    cache_key = "cf_all_problems"
    cached = cache.get(cache_key)
    
    if cached is None:
        url = "https://codeforces.com/api/problemset.problems"
        try:
            res = await cf_get_request(url, parse_json=True)
            problems = res.get("problems", [])
            problem_statistics = res.get("problemStatistics", [])
            
            # Map solveCount to problems for richer data
            stats_map = {f"{s.get('contestId')}-{s.get('index')}": s.get("solveCount", 0) for s in problem_statistics}
            
            for p in problems:
                p_key = f"{p.get('contestId')}-{p.get('index')}"
                p["solveCount"] = stats_map.get(p_key, 0)
                
            cache.set(cache_key, problems, PROBLEM_TTL)
            cached = problems
        except Exception as e:
            logger.error(f"Failed to fetch problems: {str(e)}")
            return []

    # Perform in-memory filtering based on parameters
    filtered = cached
    if tag:
        tag_lower = tag.lower()
        filtered = [p for p in filtered if any(tag_lower in t.lower() for t in p.get("tags", []))]
    if min_rating is not None:
        filtered = [p for p in filtered if p.get("rating") is not None and p["rating"] >= min_rating]
    if max_rating is not None:
        filtered = [p for p in filtered if p.get("rating") is not None and p["rating"] <= max_rating]
        
    return filtered

async def fetch_contest_problems(contest_id: int) -> List[Dict[str, Any]]:
    """
    Fetches the problem list for a specific contest. Caches for 1 hour.
    """
    cache_key = f"cf_contest_{contest_id}_problems"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # 1. Try in-memory filter from global problemset (Instant response < 10ms)
    try:
        all_problems = await fetch_problems()
        contest_probs = [p for p in all_problems if p.get("contestId") == contest_id]
        if contest_probs:
            contest_probs.sort(key=lambda x: str(x.get("index", "")))
            cache.set(cache_key, contest_probs, PROBLEM_TTL)
            return contest_probs
    except Exception:
        pass

    # 2. Fallback: Query contest.standings if not found in global problemset (e.g. new or gym contest)
    url = "https://codeforces.com/api/contest.standings"
    params = {"contestId": contest_id, "from": 1, "count": 1, "showUnofficial": "false"}
    
    try:
        res = await cf_get_request(url, params=params, parse_json=True, max_retries=1)
        problems = res.get("problems", [])
        cache.set(cache_key, problems, PROBLEM_TTL)
        return problems
    except Exception as e:
        logger.error(f"Failed to fetch problems for contest {contest_id}: {str(e)}")
        return []


async def fetch_problem_statement(contest_id: int, index: str) -> str:
    """
    Scrapes the problem statement HTML from Codeforces, cleans links/images, and formats it.
    Uses cloudscraper to bypass Cloudflare 403.
    """
    cache_key = f"cf_statement_{contest_id}_{index}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    url = f"https://codeforces.com/contest/{contest_id}/problem/{index}"
    try:
        try:
            html = await cf_scrape_html(url)
        except Exception:
            # Fallback URL format (for problemset URLs or gym)
            url_fallback = f"https://codeforces.com/problemset/problem/{contest_id}/{index}"
            logger.info(f"Retrying statement fetch with fallback URL: {url_fallback}")
            html = await cf_scrape_html(url_fallback)

        soup = BeautifulSoup(html, "html.parser")
        statement_div = soup.find("div", class_="problem-statement")
        
        if not statement_div:
            return "<div class='text-red-500 font-bold p-4'>Problem statement structure not found in fetched HTML.</div>"

        # Prepend base domain to any relative images
        for img in statement_div.find_all("img"):
            src = img.get("src")
            if src and src.startswith("/"):
                img["src"] = "https://codeforces.com" + src
            elif src and not src.startswith("http"):
                img["src"] = f"https://codeforces.com/contest/{contest_id}/problem/{src}"

        statement_html = str(statement_div)
        cache.set(cache_key, statement_html, STATEMENT_TTL)
        return statement_html
        
    except Exception as e:
        logger.error(f"Failed to scrape problem statement {contest_id}-{index}: {str(e)}")
        return f"<div class='text-red-500 p-4'>Error loading problem statement: {str(e)}</div>"


async def fetch_problem_solutions(contest_id: int, index: str) -> Dict[str, List[Dict[str, Any]]]:
    """
    Fetches the contest status, finds top accepted submissions, and scrapes their source code.
    Groups results by language categories: C++, Python, Java.
    """
    cache_key = f"cf_solutions_{contest_id}_{index}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # 1. Fetch contest status (submissions)
    status_url = "https://codeforces.com/api/contest.status"
    params = {"contestId": contest_id, "from": 1, "count": 300} # Fetch larger list to find diverse languages
    
    try:
        submissions = await cf_get_request(status_url, params=params, parse_json=True)
    except Exception as e:
        logger.error(f"Failed to get submissions for contest {contest_id}: {str(e)}")
        return {"cpp": [], "python": [], "java": []}

    # Filter accepted submissions for this problem
    accepted = [
        s for s in submissions 
        if s.get("problem", {}).get("index") == index and s.get("verdict") == "OK"
    ]

    # Map language names to simpler groups
    languages_map = {
        "cpp": ["c++", "cpp", "g++", "clang"],
        "python": ["python", "pypy"],
        "java": ["java", "kotlin"]
    }
    
    # We want up to 2 submissions per language group
    grouped_submissions: Dict[str, List[Dict[str, Any]]] = {"cpp": [], "python": [], "java": []}
    counts = {"cpp": 0, "python": 0, "java": 0}
    
    for sub in accepted:
        lang_raw = sub.get("programmingLanguage", "").lower()
        sub_id = sub.get("id")
        author = sub.get("author", {}).get("members", [{}])[0].get("handle", "Anonymous")
        time_consumed = sub.get("timeConsumedMillis", 0)
        memory_consumed = sub.get("memoryConsumedBytes", 0)
        
        matched_group = None
        for group, keywords in languages_map.items():
            if any(kw in lang_raw for kw in keywords):
                matched_group = group
                break
                
        if matched_group and counts[matched_group] < 20:
            scrape_url = f"https://codeforces.com/contest/{contest_id}/submission/{sub_id}"
            creation_time = sub.get("creationTimeSeconds", 0)
            
            code_text = (
                f"// ==========================================================\n"
                f"// Codeforces Accepted Submission #{sub_id}\n"
                f"// Author:   {author}\n"
                f"// Language: {sub.get('programmingLanguage')}\n"
                f"// Time:     {time_consumed} ms\n"
                f"// Memory:   {round(memory_consumed / 1024, 1)} KB\n"
                f"// ==========================================================\n\n"
                f"// Codeforces scraping protection is active for this submission.\n"
                f"// Click 'CF Submission' in the top right to view full code directly on Codeforces:\n"
                f"// {scrape_url}\n"
            )

            grouped_submissions[matched_group].append({
                "submission_id": sub_id,
                "author": author,
                "lang_name": sub.get("programmingLanguage"),
                "time_ms": time_consumed,
                "memory_kb": round(memory_consumed / 1024, 1),
                "creation_time": creation_time,
                "code": code_text,
                "codeforces_url": scrape_url
            })
            counts[matched_group] += 1

    cache.set(cache_key, grouped_submissions, SOLUTION_TTL)
    return grouped_submissions

async def fetch_user_submissions(handle: str) -> Dict[str, Dict[str, Any]]:
    """
    Fetches user submissions from Codeforces API for a handle and maps problemId -> submission status.
    Caches for 5 minutes (300s).
    """
    handle_clean = handle.strip()
    if not handle_clean:
        return {}
        
    cache_key = f"cf_user_subs_{handle_clean.lower()}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    url = "https://codeforces.com/api/user.status"
    params = {"handle": handle_clean, "from": 1, "count": 10000}
    
    try:
        submissions = await cf_get_request(url, params=params, parse_json=True)
    except Exception as e:
        logger.error(f"Failed to fetch user status for handle {handle_clean}: {str(e)}")
        return {}

    user_problem_map: Dict[str, Dict[str, Any]] = {}
    
    for sub in submissions:
        prob = sub.get("problem", {})
        contest_id = prob.get("contestId")
        index = prob.get("index")
        if not contest_id or not index:
            continue
            
        prob_id = f"{contest_id}-{index}"
        verdict = sub.get("verdict", "UNKNOWN")
        sub_id = sub.get("id")
        
        existing = user_problem_map.get(prob_id)
        if existing and existing.get("verdict") == "OK" and verdict != "OK":
            continue

        user_problem_map[prob_id] = {
            "problemId": prob_id,
            "contestId": contest_id,
            "index": index,
            "submissionId": sub_id,
            "verdict": verdict,
            "language": sub.get("programmingLanguage", ""),
            "timeConsumedMillis": sub.get("timeConsumedMillis", 0),
            "memoryConsumedBytes": sub.get("memoryConsumedBytes", 0),
            "creationTimeSeconds": sub.get("creationTimeSeconds", 0),
            "passedTestCount": sub.get("passedTestCount", 0),
        }

    cache.set(cache_key, user_problem_map, 300)
    return user_problem_map

async def fetch_submission_code(contest_id: int, submission_id: int) -> Dict[str, Any]:
    """
    Scrapes the source code of a specific submission from Codeforces.
    """
    cache_key = f"cf_sub_code_{contest_id}_{submission_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    url = f"https://codeforces.com/contest/{contest_id}/submission/{submission_id}"
    try:
        try:
            html = await cf_scrape_html(url)
        except Exception:
            url_fallback = f"https://codeforces.com/problemset/submission/{contest_id}/{submission_id}"
            html = await cf_scrape_html(url_fallback)

        soup = BeautifulSoup(html, "html.parser")
        pre_element = soup.find("pre", id="program-source-text")

        if not pre_element:
            return {
                "submission_id": submission_id,
                "contest_id": contest_id,
                "code": "// Source code could not be loaded from Codeforces.",
                "error": "Source code element not found."
            }

        code_text = pre_element.text
        res = {
            "submission_id": submission_id,
            "contest_id": contest_id,
            "code": code_text
        }
        cache.set(cache_key, res, STATEMENT_TTL)
        return res
    except Exception as e:
        logger.error(f"Failed to scrape submission code {submission_id}: {str(e)}")
        return {
            "submission_id": submission_id,
            "contest_id": contest_id,
            "code": f"// Error fetching source code: {str(e)}",
            "error": str(e)
        }

async def fetch_contest_status(
    contest_id: int,
    from_idx: int = 1,
    count: int = 50,
    verdict: Optional[str] = None,
    language: Optional[str] = None,
    handle: Optional[str] = None,
    problem_index: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Fetches submissions list for a contest with filtering by verdict, language, handle, and problem index.
    """
    url = "https://codeforces.com/api/contest.status"
    params = {"contestId": contest_id, "from": from_idx, "count": count}
    if handle and handle.strip():
        params["handle"] = handle.strip()
        
    cache_key = f"cf_status_{contest_id}_{from_idx}_{count}_{verdict}_{language}_{handle}_{problem_index}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        submissions = await cf_get_request(url, params=params, parse_json=True)
    except Exception as e:
        logger.error(f"Failed to fetch contest status for contest {contest_id}: {str(e)}")
        return []

    filtered = []
    for s in submissions:
        # Verdict filter
        if verdict and verdict.upper() != "ALL":
            v_req = verdict.upper()
            sub_v = s.get("verdict", "")
            if v_req == "OK" and sub_v != "OK":
                continue
            elif v_req == "WRONG_ANSWER" and sub_v != "WRONG_ANSWER":
                continue
            elif v_req == "TIME_LIMIT_EXCEEDED" and sub_v != "TIME_LIMIT_EXCEEDED":
                continue

        # Language filter
        if language and language.lower() != "all":
            lang_req = language.lower()
            sub_lang = s.get("programmingLanguage", "").lower()
            if lang_req not in sub_lang:
                continue

        # Problem Index filter
        if problem_index and problem_index.upper() != "ALL":
            p_idx = s.get("problem", {}).get("index", "").upper()
            if p_idx != problem_index.upper():
                continue

        author_handle = s.get("author", {}).get("members", [{}])[0].get("handle", "Anonymous")
        
        filtered.append({
            "id": s.get("id"),
            "contestId": contest_id,
            "creationTimeSeconds": s.get("creationTimeSeconds", 0),
            "relativeTimeSeconds": s.get("relativeTimeSeconds", 0),
            "problem": {
                "index": s.get("problem", {}).get("index", ""),
                "name": s.get("problem", {}).get("name", ""),
                "rating": s.get("problem", {}).get("rating"),
            },
            "author": author_handle,
            "programmingLanguage": s.get("programmingLanguage", ""),
            "verdict": s.get("verdict", "UNKNOWN"),
            "passedTestCount": s.get("passedTestCount", 0),
            "timeConsumedMillis": s.get("timeConsumedMillis", 0),
            "memoryConsumedBytes": s.get("memoryConsumedBytes", 0),
        })

    cache.set(cache_key, filtered, 120)
    return filtered



