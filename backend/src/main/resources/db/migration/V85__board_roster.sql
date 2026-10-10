-- Director independence, gender and meeting attendance are properties of people, not scalars.
-- Flattening them into counts would lose exactly the detail the governance formulas need, and
-- would make "meetings held during this director's tenure" unanswerable.

CREATE TABLE board_member (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL,
    role_title VARCHAR(150),
    independent BOOLEAN NOT NULL DEFAULT FALSE,
    -- Nullable on purpose. Not every jurisdiction requires it to be recorded, and a nullable
    -- column says "not stated" where a NOT NULL default would invent an answer.
    gender VARCHAR(20),
    appointed_at DATE,
    resigned_at DATE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT board_member_tenure_ordered CHECK (
        appointed_at IS NULL OR resigned_at IS NULL OR resigned_at >= appointed_at
    )
);

CREATE INDEX idx_board_member_company_year ON board_member (company_id, fiscal_year);

CREATE TABLE board_meeting (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    held_on DATE NOT NULL,
    kind VARCHAR(40) NOT NULL DEFAULT 'BOARD',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_board_meeting_company_year ON board_meeting (company_id, fiscal_year);

CREATE TABLE board_meeting_attendance (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    meeting_id UUID NOT NULL REFERENCES board_meeting (id) ON DELETE CASCADE,
    board_member_id UUID NOT NULL REFERENCES board_member (id) ON DELETE CASCADE,
    attended BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (meeting_id, board_member_id)
);

CREATE INDEX idx_board_attendance_company ON board_meeting_attendance (company_id);
