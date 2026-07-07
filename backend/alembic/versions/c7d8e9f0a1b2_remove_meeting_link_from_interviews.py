"""remove meeting_link from interviews

Revision ID: c7d8e9f0a1b2
Revises: da1998bef981
Create Date: 2026-07-07 14:55:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c7d8e9f0a1b2"
down_revision: Union[str, None] = "da1998bef981"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("interviews", "meeting_link")


def downgrade() -> None:
    op.add_column("interviews", sa.Column("meeting_link", sa.String(), nullable=True))
