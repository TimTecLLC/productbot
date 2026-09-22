const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const api = require("../catalog.js");

const root = path.join(__dirname, "..");

test("fractional purity matches the CoA percent style", () => {
  assert.equal(api.formatPurity("0.9"), "90%");
  assert.equal(api.formatPurity("0.995"), "99.5%");
  assert.equal(api.formatPurity("98"), "98%");
  assert.equal(api.formatPurity(">95%"), ">95%");
  assert.equal(api.formatPurity("None"), "N/A");
});

test("request prices stay requests instead of a guessed matrix", () => {
  assert.equal(api.displayPrice("request availability and price"), "Request");
  assert.equal(api.displayPrice("120"), "$120");
  assert.equal(api.displayPrice(""), "Request");
});

test("legacy Tampa stock column is read but not shown", () => {
  const raw = JSON.parse(fs.readFileSync(path.join(root, "fixtures/sample-catalog.json"), "utf8"))[0];
  const product = api.normalizeProduct(raw);
  assert.equal(product.stock, "Yes");
  assert.equal(product.stockLabel, "In stock (Kissimmee, FL)");
  assert.equal(product.purity, "90%");
  assert.equal(product.molecularWeight, "344.29");
  assert.equal(product.formula, "C14H15F3N4O3");
  assert.equal(product.amount, "1 mg");
  assert.equal(JSON.stringify(product).toLowerCase().includes("tampa"), false);
  assert.equal(api.CONTACT.some((line) => line.includes("Suite 301")), true);
  assert.equal(api.CONTACT.join("\n").toLowerCase().includes("tampa"), false);
  assert.equal(api.INQUIRY_TO, "timtec@timtec.org");
  assert.equal(api.INQUIRY_CC, "ledger@timtec.org");
});

test("search prefers an exact TimTec ID and escapes nothing into HTML", () => {
  const products = JSON.parse(fs.readFileSync(path.join(root, "fixtures/sample-catalog.json"), "utf8")).map(api.normalizeProduct);
  const exact = api.searchCatalog(products, "st091907");
  assert.equal(exact.total, 1);
  assert.equal(exact.results[0].id, "ST091907");
  const partial = api.searchCatalog(products, "ethanol");
  assert.equal(partial.total, 1);
  assert.match(partial.results[0].iupac, /<img/);
});

test("customer page does not mention Tampa", () => {
  const html = fs.readFileSync(path.join(root, "TimTecBot_code.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "bot.css"), "utf8");
  const bot = fs.readFileSync(path.join(root, "bot.js"), "utf8");
  assert.equal(/tampa/i.test(html + css + bot), false);
});

test("full catalog file maps ST091907 when present", () => {
  const fullPath = path.join(root, "TimTec_CATALOG_SOURCE.json");
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).size < 1000) return;
  const raw = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  const products = raw.map(api.normalizeProduct);
  const hit = api.searchCatalog(products, "ST091907");
  assert.equal(hit.total, 1);
  assert.equal(hit.results[0].purity, "90%");
  assert.equal(hit.results[0].stockLabel, "In stock (Kissimmee, FL)");
  assert.equal(hit.results[0].stock, "Yes");
});
