from pydantic import BaseModel

class CandidateCreate(BaseModel):
    fullname: str | None
    email: str | None
    phone: str | None
    resume_id: int
    

