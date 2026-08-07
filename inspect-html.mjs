const urls = {
  home: "https://vapespot.store/",
  city: "https://vapespot.store/vapespot-sydney-cbd/",
  product: "https://vapespot.store/product/vaporesso-xros-3-r-kit-7413/",
};
for (const [name, u] of Object.entries(urls)) {
  const html = await (await fetch(u)).text();
  const head = html.slice(0, html.indexOf("</head>"));
  const markers = {
    viewport: /name="viewport"/.test(head),
    cssLink: (head.match(/<link[^>]*rel="stylesheet"[^>]*>/) || [null])[0],
    inlineJs: /documentElement.classList.add\("js"\)/.test(head),
    hasSeoBlock: html.includes("seo-block"),
    seoBlockCount: (html.match(/class="seo-block/g) || []).length,
  };
  console.log(`\n=== ${name} (${u}) ===`);
  console.log("viewport meta:", markers.viewport);
  console.log("css link:", markers.cssLink);
  console.log("inline js classList:", markers.inlineJs);
  console.log("seo-block sections:", markers.seoBlockCount);
}