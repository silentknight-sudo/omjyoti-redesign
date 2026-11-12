"""Packs the site into one self-contained HTML file (preview/omjyoti-preview.html):
CSS + JS inlined, every assets/images/* reference replaced by a compressed data URI."""
import base64, io, pathlib, re
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
cache = {}

def data_uri(rel):
    if rel in cache: return cache[rel]
    im = Image.open(ROOT / rel)
    buf = io.BytesIO()
    if im.mode in ("RGBA", "LA", "P") and rel.endswith("logo.png"):
        im.convert("RGBA").save(buf, "WEBP", quality=90); mime = "image/webp"
    else:
        im = im.convert("RGB"); im.thumbnail((1100, 1100))
        im.save(buf, "WEBP", quality=62); mime = "image/webp"
    cache[rel] = f"data:{mime};base64," + base64.b64encode(buf.getvalue()).decode()
    return cache[rel]

pat = re.compile(r"assets/images/[\w./-]+\.(?:jpg|jpeg|png|webp)")
html = (ROOT / "index.html").read_text()
css = (ROOT / "css/style.css").read_text()
js = (ROOT / "js/app.js").read_text()
html = html.replace('<link rel="stylesheet" href="css/style.css" />', "<style>\n" + css + "\n</style>")
html = html.replace('<script src="js/app.js"></script>', "<script>\n" + js.replace("</script", "<\\/script") + "\n</script>")
html = pat.sub(lambda m: data_uri(m.group(0)), html)
out = ROOT / "preview/omjyoti-preview.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html)
print(out, round(out.stat().st_size / 1e6, 2), "MB,", len(cache), "images")

# ---- Artifact variant: the viewer supplies <html>/<head>/<body> and blocks iframes
art = re.sub(r"<title>.*?</title>", "<title>Om Jyoti Redesign</title>", html)
art = re.sub(r"<!doctype html>\s*<html[^>]*>\s*<head>", "", art, flags=re.I)
art = art.replace("</head>", "").replace("</body>", "").replace("</html>", "")
art = re.sub(r'<meta charset="utf-8" />\s*<meta name="viewport"[^>]*>\s*', "", art)
art = art.replace("<body>", "")
art = re.sub(r'<div class="map fade-in">.*?</div>',
  '<a class="map-link fade-in" href="https://www.google.com/maps?q=28.5926677,77.3334739" target="_blank" rel="noopener">'
  '<span><small class="kicker" style="margin:0 0 6px">Find us</small><b>D 239, Sector 10, Noida 201301</b></span>'
  '<span class="btn"><span>Open in Google Maps</span><i>→</i></span></a>', art, flags=re.S)
art_out = ROOT / "preview/omjyoti-artifact.html"
art_out.write_text(art.lstrip())
print(art_out, round(art_out.stat().st_size / 1e6, 2), "MB")
