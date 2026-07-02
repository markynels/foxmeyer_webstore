# Store policies — English baseline (July 2026)

Paste-ready content for **Shopify admin → Settings → Policies**. The Shopify MCP/API connection lacks the `write_legal_policies` scope, so these were pasted by hand.

> **Status: LIVE** — all three policies were pasted into Settings → Policies in July 2026 (contact email `info@foxmeyer.co`). This doc is the English baseline / backup; keep it in sync if a policy is edited in admin.

## How to install (already done — for reference)

1. Shopify admin → **Settings → Policies**.
2. Open each policy below (Terms of service, Refund policy, Shipping policy).
3. In the policy editor, click the **`<>`** (Show HTML) button and paste the corresponding HTML block verbatim. Save.
4. Once saved, each policy is live at `/policies/terms-of-service`, `/policies/refund-policy`, `/policies/shipping-policy`, is linked automatically in the **checkout footer**, and appears automatically in the **storefront footer** legal row (the footer loops `shop.policies`, so no theme change is needed per policy).

## Notes / flags

- **Legal entity name:** the text says "Fox Meyer®". If the legal entity is different (e.g. a numbered Québec company doing business as Fox Meyer), the Terms of Service intro should name it: "operated by 1234-5678 Québec inc., doing business as Fox Meyer®".
- **Contact email:** literal `info@foxmeyer.co` (updated July 2026 from the old store contact address). If it ever changes, search each policy for the address.
- **Order processing time** is stated as **1–3 business days** and Standard delivery as **2–8 business days** — placeholders pending real fulfilment cadence; adjust in the Shipping policy if wrong.
- **Return window** is 30 days for damaged/defective claims and unopened returns — a deliberate choice, adjustable.
- These drafts are consistent with the box model (no single cans, no subscriptions, free Standard shipping in Canada, $20 Express) and preserve Québec CPA legal-warranty rights. **They are drafts, not legal advice — have them reviewed by a lawyer before or shortly after launch.**
- **FR versions (Bill 96):** translate via **Translate & Adapt** when the French flip happens (policies are translatable resources). FR must be done before the store is public to Québec customers. Use "Fox Meyer ᴹᴰ" in the FR text per brand rules.

---

## 1. Terms of service (`TERMS_OF_SERVICE`)

```html
<div>
<p>Last updated: July 2, 2026</p>
<h2>1. Overview</h2>
<p>This website is operated by Fox Meyer® ("we", "us", "our"), a specialty coffee roaster based in Dorval, Québec, Canada. By visiting our site or purchasing something from us, you agree to be bound by these Terms of Service, including the policies referenced here (our Refund Policy, Shipping Policy and Privacy Policy). Please read them carefully. If you do not agree with these terms, please do not use the site or the services.</p>
<h2>2. Eligibility</h2>
<p>By using this site, you confirm that you are at least the age of majority in your province or territory of residence, or that you have the consent of a parent or guardian.</p>
<h2>3. Products and orders</h2>
<p>Our coffee is sold exclusively in boxes of 4 or 8 cans, with your choice of blend mix. We reserve the right to refuse or cancel any order, and to limit quantities per person, household or order, at our discretion. If we change or cancel an order after payment, we will notify you using the contact details provided at checkout and refund any amount already charged.</p>
<p>All product descriptions and prices are subject to change at any time without notice. We may discontinue any product at any time.</p>
<h2>4. Pricing and payment</h2>
<p>All prices are in Canadian dollars (CAD) unless otherwise indicated. Applicable taxes are calculated at checkout. We make every effort to display accurate pricing, but in the event of a pricing or typographical error we reserve the right to cancel the affected order and issue a full refund.</p>
<h2>5. Shipping and delivery</h2>
<p>Shipping is governed by our Shipping Policy. Risk of loss and title for products pass to you upon delivery to the shipping address you provide. Please make sure your shipping address is accurate and complete.</p>
<h2>6. Returns and refunds</h2>
<p>Returns and refunds are governed by our Refund Policy. Because coffee is a perishable food product, special conditions apply — please review the Refund Policy before ordering.</p>
<h2>7. Product information</h2>
<p>Coffee is a natural, agricultural product. Tasting notes, roast appearance and packaging may vary slightly between batches. Product images are for illustration and may differ slightly from the items delivered.</p>
<h2>8. Accuracy of your information</h2>
<p>You agree to provide current, complete and accurate purchase and account information for all purchases made on the site, and to promptly update your information so that we can complete your transactions and contact you as needed.</p>
<h2>9. Prohibited uses</h2>
<p>You may not use the site or its content for any unlawful purpose; to violate any laws or regulations; to infringe our intellectual property rights or those of others; to transmit malicious code; to collect or track the personal information of others; or to interfere with the security or proper functioning of the site or of any related website.</p>
<h2>10. Intellectual property</h2>
<p>All content on this site — including the Fox Meyer® name and trademarks, logos, the fox and frog artwork, product names, text, graphics, photographs and design — is our property or that of our licensors and is protected by Canadian and international intellectual property laws. You may not reproduce, distribute or otherwise use any of this content without our prior written permission.</p>
<h2>11. Third-party links and tools</h2>
<p>The site may contain links to third-party websites or rely on third-party tools (such as payment processing). We are not responsible for the content or practices of third parties, and your use of their websites or tools is at your own risk and subject to their own terms.</p>
<h2>12. Disclaimer and limitation of liability</h2>
<p>To the fullest extent permitted by applicable law, the site and the products are provided "as is" and "as available", and we will not be liable for indirect, incidental or consequential damages arising from your use of the site or the products. Nothing in these terms excludes, restricts or modifies any warranty, guarantee or right that cannot be excluded under applicable law, including the legal warranty provided by the Consumer Protection Act (Québec) and other mandatory consumer protection legislation in Canada.</p>
<h2>13. Indemnification</h2>
<p>You agree to indemnify and hold us and our officers, employees and suppliers harmless from any claim or demand, including reasonable legal fees, arising out of your breach of these Terms of Service or your violation of any law or the rights of a third party.</p>
<h2>14. Governing law</h2>
<p>These Terms of Service and any separate agreements whereby we provide you services are governed by the laws of the Province of Québec and the federal laws of Canada applicable therein, subject to any mandatory consumer protection rules of your place of residence.</p>
<h2>15. Severability and changes</h2>
<p>If any provision of these terms is found to be unlawful or unenforceable, the remaining provisions remain in full force. We may update these Terms of Service from time to time; the version posted on this page, with its "Last updated" date, applies to your use of the site. We encourage you to review this page periodically.</p>
<h2>16. Contact</h2>
<p>Questions about these Terms of Service can be sent to us at info@foxmeyer.co.</p>
</div>
```

---

## 2. Refund policy (`REFUND_POLICY`)

```html
<div>
<p>Last updated: July 2, 2026</p>
<p>We want you to enjoy every can. Because coffee is a perishable food product sealed for freshness, our return rules are a little different from those for general merchandise — here is how it works.</p>
<h2>Damaged, defective or incorrect orders</h2>
<p>Please inspect your box when it arrives. If anything is damaged, defective, or not what you ordered, contact us at info@foxmeyer.co within 30 days of delivery with your order number and a photo of the issue. We will make it right with a replacement or a full refund — you will not need to ship anything back.</p>
<h2>Opened cans</h2>
<p>For food safety reasons, we cannot accept returns of opened cans. If something about the coffee itself is not right — an off taste, a seal that did not hiss, anything unusual — tell us anyway. Quality is the whole point of the can, and we will work with you on a replacement or refund where appropriate.</p>
<h2>Unopened boxes</h2>
<p>If you change your mind, unopened cans in their original condition can be returned within 30 days of delivery. To start a return, contact us at info@foxmeyer.co with your order number. Return shipping is at your expense, and we recommend a tracked service — items lost in return transit cannot be refunded. Once we receive and inspect the return, we will refund the product amount to your original payment method. Express shipping charges, if any, are not refundable.</p>
<h2>Cancellations</h2>
<p>You can cancel an order at no charge any time before it ships — email us as soon as possible with your order number. Once an order has shipped, the return rules above apply.</p>
<h2>Refund processing</h2>
<p>Approved refunds are issued to your original payment method. Please allow up to 10 business days after approval for the refund to appear, as processing times vary by bank and card issuer. If more than 15 business days have passed since your refund was approved, contact us at info@foxmeyer.co.</p>
<h2>Your legal rights</h2>
<p>Nothing in this policy limits the rights and warranties you have under applicable law, including the legal warranty provided by the Consumer Protection Act (Québec) and other mandatory consumer protection legislation in Canada.</p>
</div>
```

---

## 3. Shipping policy (`SHIPPING_POLICY`)

```html
<div>
<p>Last updated: July 2, 2026</p>
<p>Every order is roasted, canned and shipped from our roastery in Dorval, Québec, Canada. Our cans are nitrogen-sealed at the peak of freshness, so your coffee travels well and arrives ready to open.</p>
<h2>Order processing</h2>
<p>Orders are prepared and handed to the carrier within 1–3 business days. Orders placed on weekends or holidays begin processing the next business day. You will receive a confirmation email with tracking information as soon as your box ships.</p>
<h2>Shipping within Canada</h2>
<ul>
<li><strong>Standard shipping — free on every order.</strong> Every Fox Meyer® box ships free anywhere in Canada, no minimum and no code needed. Typical delivery is 2–8 business days after shipping, depending on your region.</li>
<li><strong>Express shipping — $20 CAD flat.</strong> A faster option for when you are counting the days, typically 1–3 business days after shipping.</li>
</ul>
<h2>United States and international</h2>
<p>Rates and available services for destinations outside Canada are calculated at checkout based on the destination and the weight of your order. Delivery times vary by destination and carrier. International orders may be subject to customs duties, import taxes and brokerage fees levied by the destination country; these charges are the responsibility of the recipient and are not included in our prices or shipping charges.</p>
<h2>Shipping address</h2>
<p>Please double-check your shipping address at checkout — we are unable to reroute a package once it has shipped. If a package is returned to us as undeliverable due to an incomplete or incorrect address, we will contact you to arrange reshipment; additional shipping charges may apply.</p>
<h2>Delayed, lost or damaged shipments</h2>
<p>Delivery estimates are provided by the carriers and are not guaranteed. If your tracking has not updated for several days, or your order has not arrived within the estimated window, contact us at info@foxmeyer.co with your order number and we will follow up with the carrier. If your box arrives damaged, keep the packaging, take a photo, and contact us within 30 days of delivery — we will arrange a replacement or refund as described in our Refund Policy.</p>
<h2>Questions</h2>
<p>For anything shipping-related, write to us at info@foxmeyer.co — we are happy to help.</p>
</div>
```
