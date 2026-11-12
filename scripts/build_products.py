"""Builds src/products.json + the product card markup in index.html from the
product data scraped from www.omjyoti.co.in (scripts/scraped-products.json)."""
import json, re, html, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
raw = {p["slug"]: p for p in json.loads((ROOT / "scripts/scraped-products.json").read_text())}

# slug: (display name, category, one-line summary taken from the product copy)
META = {
    "mineral-water-plant": ("Mineral Water Plant", "Water Treatment", "Complete RO, UV & ozonation setup with filling and packaging, BIS & FSSAI compliant."),
    "industrial-ro-plant": ("Industrial RO Plant", "Water Treatment", "Removes up to 99% TDS. Capacities from 100 L to 50,000 L."),
    "mineral-water-plant-softner": ("Mineral Water Plant Softener", "Water Treatment", "Removes calcium & magnesium to protect RO membranes and filling machines."),
    "water-softening-palnt": ("Water Softening Plant", "Water Treatment", "Ion-exchange softeners that stop scale and extend equipment life."),
    "ozone-generator": ("Ozone Generator", "Water Treatment", "Chemical-free disinfection and oxidation using ozone (O₃)."),
    "pet-blowing-machine": ("PET Blowing Machine", "Bottling", "Turns PET preforms into uniform, clear, strong bottles."),
    "rinsing-filling-capping-machine-rfc": ("Rinsing Filling Capping (RFC)", "Bottling", "3-in-1 rinsing, filling and capping with PLC control and SS build."),
    "shrink-wrap-packaging": ("Shrink Wrap Packaging Machine", "Bottling", "Heat-shrink packaging for bottles and jars, automatic or semi-automatic."),
    "fire-fighting-system": ("Fire Fighting System (EDJ)", "Fire Fighting", "Compact skid-mounted systems designed as per NFPA 20 / IS 12845."),
    "fire-pumps-end-suction-pumpset": ("Fire Pumps – End Suction", "Fire Fighting", "Electric, diesel-driven and jockey pumps for hydrants, sprinklers and hose reels."),
    "jockey-pumps": ("Jockey Pumps", "Fire Fighting", "Keep fire mains pressurised so the main pump starts only when needed."),
    "pumps-motors": ("Pumps & Motors", "Pumps", "KSB, Kirloskar, GL, Grundfos & Wilo, with authorised KSB service support."),
    "hvac-pumpset": ("HVAC Pump Set", "Pumps", "Efficient circulation of chilled and hot water across HVAC systems."),
    "hydropneumatics-system": ("Hydropneumatic System", "Pumps", "Constant water pressure at every outlet, without overhead tanks."),
    "sewage-treatment-plant": ("Sewage Treatment Plant", "Wastewater", "Prefabricated MBBR / SBR plants from 1 KLD to 500 KLD and beyond."),
    "septic-tank": ("FRP Septic Tank", "Wastewater", "Leak-proof, corrosion-resistant FRP, far lighter than RCC."),
    "rain-water-harvesting": ("Rain Water Harvesting", "Wastewater", "Modular systems that collect, filter, store and recharge rainwater."),
    "air-compressor": ("Air Compressor", "Industrial", "Energy-efficient compressors built for 24/7 heavy-duty operation."),
    "air-dryer": ("Air Dryer", "Industrial", "Refrigerated, desiccant, heatless & heated dryers for moisture-free air."),
    "industrial-chiller": ("Industrial Chiller", "Industrial", "Precision cooling. Maximum efficiency. Uninterrupted performance."),
    "vfd-panels": ("VFD Panels", "Panels", "Variable frequency drives for energy-efficient motor speed control."),
    "ates-panel": ("ATS Panel", "Panels", "Automatic mains-to-DG changeover that keeps operations running."),
}

DROP = re.compile(r"(^#)|(www\.)|(@gmail)|(\+91)|(which likely)|(Below are the specific details)", re.I)

def clean(desc):
    blocks = []
    for block in re.split(r"\n\s*\n", desc.replace("\\%", "%")):
        lines = [re.sub(r"\s+", " ", l).strip(" ‍️") for l in block.split("\n")]
        lines = [l for l in lines if l and not DROP.search(l)]
        lines = [re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", l) for l in lines]
        if lines:
            blocks.append(lines)
    return blocks

products = []
for slug, (name, cat, summary) in META.items():
    p = raw[slug]
    img = sorted((ROOT / "assets/images/products").glob(slug + ".*"))[0].relative_to(ROOT).as_posix()
    products.append({"slug": slug, "name": name, "category": cat, "summary": summary, "img": img,
                     "url": f"https://www.omjyoti.co.in/products/{slug}/", "blocks": clean(p["desc"])})

(ROOT / "src/products.json").write_text(json.dumps(products, ensure_ascii=False, indent=1))

cards = []
for i, p in enumerate(products, 1):
    e = html.escape
    cat = re.sub(r"[^a-z]+", "-", p["category"].lower()).strip("-")
    cards.append(
        f'<a class="prod" href="/products/{p["slug"]}/" data-slug="{p["slug"]}" data-cat="{cat}">'
        f'<span class="prod__img"><img src="{p["img"]}" alt="{e(p["name"])}" loading="lazy" decoding="async" /></span>'
        f'<span class="prod__meta"><span>{e(p["category"])}</span><span>{i:02d}</span></span>'
        f'<span class="prod__name">{e(p["name"])}</span><span class="prod__text">{e(p["summary"])}</span>'
        f'<span class="prod__go" aria-hidden="true">↗</span></a>')
markup = "\n".join("          " + c for c in cards)

index = ROOT / "index.html"
s = index.read_text()
s = re.sub(r"(<!-- PRODUCTS:START -->).*?(<!-- PRODUCTS:END -->)", lambda m: m.group(1) + "\n" + markup + "\n          " + m.group(2), s, flags=re.S)
index.write_text(s)
print(len(products), "products")
