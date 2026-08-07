# -*- coding: utf-8 -*-
"""
Collecte Google Trends : intérêt par ÉTAT australien pour les grandes marques/
mots-clés vape. Sortie : scripts/state-top.json = { state: [ {query, score}, ... ] }
Normalisé 0-100 par query (somme des états = 100). Si Trends est bloqué
(captcha/429), on sort avec code 2 -> le build retombera sur best-sellers.
"""
import json, sys, time
from pytrends.request import TrendReq

QUERIES = [
    "randm vape", "voopoo", "iget vape", "elf bar", "geek bar",
    "airbar", "hayati", "lost vape", "smok vape", "vaporesso",
    "disposable vape", "pod vape",
]

# états AU (libellés Trends REGION)
STATES = [
    "New South Wales", "Victoria", "Queensland",
    "Western Australia", "South Australia", "Tasmania",
    "Australian Capital Territory", "Northern Territory",
]

def main():
    tries = 0
    while True:
        tries += 1
        try:
            p = TrendReq(hl="en-AU", tz=0, retries=3, backoff_factor=2)
            break
        except Exception as e:
            if tries >= 3:
                print("TRENDS_BLOCKED init:", e, file=sys.stderr)
                sys.exit(2)
            time.sleep(8)

    matrix = {}   # query -> { state: score0-100 }
    for q in QUERIES:
        ok = False
        for attempt in range(3):
            try:
                p.build_payload([q], timeframe="today 12-m", geo="AU")
                df = p.interest_by_region(resolution="REGION", inc_low_vol=True)
                if df is None or df.empty:
                    raise RuntimeError("empty")
                row = {}
                for st in STATES:
                    row[st] = int(df.loc[st, q]) if st in df.index else 0
                matrix[q] = row
                ok = True
                print(f"  {q}: " + ", ".join(f"{st.split()[0]}={row[st]}" for st in STATES), flush=True)
                break
            except Exception as e:
                print(f"  retry {q} ({attempt+1}): {e}", file=sys.stderr, flush=True)
                time.sleep(10)
        if not ok:
            print("TRENDS_BLOCKED query:", q, file=sys.stderr)
            sys.exit(2)
        time.sleep(2)

    # normalisation par query : somme des états = 100
    out = {}
    for q, row in matrix.items():
        tot = sum(row.values()) or 1
        out[q] = {st: round(score * 100.0 / tot, 1) for st, score in row.items()}
    with open("scripts/state-top.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("TRENDS_OK state-top.json écrit (", len(out), "queries )")

if __name__ == "__main__":
    main()