"""add talent_date and talent_recruiter_id to candidats

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-06 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('candidats', sa.Column('talent_date', sa.DateTime(), nullable=True))
    op.add_column('candidats', sa.Column('talent_recruiter_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_candidats_talent_recruiter', 'candidats', 'users', ['talent_recruiter_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_candidats_talent_recruiter', 'candidats', type_='foreignkey')
    op.drop_column('candidats', 'talent_recruiter_id')
    op.drop_column('candidats', 'talent_date')
