import json, glob, os

# ============================================================
# CHEMIN DE BASE
# ============================================================
BASE = "public/data"

# ============================================================
# PRIX SUGGÉRÉS PAR SÉRIE (Mods, Pod Systems, Vaporisateurs)
# ============================================================
SUGGESTED = {
    ("Aspire", "Dynamo"): 109.99,
    ("Aspire", "Feedlink Revvo"): 89.99,
    ("Aspire", "Huracan"): 134.99,
    ("Aspire", "Nautilus GT"): 104.99,
    ("Aspire", "Puxos"): 89.99,
    ("Aspire", "Rover Plus"): 89.99,
    ("Aspire", "Zelos 3"): 134.99,
    ("Eleaf", "iStick"): 84.99,
    ("GeekVape", "Aegis Legend"): 99.99,
    ("GeekVape", "Aegis Max"): 104.99,
    ("GeekVape", "Aegis Mini"): 94.99,
    ("GeekVape", "Aegis Solo"): 89.99,
    ("GeekVape", "Aegis Touch"): 109.99,
    ("GeekVape", "L200 Classic"): 119.99,
    ("GeekVape", "Z200"): 89.99,
    ("Innokin", "Coolfire"): 104.99,
    ("Innokin", "Kroma 217"): 124.99,
    ("SMOK", "G-PRIV"): 109.99,
    ("SMOK", "MAG"): 99.99,
    ("SMOK", "Scar 18"): 104.99,
    ("VooPoo", "Argus"): 89.99,
    ("VooPoo", "Drag"): 99.99,
    ("Vaporesso", "Armour"): 114.99,
    ("Vaporesso", "Gen"): 89.99,
    ("Vaporesso", "Luxe"): 114.99,
    ("Aspire", "Flexus"): 54.99,
    ("Aspire", "Gotek"): 59.99,
    ("Aspire", "Vilter"): 44.99,
    ("GeekVape", "Aegis"): 54.99,
    ("GeekVape", "Wenax"): 49.99,
    ("Gunnpod", "MOSS"): 54.99,
    ("Innokin", "Endura"): 49.99,
    ("Lost Vape", "Ursa"): 44.99,
    ("OXVA", "Xlim"): 49.99,
    ("SMOK", "Nord"): 54.99,
    ("SMOK", "Novo"): 39.99,
    ("SMOK", "RPM"): 54.99,
    ("Uwell", "Caliburn"): 49.99,
    ("Vaporesso", "LUXE"): 59.99,
    ("Vaporesso", "XROS"): 44.99,
    ("Vigor Storm", "Elite"): 34.99,
    ("VooPoo", "Doric"): 49.99,
    ("Dr. Dabber", ""): 619.99,
    ("Hitoki", ""): 1219.99,
    ("Pulsar", ""): 299.99,
    ("Zenco", ""): 299.99,
    ("Boundless Vaporizers", ""): 69.99,
    ("Cookies", ""): 269.99,
    ("Evolv", ""): 269.99,
    ("Focus V", ""): 319.99,
    ("G Pen", ""): 179.99,
    ("Groove", ""): 64.99,
    ("Ispire", ""): 269.99,
    ("Lookah", ""): 99.99,
    ("O.pen", ""): 79.99,
    ("Ooze", ""): 69.99,
    ("Origin", ""): 169.99,
    ("Puffco", ""): 199.99,
    ("Vivant", "Dabox Pro"): 169.99,
    ("XVape", ""): 169.99,
    ("Yocan", ""): 79.99,
    ("Arizer", "Extreme Q"): 369.99,
    ("Arizer", "V-Tower"): 279.99,
    ("Arizer", "XQ2"): 379.99,
    ("Retro Vapes", ""): 269.99,
    ("Storz & Bickel", "Volcano Classic"): 819.99,
    ("Storz & Bickel", "Volcano Hybrid"): 969.99,
    ("Airistech", ""): 99.99,
    ("Arizer", "Air"): 179.99,
    ("Arizer", "ArGo"): 299.99,
    ("Arizer", "Solo"): 399.99,
    ("Boundless", "CF"): 169.99,
    ("Boundless", "CFX"): 269.99,
    ("DaVinci", "IQ"): 449.99,
    ("DaVinci", "Miqro-C"): 169.99,
    ("DynaVap", ""): 169.99,
    ("Eyce", ""): 169.99,
    ("Fenix", ""): 269.99,
    ("Firefly", ""): 349.99,
    ("Flowermate", ""): 169.99,
    ("Healthy Rips", ""): 259.99,
    ("PAX", ""): 149.99,
    ("Storz & Bickel", ""): 569.99,
    ("Tyson 2.0", ""): 149.99,
    ("XMAX", ""): 179.99,
}

DISPOSABLES_PRICES = {
    ("Al Fakher", "Crown Bar 12K Sound"): 49.99,
    ("Al Fakher", "Crown Bar 15K Hypermax"): 54.99,
    ("Al Fakher", "Crown Bar 8K"): 44.99,
    ("Alibarbar", "Ingot 9000"): 54.99,
    ("Alibarbar", "Pandora 7000"): 49.99,
    ("Alibarbar", "Upload 25k"): 59.99,
    ("Flum", "Pebble 6000"): 44.99,
    ("Geek Bar", "Meloso 30K"): 74.99,
    ("Geek Bar", "Meloso MAX 9000"): 54.99,
    ("Geek Bar", "Pulse 9000"): 54.99,
    ("Geek Bar", "Pulse X 25K"): 69.99,
    ("Geek Bar", "Pulse X Platinum"): 69.99,
    ("Gunnpod", "2000 Puffs"): 34.99,
    ("Gunnpod", "EVO"): 44.99,
    ("HQD", "Cuvie Slick 6000"): 49.99,
    ("HQD", "Miracle"): 54.99,
    ("HQD", "Titan"): 49.99,
    ("IGET", "BAR Plus"): 49.99,
    ("IGET", "Bar 3500"): 44.99,
    ("IGET", "Bar Pro"): 49.99,
    ("IGET", "Hot L5500"): 49.99,
    ("IGET", "Legend"): 49.99,
    ("IGET", "Moon K5000"): 49.99,
    ("IGET", "ONE Chupa"): 49.99,
    ("IGET", "Star L7000"): 54.99,
    ("Lost Mary", "BM6000"): 54.99,
    ("Lost Mary", "MC25000"): 49.99,
    ("Lost Mary", "MO5000"): 49.99,
    ("Lost Mary", "OS5000"): 49.99,
    ("Lost Vape", "Orion Bar"): 54.99,
    ("Lost Vape", "Orion OB5500"): 44.99,
    ("MerryMi", "Mecha PRO 35000"): 74.99,
    ("MerryMi", "Panda X 40000"): 84.99,
    ("RELX", "MagicGo 8000i"): 54.99,
    ("RELX", "SPARTA"): 59.99,
    ("RabBeats", "RC10000"): 54.99,
    ("Veipus", "Bussin"): 59.99,
    ("Vigor Storm", "Elite"): 54.99,
    ("Vigor Storm", "PRIME"): 64.99,
    ("VooPoo", "Argus Bar Pro Max"): 49.99,
    ("Waka", "Smash 6000"): 39.99,
    ("Waka", "Sopro PA10000"): 44.99,
}

PODS_CARTRIDGES_MAP = {
    14.95: 19.95,
    14.99: 19.99,
    19.99: 24.99,
    24.95: 29.95,
    24.99: 29.99,
    29.95: 34.95,
}

# Fichiers à ignorer — ne sont pas des listes de produits
SKIP_FILES = {"brands.json", "meta.json", "search.json", "trending.json"}

# Catégories qui utilisent la règle suggested+20
SUGGESTED_CATEGORIES = [
    "e-cigarettes/mods.json",
    "e-cigarettes/pod-systems.json",
]
SUGGESTED_DIRS = ["vaporizers"]

# Catégories +5
PLUS5_DIRS = ["e-liquids", "accessories", "nicotine", "tabac"]
PLUS5_FILES = ["tabac/tabac.json"]

# Catégories +10
PLUS10_DIRS = ["cannabinoids", "edibles", "psychedelics"]

# ============================================================
# FONCTIONS
# ============================================================
def to_99(price):
    r = round(price)
    return round(r - 0.01, 2)

def apply_suggested(current, suggested):
    base = max(current, suggested)
    return to_99(base + 20)

def apply_plus(current, amount):
    return to_99(current + amount)

def load(path):
    data = json.load(open(path, encoding='utf-8'))
    products = data if isinstance(data, list) else data.get('products', [])
    return data, products

def save(path, data, products):
    if isinstance(data, list):
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(products, f, indent=2, ensure_ascii=False)
    else:
        data['products'] = products
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

def get_category(filepath):
    rel = filepath.replace(BASE + "/", "").replace("\\", "/")
    return rel

# ============================================================
# ÉTAPE 1 — Mettre à jour tous les fichiers sources
# et construire un dictionnaire id → nouveau_prix
# ============================================================
id_to_price = {}  # Pour mettre à jour search.json et trending.json ensuite

def process_product(p, rule, amount=None, suggested_map=None):
    price = p.get('price_aud')
    if price is None:
        return False
    pid = p.get('id')

    if rule == 'disposable':
        key = (p.get('brand', ''), p.get('series', ''))
        if key in DISPOSABLES_PRICES:
            new_price = DISPOSABLES_PRICES[key]
        else:
            # Série non reconnue: +10 AUD systematiquement
            new_price = to_99(price + 10)
        p['price_aud'] = new_price
        if pid: id_to_price[pid] = new_price
        return True

    elif rule == 'pods_cartridges':
        if price in PODS_CARTRIDGES_MAP:
            new_price = PODS_CARTRIDGES_MAP[price]
            p['price_aud'] = new_price
            if pid: id_to_price[pid] = new_price
            return True

    elif rule == 'suggested':
        key = (p.get('brand', ''), p.get('series', '') or '')
        sug = SUGGESTED.get(key, None)
        if sug is not None:
            new_price = apply_suggested(price, sug)
        else:
            new_price = to_99(price + 20)
        p['price_aud'] = new_price
        if pid: id_to_price[pid] = new_price
        return True

    elif rule == 'plus':
        new_price = apply_plus(price, amount)
        p['price_aud'] = new_price
        if pid: id_to_price[pid] = new_price
        return True

    return False

print("=" * 55)
print("  MISE À JOUR DES PRIX VAPESPOT")
print("=" * 55)

# Parcourir tous les fichiers JSON sauf ceux à ignorer
for filepath in sorted(glob.glob(f"{BASE}/**/*.json", recursive=True)):
    filename = os.path.basename(filepath)
    if filename in SKIP_FILES:
        continue

    cat = get_category(filepath)
    data, products = load(filepath)

    if not products:
        continue

    # Déterminer la règle
    rule = None
    amount = None

    if 'disposables' in cat:
        rule = 'disposable'
    elif 'pods-cartridges' in cat:
        rule = 'pods_cartridges'
    elif 'mods' in cat or 'pod-systems' in cat or 'vaporizers' in cat:
        rule = 'suggested'
    elif any(d in cat for d in ['e-liquids', 'accessories', 'nicotine', 'tabac']):
        rule = 'plus'
        amount = 5
    elif any(d in cat for d in ['cannabinoids', 'edibles', 'psychedelics']):
        rule = 'plus'
        amount = 10

    if rule is None:
        print(f"⏭️  Ignoré: {cat}")
        continue

    updated = sum(1 for p in products if process_product(p, rule, amount))
    save(filepath, data, products)
    print(f"✅ {cat}: {updated}/{len(products)} produits mis à jour")

# ============================================================
# ÉTAPE 2 — Mettre à jour search.json par id
# ============================================================
print()
search_path = f"{BASE}/search.json"
search_data = json.load(open(search_path, encoding='utf-8'))
search_updated = 0
for item in search_data:
    pid = item.get('id')
    if pid and pid in id_to_price:
        item['price_aud'] = id_to_price[pid]
        search_updated += 1
with open(search_path, 'w', encoding='utf-8') as f:
    json.dump(search_data, f, indent=2, ensure_ascii=False)
print(f"✅ search.json: {search_updated}/{len(search_data)} entrées mises à jour")

# ============================================================
# ÉTAPE 3 — Mettre à jour trending.json par id
# ============================================================
trending_path = f"{BASE}/trending.json"
trending_data = json.load(open(trending_path, encoding='utf-8'))
trending_products = trending_data.get('products', [])
trending_updated = 0
for p in trending_products:
    pid = p.get('id')
    if pid and pid in id_to_price:
        p['price_aud'] = id_to_price[pid]
        trending_updated += 1
trending_data['products'] = trending_products
with open(trending_path, 'w', encoding='utf-8') as f:
    json.dump(trending_data, f, indent=2, ensure_ascii=False)
print(f"✅ trending.json: {trending_updated}/{len(trending_products)} produits mis à jour")

print()
print("=" * 55)
print("  TERMINÉ ✅ — Fais un Push GitHub maintenant")
print("=" * 55)
