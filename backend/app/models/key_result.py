from datetime import datetime
from typing import Optional, Dict, Any, List


class KeyResult:
    def __init__(
        self,
        objective_id: str,
        title: str,
        _id: Optional[str] = None,
        target: Optional[str] = None,
        current_value: Optional[str] = None,
        unit: Optional[str] = None,
        score: Optional[float] = None,
        notes: Optional[List[Dict[str, Any]]] = None,
        created_at: Optional[datetime] = None,
        last_updated_at: Optional[datetime] = None,
    ):
        self._id = _id
        self.objective_id = objective_id
        self.title = title
        self.target = target
        self.current_value = current_value
        self.unit = unit or ''
        self.score = score  # 0-100
        self.notes = notes or []  # [{ "text": "...", "createdAt": "..." }]
        self.created_at = created_at or datetime.utcnow()
        self.last_updated_at = last_updated_at or datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        result = {
            'objectiveId': self.objective_id,
            'title': self.title,
            'target': self.target,
            'currentValue': self.current_value,
            'unit': self.unit,
            'score': self.score,
            'notes': self.notes,
            'createdAt': self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
            'lastUpdatedAt': self.last_updated_at.isoformat() if isinstance(self.last_updated_at, datetime) else self.last_updated_at,
        }
        if self._id:
            result['_id'] = str(self._id)
        return result

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> 'KeyResult':
        kr = KeyResult(
            objective_id=data.get('objectiveId', data.get('objective_id', '')),
            title=data['title'],
            _id=str(data['_id']) if '_id' in data else None,
            target=data.get('target'),
            current_value=data.get('currentValue', data.get('current_value')),
            unit=data.get('unit', ''),
            score=data.get('score'),
            notes=data.get('notes', []),
        )
        if 'createdAt' in data:
            val = data['createdAt']
            kr.created_at = datetime.fromisoformat(val.replace('Z', '+00:00')) if isinstance(val, str) else val
        if 'lastUpdatedAt' in data:
            val = data['lastUpdatedAt']
            kr.last_updated_at = datetime.fromisoformat(val.replace('Z', '+00:00')) if isinstance(val, str) else val
        return kr
