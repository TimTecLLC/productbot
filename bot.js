(function () {
  const api = window.TimTecCatalog;
  const chat = document.getElementById("chat-box");
  const form = document.getElementById("composer");
  const input = document.getElementById("query");
  const button = document.getElementById("search");
  const contact = document.getElementById("contact");
  let products = [];
  let ready = false;

  api.CONTACT.forEach((line, index) => {
    if (index) contact.appendChild(document.createElement("br"));
    if (index === 0) {
      const strong = document.createElement("strong");
      strong.textContent = line;
      contact.appendChild(strong);
    } else {
      contact.appendChild(document.createTextNode(line));
    }
  });

  function addRow(sender, content) {
    const row = document.createElement("div");
    row.className = sender === "user" ? "row user" : "row bot";
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    if (typeof content === "string") bubble.textContent = content;
    else bubble.appendChild(content);
    row.appendChild(bubble);
    chat.appendChild(row);
    chat.scrollTop = chat.scrollHeight;
  }

  function structureSlot(product) {
    const url = api.structureImageUrl(product.smiles);
    if (!url) {
      const fallback = document.createElement("div");
      fallback.className = "structure-fallback";
      fallback.textContent = "Structure image unavailable";
      return fallback;
    }
    const img = document.createElement("img");
    img.className = "structure";
    img.alt = `Structure of ${product.id}`;
    img.src = url;
    img.addEventListener("error", () => {
      const fallback = document.createElement("div");
      fallback.className = "structure-fallback";
      fallback.textContent = "Structure image unavailable";
      img.replaceWith(fallback);
    });
    return img;
  }

  function productCard(product) {
    const card = document.createElement("article");
    card.className = "card";
    card.appendChild(structureSlot(product));

    const body = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = product.id || "Unknown ID";
    const name = document.createElement("p");
    name.className = "iupac";
    name.textContent = product.iupac || "N/A";
    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = `Formula ${product.formula} · MW ${product.molecularWeight} · Purity ${product.purity} · On hand ${product.amount} · Lead time ${product.leadTime}`;
    const stock = document.createElement("p");
    stock.className = "stock";
    stock.textContent = `${product.stockLabel}: ${product.stock}`;

    const prices = document.createElement("ul");
    prices.className = "prices";
    product.prices.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.dose}: ${item.price}`;
      prices.appendChild(li);
    });

    const actions = document.createElement("div");
    actions.className = "actions";
    const coa = document.createElement("a");
    coa.href = api.COA_PDF + encodeURIComponent(product.id);
    coa.target = "_blank";
    coa.rel = "noopener noreferrer";
    coa.textContent = "CoA PDF";
    const sds = document.createElement("a");
    sds.className = "secondary";
    sds.href = api.SDS_PDF + encodeURIComponent(product.id);
    sds.target = "_blank";
    sds.rel = "noopener noreferrer";
    sds.textContent = "SDS PDF";
    const mail = document.createElement("a");
    mail.className = "secondary";
    mail.href = api.inquiryMailto(product);
    mail.textContent = "Email TimTec";
    actions.append(coa, sds, mail);

    body.append(title, name, meta, stock, prices, actions);
    card.appendChild(body);
    return card;
  }

  function renderResults(query, found) {
    const wrap = document.createElement("div");
    if (!found.total) {
      wrap.textContent = `No products found matching “${query}”. Check the TimTec ID, or open the CoA and SDS tools for compounds outside this catalog file.`;
      return wrap;
    }
    const summary = document.createElement("p");
    summary.className = "summary";
    summary.textContent = found.capped
      ? `Showing ${found.results.length} of ${found.total} matches. Use a full TimTec ID for one compound.`
      : `Found ${found.total} matching product${found.total === 1 ? "" : "s"}.`;
    wrap.appendChild(summary);
    found.results.forEach((product) => wrap.appendChild(productCard(product)));
    return wrap;
  }

  function setReady(isReady) {
    ready = isReady;
    input.disabled = !isReady;
    button.disabled = !isReady;
    if (isReady) input.focus();
  }

  function performSearch() {
    const query = input.value.trim();
    if (!query) return;
    addRow("user", query);
    input.value = "";
    if (!ready) {
      addRow("bot", "The catalog is still loading. Please wait a moment and try again.");
      return;
    }
    addRow("bot", renderResults(query, api.searchCatalog(products, query)));
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    performSearch();
  });

  async function loadCatalog() {
    const url = api.catalogRequestUrl(window.location.search);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.json();
      if (!Array.isArray(raw)) throw new Error("Catalog file is not a product list");
      products = raw.map(api.normalizeProduct);
      chat.textContent = "";
      setReady(true);
      addRow(
        "bot",
        `Catalog loaded (${products.length.toLocaleString()} products). Search a TimTec ID, an IUPAC name, or an exact SMILES string. CoA and SDS PDFs open from structure.timtec.org.`
      );
    } catch (error) {
      chat.textContent = "";
      setReady(false);
      addRow(
        "bot",
        `The catalog could not be loaded (${error.message}). Refresh the page, or contact timtec@timtec.org.`
      );
    }
  }

  loadCatalog();
})();
