from contextvars import ContextVar
from typing import Optional

_org_id_context: ContextVar[Optional[int]] = ContextVar("org_id", default=None)

def set_org_id(org_id: int) -> None:
    print(f"[PY] context.py | set_org_id | L6: System checking in")
    _org_id_context.set(org_id)

def get_org_id() -> Optional[int]:
    print(f"[PY] context.py | get_org_id | L9: Data processing")
    return _org_id_context.get()