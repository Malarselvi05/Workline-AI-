from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class DashboardSummary(BaseModel):
    total_runs_week: int
    success_rate: float
    avg_duration: float
    active_drift_alerts: int

class RecentRun(BaseModel):
    id: int
    workflow_name: str
    triggered_by: str
    status: str
    started_at: datetime
    duration: float

class DashboardRecentRuns(BaseModel):
    runs: List[RecentRun]

class DashboardDriftAlert(BaseModel):
    id: int
    workflow_name: str
    metric: str
    baseline_val: float
    current_val: float
    created_at: datetime

class DashboardDriftAlerts(BaseModel):
    alerts: List[DashboardDriftAlert]