FROM python:3.12-slim

WORKDIR /workspace/apps/research

COPY apps/research/pyproject.toml pyproject.toml
COPY apps/research/src src
COPY apps/research/README.md README.md

CMD ["sh", "-c", "PYTHONPATH=src python -m research"]

