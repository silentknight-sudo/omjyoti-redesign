// Generates the crawlable side of the site into dist/:
//   /products/                    all products, grouped by category
//   /products/<slug>/             one page per product (22)
//   /solutions/<category>/        one landing page per category (7)
//   sitemap.xml, robots.txt, 404.html
// and stamps the canonical site URL into dist/index.html.
// Set SITE_URL (e.g. in Vercel's environment variables) if the site is served from another domain.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const DEFAULT_URL = "https://www.omjyoti.co.in";
const SITE = (process.env.SITE_URL || DEFAULT_URL).replace(/\/+$/, "");
const TODAY = new Date().toISOString().slice(0, 10);
const PRODUCTS = JSON.parse(readFileSync("src/products.json", "utf8"));

const BIZ = {
  name: "Om Jyoti Engineering Enterprises",
  phone: "+91-80-4275-4407",
  phoneDisplay: "080 4275 4407",
  mobile: "+91-99101-09627",
  mobileDisplay: "+91 99101 09627",
  email: "omjyotientp@gmail.com",
  street: "D 239, Sector 10",
  city: "Noida",
  region: "Uttar Pradesh",
  postal: "201301",
  lat: 28.5926677,
  lng: 77.3334739,
};

// Keyword focus per category; copy is drawn from the company's own product descriptions.
const CATS = {
  "water-treatment": {
    label: "Water Treatment",
    h1: "Mineral Water Plants, Industrial RO Plants & Water Softeners in Noida",
    title: "Mineral Water & Industrial RO Plants in Noida | Om Jyoti",
    desc: "Mineral water plants with RO, UV & ozonation, industrial RO plants from 100 L to 50,000 L, water softeners and ozone generators. Om Jyoti, Noida, since 2000.",
    intro: [
      "Om Jyoti Engineering Enterprises sets up complete mineral water plants using RO, UV and ozonation, with filtration, mineral dosing and automatic filling and packaging, compliant with BIS and FSSAI standards.",
      "Our industrial RO plants use membrane technology to remove up to 99% of total dissolved solids, bacteria and harmful substances, in capacities from 100 L to 50,000 L. We also supply ion-exchange water softening plants and ozone generators for chemical-free disinfection.",
    ],
  },
  "fire-fighting": {
    label: "Fire Fighting",
    h1: "Fire Fighting Systems, Fire Pumps & Jockey Pumps in Noida",
    title: "Fire Fighting System Contractor & Fire Pumps, Noida | Om Jyoti",
    desc: "OM JYOTI EDJ fire fighting systems as per NFPA 20 / IS 12845: electric, diesel and jockey fire pumps, hydrant and sprinkler systems. Om Jyoti, Noida.",
    intro: [
      "As a fire fighting system contractor, Om Jyoti Engineering Enterprises delivers complete turnkey solutions: fire hydrant systems, sprinkler systems, high-pressure fire pumps and pump automation panels.",
      "OM JYOTI EDJ fire fighting systems combine electric, diesel and jockey pumps on one compact, skid-mounted, factory-tested unit, designed as per NFPA 20 / IS 12845, for industrial facilities, commercial buildings, warehouses, residential complexes and infrastructure projects.",
    ],
  },
  pumps: {
    label: "Pumps & Motors",
    h1: "Pumps & Motors Dealer in Noida: KSB, Kirloskar, Grundfos, Wilo",
    title: "KSB & Kirloskar Pump Dealer in Noida | Pumps & Motors | Om Jyoti",
    desc: "Dealer and service provider for KSB, Kirloskar, GL, Grundfos and Wilo pumps and motors, HVAC pump sets and hydropneumatic systems. Authorised KSB service.",
    intro: [
      "Om Jyoti Engineering Enterprises supplies, deals in and services industrial pumps and motors from KSB, Kirloskar, GL, Grundfos and Wilo for residential, commercial and industrial applications, with authorised service support for KSB pumps.",
      "We also build HVAC pump sets and hydropneumatic pressure-boosting systems, and handle installation, commissioning, repair and annual maintenance contracts (AMC).",
    ],
  },
  wastewater: {
    label: "Wastewater & Rain Water Harvesting",
    h1: "Sewage Treatment Plants, FRP Septic Tanks & Rain Water Harvesting",
    title: "Sewage Treatment Plant (STP) & Rain Water Harvesting, Noida | Om Jyoti",
    desc: "Prefabricated MBBR / SBR sewage treatment plants from 1 KLD to 500 KLD, leak-proof FRP septic tanks and modular rain water harvesting systems. Om Jyoti, Noida.",
    intro: [
      "Om Jyoti Engineering Enterprises offers prefabricated, modular sewage treatment plants using MBBR and SBR technology, from 1 KLD to 500 KLD and beyond, with minimal civil work and treated water ready for reuse.",
      "We also supply leak-proof, corrosion-resistant FRP septic tanks and advanced modular rain water harvesting systems that collect, filter, store and recharge rainwater, with storage that installs under roads and parking areas.",
    ],
  },
  bottling: {
    label: "Bottling Machinery",
    h1: "Bottling Machinery: PET Blowing, RFC & Shrink Wrap Machines",
    title: "PET Blowing, RFC & Shrink Wrap Machines, Noida | Om Jyoti",
    desc: "PET blowing machines, rinsing filling capping (RFC) machines and shrink wrap packaging machines for mineral water and packaged drinking water plants.",
    intro: [
      "For packaged drinking water and mineral water plants, Om Jyoti Engineering Enterprises supplies PET blowing machines, 3-in-1 rinsing, filling and capping (RFC) machines with PLC control, and shrink wrap packaging machines in automatic and semi-automatic models.",
    ],
  },
  industrial: {
    label: "Industrial Utilities",
    h1: "Air Compressors, Air Dryers & Industrial Chillers in Noida",
    title: "Air Compressors, Air Dryers & Industrial Chillers, Noida | Om Jyoti",
    desc: "Industrial air compressors for 24/7 duty, refrigerated, desiccant and heatless air dryers, and industrial chillers for precision cooling. Om Jyoti, Noida.",
    intro: [
      "Om Jyoti Engineering Enterprises supplies energy-efficient industrial air compressors built for continuous heavy-duty operation, refrigerated, desiccant, heatless and heated air dryers, and industrial chillers for injection moulding, plastics, pharmaceuticals, food and beverage, packaging and chemical industries.",
    ],
  },
  panels: {
    label: "Electrical Panels",
    h1: "ATS Panels & VFD Panels in Noida",
    title: "ATS Panel & VFD Panel Supplier, Noida | Om Jyoti Engineering",
    desc: "Automatic transfer switch (ATS) panels for mains-to-DG changeover and variable frequency drive (VFD) panels for energy-efficient motor control. Om Jyoti, Noida.",
    intro: [
      "Om Jyoti Engineering Enterprises builds automatic transfer switch (ATS) panels for seamless changeover between mains power and generator supply, and VFD panels that control motor speed and torque for energy-efficient pumping and process control.",
    ],
  },
};
const catSlug = (label) => label.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
for (const p of PRODUCTS) p.cat = catSlug(p.category);

const AREAS = ["Noida", "Greater Noida", "Ghaziabad", "Sahibabad", "Delhi", "Agra", "Kanpur", "Muzaffarnagar", "South Tripura"];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const abs = (path) => `${SITE}${path}`;
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
const write = (path, html) => { mkdirSync(`dist${path}`, { recursive: true }); writeFileSync(`dist${path}index.html`, html); };

const orgRef = { "@type": "LocalBusiness", "@id": `${SITE}/#business`, name: BIZ.name };

function renderBlocks(blocks) {
  return blocks.map((lines, bi) => {
    const isList = lines.length > 2 && lines.slice(1).every((l) => l.length < 110);
    if (isList) {
      const head = /[:?]$|^[A-Z][^.]{0,60}$/.test(lines[0]) ? `<h2 class="pd__h">${esc(lines[0])}</h2>` : "";
      const items = head ? lines.slice(1) : lines;
      return head + `<ul>${items.map((l) => `<li>${esc(l.replace(/^[-•\d.)\s]+/, ""))}</li>`).join("")}</ul>`;
    }
    return lines.map((l, li) => ((bi === 0 && li === 0) || (l.length < 70 && !/[.]$/.test(l))
      ? `<p class="lead">${esc(l)}</p>` : `<p>${esc(l)}</p>`)).join("");
  }).join("");
}

function shell({ title, desc, path, image = "/assets/images/hero-2.jpg", jsonld = [], body }) {
  return `<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="canonical" href="${abs(path)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${esc(BIZ.name)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:url" content="${abs(path)}" />
  <meta property="og:image" content="${abs(image)}" />
  <meta property="og:locale" content="en_IN" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="theme-color" content="#0a0f0c" />
  <link rel="icon" type="image/png" href="/assets/images/logo.png" />
  <link rel="apple-touch-icon" href="/assets/images/logo.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="stylesheet" href="/css/page.css" />
  ${jsonld.map(ld).join("\n  ")}
</head>
<body class="subpage">
  <header class="nav is-scrolled">
    <a href="/" class="brand" aria-label="${esc(BIZ.name)}, home">
      <span class="brand__seal"><img src="/assets/images/logo.png" alt="" width="40" height="40" /></span>
      <span class="brand__text"><b>OM JYOTI</b><small>Engineering Enterprises</small></span>
    </a>
    <nav class="sub__nav" aria-label="Primary">
      <a href="/products/">All products</a>
      <a href="/#contact">Contact</a>
    </nav>
    <a class="btn btn--sm" href="tel:08042754407"><span>Call ${BIZ.phoneDisplay}</span></a>
  </header>
  <main class="page">
${body}
  </main>
  <footer class="footer">
    <div class="wrap">
      <div class="footer__grid">
        <div class="footer__brand"><span class="brand__seal brand__seal--lg"><img src="/assets/images/logo.png" alt="${esc(BIZ.name)} logo" loading="lazy" /></span><p><b>${esc(BIZ.name)}</b>Pure water, better life.</p></div>
        <div><h4>Solutions</h4>${Object.entries(CATS).map(([k, c]) => `<a href="/solutions/${k}/">${esc(c.label)}</a>`).join("")}</div>
        <div><h4>Company</h4><a href="/#about">About us</a><a href="/#process">RO plant process</a><a href="/#services">Services</a><a href="/products/">All products</a></div>
        <div><h4>Reach us</h4><a href="tel:08042754407">${BIZ.phoneDisplay}</a><a href="tel:+919910109627">${BIZ.mobileDisplay}</a><a href="mailto:${BIZ.email}">${BIZ.email}</a><span>${esc(BIZ.street)}, ${BIZ.city} ${BIZ.postal}</span></div>
      </div>
      <div class="footer__row"><p>© ${new Date().getFullYear()} ${esc(BIZ.name)}, Noida</p><p>Engineered to flow. Designed to last.</p><a href="/">Home</a></div>
    </div>
  </footer>
</body>
</html>
`;
}

const crumbs = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(path) })),
});
const crumbHtml = (items) => `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items.map(([name, path], i) =>
  i === items.length - 1 ? `<li aria-current="page">${esc(name)}</li>` : `<li><a href="${path}">${esc(name)}</a></li>`).join("")}</ol></nav>`;
const card = (p) => `<a class="prod" href="/products/${p.slug}/">
  <span class="prod__img"><img src="/${p.img}" alt="${esc(p.name)}" loading="lazy" decoding="async" /></span>
  <span class="prod__meta"><span>${esc(p.category)}</span></span>
  <span class="prod__name">${esc(p.name)}</span><span class="prod__text">${esc(p.summary)}</span>
  <span class="prod__go" aria-hidden="true">↗</span></a>`;
const cta = (name) => {
  const wa = `https://wa.me/919910109627?text=${encodeURIComponent(`Enquiry from website: ${name}`)}`;
  return `<div class="pd__cta">
    <a class="btn" href="${wa}" target="_blank" rel="noopener"><span>Enquire on WhatsApp</span><i>→</i></a>
    <a class="btn btn--ghost" href="tel:08042754407"><span>Call ${BIZ.phoneDisplay}</span></a>
    <a class="btn btn--ghost" href="mailto:${BIZ.email}?subject=${encodeURIComponent(`Enquiry: ${name}`)}"><span>Email us</span></a>
  </div>`;
};

/* ---------------- product pages ---------------- */
for (const p of PRODUCTS) {
  const c = CATS[p.cat];
  const path = `/products/${p.slug}/`;
  const title = `${p.name} Supplier in Noida, Delhi NCR | Om Jyoti`;
  const long = `${p.summary} Om Jyoti Engineering, Noida, since 2000. Call ${BIZ.phoneDisplay}.`;
  const desc = long.length <= 160 ? long : `${p.summary} Om Jyoti Engineering, Noida. Call ${BIZ.phoneDisplay}.`;
  const trail = [["Home", "/"], ["Products", "/products/"], [c.label, `/solutions/${p.cat}/`], [p.name, path]];
  const related = PRODUCTS.filter((x) => x.cat === p.cat && x.slug !== p.slug);
  const body = `    <div class="wrap">
      ${crumbHtml(trail)}
      <article class="pd">
        <div class="pd__media"><img src="/${p.img}" alt="${esc(p.name)} by Om Jyoti Engineering Enterprises" width="900" height="600" /></div>
        <div class="pd__body">
          <p class="kicker">${esc(c.label)}</p>
          <h1>${esc(p.name)}</h1>
          <p class="pd__summary">${esc(p.summary)}</p>
          ${cta(p.name)}
          <div class="pd__desc">${renderBlocks(p.blocks)}</div>
          <p class="pd__area">Supplied, installed and serviced from Noida across ${AREAS.slice(0, 6).join(", ")} and the rest of Delhi NCR and Uttar Pradesh.</p>
          ${cta(p.name)}
        </div>
      </article>
      ${related.length ? `<section class="related"><h2 class="h2">More in ${esc(c.label)}</h2><div class="prods">${related.map(card).join("")}</div></section>` : ""}
    </div>`;
  write(path, shell({
    title, desc, path, image: `/${p.img}`, body,
    jsonld: [
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: p.name,
        description: p.summary,
        image: abs(`/${p.img}`),
        category: c.label,
        url: abs(path),
        brand: { "@type": "Brand", name: "Om Jyoti" },
        manufacturer: orgRef,
      },
      crumbs(trail),
    ],
  }));
}

/* ---------------- category pages ---------------- */
for (const [key, c] of Object.entries(CATS)) {
  const path = `/solutions/${key}/`;
  const items = PRODUCTS.filter((p) => p.cat === key);
  const trail = [["Home", "/"], ["Products", "/products/"], [c.label, path]];
  const body = `    <div class="wrap">
      ${crumbHtml(trail)}
      <header class="cat">
        <p class="kicker">${esc(c.label)}</p>
        <h1>${esc(c.h1)}</h1>
        ${c.intro.map((t) => `<p>${esc(t)}</p>`).join("")}
        ${cta(c.label)}
      </header>
      <section class="related"><h2 class="h2">${esc(c.label)} products</h2><div class="prods">${items.map(card).join("")}</div></section>
    </div>`;
  write(path, shell({
    title: c.title, desc: c.desc, path, image: `/${items[0].img}`, body,
    jsonld: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: c.h1,
        description: c.desc,
        url: abs(path),
        about: orgRef,
        mainEntity: { "@type": "ItemList", itemListElement: items.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(`/products/${p.slug}/`), name: p.name })) },
      },
      crumbs(trail),
    ],
  }));
}

/* ---------------- all products ---------------- */
{
  const path = "/products/";
  const trail = [["Home", "/"], ["Products", path]];
  const body = `    <div class="wrap">
      ${crumbHtml(trail)}
      <header class="cat">
        <p class="kicker">Products</p>
        <h1>Water Treatment, Pumps, Fire Fighting & Industrial Equipment</h1>
        <p>All 22 products from Om Jyoti Engineering Enterprises, Noida: mineral water and industrial RO plants, fire fighting systems and fire pumps, pumps and motors, sewage treatment and rain water harvesting, bottling machinery, air compressors, dryers, chillers and electrical panels.</p>
      </header>
      ${Object.entries(CATS).map(([key, c]) => `<section class="related"><h2 class="h2"><a href="/solutions/${key}/">${esc(c.label)}</a></h2><div class="prods">${PRODUCTS.filter((p) => p.cat === key).map(card).join("")}</div></section>`).join("\n      ")}
    </div>`;
  write(path, shell({
    title: "Products: RO Plants, Pumps, Fire Fighting & STP | Om Jyoti, Noida",
    desc: "22 products: mineral water & industrial RO plants, fire fighting systems, KSB/Kirloskar pumps, STP, rain water harvesting, bottling machines, compressors and panels.",
    path, body, jsonld: [crumbs(trail)],
  }));
}

/* ---------------- 404 ---------------- */
writeFileSync("dist/404.html", shell({
  title: "Page not found | Om Jyoti Engineering Enterprises",
  desc: "This page could not be found.",
  path: "/404.html",
  body: `    <div class="wrap"><header class="cat"><p class="kicker">404</p><h1>This page has moved or no longer exists.</h1><p>Browse <a class="link" href="/products/">all products</a> or go back to the <a class="link" href="/">home page</a>.</p></header></div>`,
}).replace('<meta name="robots" content="index, follow, max-image-preview:large" />', '<meta name="robots" content="noindex" />'));

/* ---------------- homepage: canonical domain + business schema ---------------- */
{
  let html = readFileSync("dist/index.html", "utf8").split(DEFAULT_URL).join(SITE);
  const business = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "Organization"],
    "@id": `${SITE}/#business`,
    name: BIZ.name,
    alternateName: "Om Jyoti Engineering",
    description: "Manufacturer, distributor, retailer and service provider of mineral water plants, industrial pumps, RO plants, fire fighting systems and rain water harvesting solutions in India, since 2000.",
    url: `${SITE}/`,
    logo: abs("/assets/images/logo.png"),
    image: abs("/assets/images/hero-2.jpg"),
    telephone: BIZ.phone,
    email: BIZ.email,
    foundingDate: "2000",
    address: { "@type": "PostalAddress", streetAddress: BIZ.street, addressLocality: BIZ.city, addressRegion: BIZ.region, postalCode: BIZ.postal, addressCountry: "IN" },
    geo: { "@type": "GeoCoordinates", latitude: BIZ.lat, longitude: BIZ.lng },
    hasMap: `https://www.google.com/maps?q=${BIZ.lat},${BIZ.lng}`,
    contactPoint: [
      { "@type": "ContactPoint", telephone: BIZ.phone, contactType: "sales", areaServed: "IN", availableLanguage: ["English", "Hindi"] },
      { "@type": "ContactPoint", telephone: BIZ.mobile, contactType: "customer service", areaServed: "IN", availableLanguage: ["English", "Hindi"] },
    ],
    areaServed: AREAS.map((n) => ({ "@type": "City", name: n })),
    knowsAbout: ["Mineral water plants", "Industrial RO plants", "Fire fighting systems", "Fire pumps", "Sewage treatment plants", "Rain water harvesting", "Hydropneumatic systems", "Water softening plants", "KSB pumps", "Kirloskar pumps"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Products",
      itemListElement: Object.entries(CATS).map(([key, c]) => ({
        "@type": "OfferCatalog",
        name: c.label,
        url: abs(`/solutions/${key}/`),
        itemListElement: PRODUCTS.filter((p) => p.cat === key).map((p) => ({ "@type": "Offer", itemOffered: { "@type": "Product", name: p.name, url: abs(`/products/${p.slug}/`) } })),
      })),
    },
  };
  const website = { "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE}/#website`, url: `${SITE}/`, name: BIZ.name, publisher: { "@id": `${SITE}/#business` }, inLanguage: "en-IN" };
  // only once, so re-running this script on an existing dist/ is harmless
  if (!html.includes(`${SITE}/#business`)) html = html.replace("</head>", `  ${ld(business)}\n  ${ld(website)}\n</head>`);
  writeFileSync("dist/index.html", html);
}

/* ---------------- sitemap + robots ---------------- */
const urls = [
  ["/", "1.0"], ["/products/", "0.9"],
  ...Object.keys(CATS).map((k) => [`/solutions/${k}/`, "0.9"]),
  ...PRODUCTS.map((p) => [`/products/${p.slug}/`, "0.8"]),
];
writeFileSync("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, pr]) => `  <url><loc>${abs(u)}</loc><lastmod>${TODAY}</lastmod><priority>${pr}</priority></url>`).join("\n")}
</urlset>
`);
writeFileSync("dist/robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${abs("/sitemap.xml")}\n`);
console.log(`SEO pages ready for ${SITE}: ${PRODUCTS.length} products, ${Object.keys(CATS).length} categories, sitemap with ${urls.length} URLs`);
