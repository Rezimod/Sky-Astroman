from __future__ import annotations

from dataclasses import dataclass
from os import getenv


@dataclass(frozen=True)
class ResearchConfig:
    data_dir: str
    output_dir: str


def load_config() -> ResearchConfig:
    return ResearchConfig(
        data_dir=getenv("RESEARCH_DATA_DIR", "../../data"),
        output_dir=getenv("RESEARCH_OUTPUT_DIR", "./outputs"),
    )

