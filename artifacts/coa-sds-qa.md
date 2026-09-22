# CoA / SDS and product-bot QA

Date: 2026-09-22. Repo audited: `TimTecLLC/productbot`.

## This repo is not the CoA/SDS source of truth

`productbot` contains a static product chatbot and `TimTec_CATALOG_SOURCE.json` (105,466 products). It does not render, preview, or email Certificates of Analysis or Safety Data Sheets.

Live document tools (Next.js on Caddy, not in this public org):

| Step | CoA | SDS |
| --- | --- | --- |
| Form | https://structure.timtec.org/coa | https://structure.timtec.org/msds |
| Lookup | `POST /api/coa/lookup` `{text}` | `POST /api/msds/lookup` `{text}` |
| One PDF | `GET /api/coa/pdf?id=` | `GET /api/msds/pdf?id=` or `?smiles=` |
| Bundle | `POST /api/coa/zip` and `/api/coa/excel` | `POST /api/msds/zip` and `/api/msds/excel` |

Public TimTecLLC repos checked: `productbot` (this one), `botproduct` (the chatbot linked as TT-BOT), `timtec-org-static` (marketing site), `remodelingsupplier-us` (unrelated). None of them generate CoA or SDS PDFs.

**Next repo to change for PDF templates, structure-image styling, or customer-email delivery:** the private Next.js app deployed at `structure.timtec.org`. It is not in the public org listing above. For the chatbot actually embedded from www.timtec.org, the follow-up repo is `TimTecLLC/botproduct` (`https://timtec-catalog-bot.onrender.com/`), which still labels stock as Orlando, Florida.

## What works on the live CoA/SDS tools

Checked with TimTec ID `ST091907` on 2026-09-22.

- Lookup returns catalog identity, formula `C14H15F3N4O3`, MW `344.29`, purity `90%`, lot, and `structureUrl` (PubChem CID PNG).
- CoA PDF is one page. Header address is **1950 East Irlo Bronson Memorial Highway, Suite 301, Kissimmee, Florida 34744**. Phone 302-292-8500, timtec@timtec.org, www.timtec.org. No Tampa string in the extracted text.
- The CoA PDF embeds two images: the TimTec logo and a PubChem 2D structure drawing (present, not a broken box).
- Signer on the CoA is **Oxsana Koshova PhD – MD/Lab Manager**, dated at Kissimmee. The PDF does not contain an Audrey Lorenzen signature.
- SDS PDF is version 1.1, two pages, same Kissimmee Suite 301 supplier block, same structure image, Chemtrec emergency numbers, and an explicit “classification not available” statement when PubChem has no GHS data.
- The public UI has no send-email step. From `timtec@timtec.org`, cc `ledger@timtec.org`, and an Audrey Lorenzen signature were not found in the page script or in either PDF.

## What was broken in this repo

- `TimTecBot_code.html` shipped with `catalog = []`, so every search returned no products even though the 82 MB JSON sits beside it.
- The page expected `InStock_Tampa`, `Amount`, `Purity`, and `MolecularWeight`. The file uses `In Stock Tampa, FL`, `Amount/mg`, `Purity %`, and `Molecular weight`. Stock, purity, MW, and the price fallback never resolved.
- The visible stock line said **In Stock (Tampa)**.
- There was no Kissimmee Suite 301 contact block and no link to CoA or SDS.
- Product and query text were inserted with `innerHTML`.
- A hard-coded price matrix replaced catalog cells that say “request availability and price” with dollar amounts. For a 1 mg on-hand row that matrix would quote 2 mg at $120 even when the file says to request the price. Explicit `Price_1mg` of `120` also disagrees with that matrix (`$100`), so the matrix is not a safe quote source.
- `Purity %` value `0.9` (102,803 of 105,466 rows) would have displayed as `0.9`. The live CoA shows `90%`.
- `ST000001` resolves on the live CoA service (`foundInCatalog: true`) and is **absent** from this JSON. The chatbot file and the CoA database are not the same catalog.

## What this change fixes

Customer-facing chatbot only (`index.html` / `TimTecBot_code.html`, `bot.js`, `bot.css`, `catalog.js`):

- Loads `TimTec_CATALOG_SOURCE.json` (or `?catalog=` for a same-origin fixture) and maps the real column names.
- Stock label is **In stock (Kissimmee, FL)**. The legacy Tampa column is still read so existing “Yes” values show. The word Tampa is not rendered.
- Contact block is always visible: TimTec, LLC, 1950 East Irlo Bronson Memorial Highway, Suite 301, Kissimmee, Florida 34744, phone, fax, timtec@timtec.org.
- Each result links to the live CoA PDF, SDS PDF, and a mailto to `timtec@timtec.org` cc `ledger@timtec.org`. The mailto is the customer’s own message. It is not signed as Audrey Lorenzen, because this page does not send TimTec’s outbound mail.
- Purity fractions from 0 to 1 display as percents (`0.9` → `90%`), matching the CoA for `ST091907`. Request-style prices stay “Request”.
- A PubChem SMILES depiction sits beside the identity block (same depiction family as the CoA `structureUrl`). If PubChem has no image, the card says the structure image is unavailable.
- Results are built with `textContent`, so an IUPAC value containing an `<img onerror>` stays text.
- Light layout pass using the public site’s lab-teal palette: structure column, price grid, and a persistent address footer.

The 82 MB catalog was not rewritten. Renaming `In Stock Tampa, FL` inside 105,466 rows would not change what customers see after this UI fix, and `botproduct` still reads that key.

## Verification

- `node --test tests/catalog.test.js` — 6 passed, including a full-file lookup of `ST091907` (purity `90%`, Kissimmee stock label, stock `Yes`).
- Browser pass on `index.html?catalog=fixtures/sample-catalog.json`: ST091907 card, PubChem structure image, CoA href `https://structure.timtec.org/api/coa/pdf?id=ST091907`, ethanol IUPAC shown as literal markup with no alert, and a 390px layout that still shows Suite 301.

## Still open

- PDF header, structure-image style, lot logic, and any Audrey Lorenzen outbound email live in the `structure.timtec.org` app, which this PR cannot change.
- www.timtec.org’s TT-BOT link points at `botproduct`, not this repository. Shipping this branch does not update that embed.
- This catalog and the CoA catalog disagree (example: `ST000001`).
- Client-side search still downloads the full JSON before the first query.
