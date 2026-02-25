from contextvars import ContextVar
from typing import Optional

_org_id_context: ContextVar[Optional[int]] = ContextVar("org_id", default=None)

def set_org_id(org_id: int) -> None:
    _org_id_context.set(org_id)

def get_org_id() -> Optional[int]:
    return _org_id_context.get()
