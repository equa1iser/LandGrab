import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception


def _is_retryable(exc: BaseException) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in {429, 500, 502, 503, 504}
    return isinstance(exc, (httpx.TimeoutException, httpx.ConnectError))


def make_retry_decorator():
    return retry(
        retry=retry_if_exception(_is_retryable),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True,
    )


retry_on_http_error = make_retry_decorator()


def create_client(base_url: str = "", timeout: float = 15.0, headers: dict = None) -> httpx.AsyncClient:
    default_headers = {"User-Agent": "LandGrab/1.0"}
    if headers:
        default_headers.update(headers)
    return httpx.AsyncClient(
        base_url=base_url,
        timeout=timeout,
        headers=default_headers,
    )
