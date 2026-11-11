# DATA_NOTES  -  marriage-reg-bd

Facts checked 2026-11-11. All sources are public web pages found by search;
no official gazette PDF was read directly, so the fee rule is labelled with
its rule number and amendment date, and the app tells users to confirm the
current fee with their Nikah Registrar.

## Fee rule (the core fact)

- Law: Muslim Marriages and Divorces (Registration) Act, 1974.
- Rule: Muslim Marriage and Divorce (Registration) Rules, 2009, Rule 21,
  as amended December 2022 (gazette notification by the Law and Justice
  Division, Ministry of Law, Justice and Parliamentary Affairs).
- Current rule (reported by Bangladesh Post, Jan 2023, and by a Dhaka
  marriage-law practice page, both quoting the amended Rule 21):
  - Dower up to 5,00,000 taka: 14 taka per 1,000 taka of dower or part
    thereof.
  - Dower above 5,00,000 taka: 100 taka per 1,00,000 taka of the excess
    or part thereof.
  - Fee never less than 200 taka.
  - Fee payable by the bridegroom.
- Cross-check: the same rule appears on two independent sources with
  matching worked examples: 1 lakh -> 1,400; 2 lakh -> 2,800;
  5 lakh -> 7,000; 10 lakh -> 7,500. All four reproduce exactly from
  the rule as implemented in `calcFee`.
- Pre-amendment rule (for the record, NOT used in the app): 12.50 taka
  per 1,000 up to 4 lakh, then 100 taka per lakh above 4 lakh. Several
  older pages (2022 and earlier) still show this; the app uses the
  amended 2022 rule (14 per 1,000 up to 5 lakh).
- Sources:
  - https://bangladeshpost.net/posts/rules-amended-marriage-divorce-registration-cost-goes-up-102830
  - https://marriagedivorcelawyerdhakabd.com/court-marriage-procedure-in-bangladesh/
  - https://marriagedivorcelawyerdhakabd.com/court-marriage-procedure-and-requirement-papers-in-bangladesh/

## Minimum ages

- Bride 18, groom 21  -  Child Marriage Restraint Act, 2017. Stated
  consistently across the sources above and the 2026 marriage-registration
  guide at https://rashelslawdesk.com/marriage-registration-in-bangladesh-complete-legal-practical-guide-2025-2026-update/

## Who registers, where

- A licensed Nikah Registrar (Kazi), appointed by the Ministry of Law,
  registers the marriage in the ward/union where the ceremony takes place.
  Registering in another Kazi's area is against the rules.
- Source: https://kaziofficeuttara.com/important-information/ and the
  Rashel's Law Desk guide above.

## Documents

- Bride and groom: NID / passport / birth certificate (age proof),
  2 passport-size photos; SSC/JSC certificate as extra age proof;
  parents' consent if under 21.
- Two adult witnesses with NID copies.
- Sources: Rashel's Law Desk guide; https://www.kabinmatrimony.com/blog/what-is-the-law-of-marriage-in-bangladesh-

## Nikah Nama vs. official certificate

- The Nikah Nama is the marriage contract filled in by the Kazi at the
  ceremony. The official marriage certificate is a separate document
  issued by the City Corporation, Municipality or Union Parishad.
  For use abroad: notarise, then attest at the Ministry of Foreign
  Affairs (MOFA), Dhaka.
- Source: https://eatsip365.com/understanding-the-bd-marriage-certificate/

## Court marriage (affidavit)

- A court marriage is a declaration (affidavit) before a lawyer and a
  Notary Public or First Class Magistrate, on a 300-taka non-judicial
  stamp paper (required since June 2022). It is NOT a registered
  marriage by itself; the Nikah must still be solemnised and registered
  by a licensed Kazi.
- Source: marriagedivorcelawyerdhakabd.com court-marriage pages.

## Other marriage laws (facts only, no calculator)

- Hindu Marriage Registration Act, 2012 (Hindu marriages).
- Special Marriage Act, 1872 (civil marriages; one partner gives 14 days'
  written notice to the Registrar of Marriages).
- Source: https://www.kabinmatrimony.com/blog/what-is-the-law-of-marriage-in-bangladesh-

## What the app does NOT claim

- The app does not publish any Kazi office's phone number, address or
  fee beyond the Rule-21 formula, and no real person's data.
- Certificate processing time ("usually 1-3 working days") is a
  commonly reported figure from the 2026 guide, not a government
  guarantee; the guide step says "usually".
- The app never claims to be a government publication; the footer and
  README carry the unofficial-guide / not-legal-advice disclaimer.
