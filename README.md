# Il-Tuo-allenatore

Portale per atleti e allenatori con API FastAPI per gestire:

- accesso utenti con ruolo `coach` o `athlete`
- anagrafica atleta
- snapshot prestativi con zone 1-7 (watt + frequenza cardiaca)
- storicizzazione automatica dei dati (nuovo inserimento precompila dai dati precedenti)
- metodi di allenamento con finalità multiple, sequenza ripetute e stress score automatico
- costruzione piani di allenamento con pattern 3 settimane carico + 1 scarico

## Avvio rapido

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
uvicorn app.main:app --reload
```

## Test

```bash
pytest
```
