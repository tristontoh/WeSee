# Reading a bill into your report — user guide

How to get a figure off a utility bill and into your sustainability data, without typing it.

The platform reads the document and **proposes** figures. Nothing enters your report until you
accept it. That order matters: the values you accept are covered by the assurance hash, so the
review step is the control, not a formality.

---

## Before you start

You need a document that carries the figure printed on it. The platform reads:

| Can be read | Stored, but not read |
|---|---|
| PDF · PNG · JPG (a phone photo of a bill is fine) | XLSX · CSV · DOCX |

Up to 10 MB. A spreadsheet still uploads and is kept, but you will be told it cannot be read —
enter those values by hand.

---

## Step 1 — Upload

**Document Extraction** in the left menu.

Drop the file on the dashed area, or **Choose a document**. When it is accepted you get:

> **tnb-bill-july.pdf is being read** — the figures appear in Documents when it finishes.

Reading happens in the background, so you can upload the next one straight away or leave the page.

## Step 2 — Open it in Documents

**Documents** in the left menu, or **View document** on the confirmation.

Each row tells you where the document has got to:

| Row says | Meaning |
|---|---|
| Being read | Still working — the list refreshes itself |
| **2 figures to review** | Ready, and waiting for you |
| All figures reviewed | Nothing left to do |
| Nothing usable was found | Read, but no figure matched anything you report on |
| Could not be read | Failed — the reason is on the row |

## Step 3 — Check each figure against the bill

Click the row. The document is on the left, what was read from it on the right. **Read them
together** — that pairing is the whole point of the screen.

Each proposed figure shows:

- **The value and its unit** — the unit your report uses, which may not be the unit the bill printed
- **Where it goes** — an emission factor, or an indicator
- **The period** — fiscal year, and the month when the bill covers one
- **How confident** the reading was
- **The quoted text it came from**, word for word

### Three things worth checking

**1. A converted unit.** A figure reading `758.23 MWh · read as kWh` means the bill printed kWh and
the platform converted it, because that indicator is kept in MWh. The quote shows the original
number. If you see `read as`, check the conversion is the one you expect.

**2. A sum.** When a bill splits consumption — peak and off-peak, several meters, a line per month —
the components are proposed separately and their total is proposed for the indicator. A total's
quote names the lines it was added from, so you can check the arithmetic:

> Sum of Penggunaan Puncak (kWh) 612,340 and Penggunaan Luar Puncak (kWh) 145,890

**3. The right line.** A bill has several numbers on it. Confirm the quote points at the line you
would have typed from — not last month's reading, and not the amount payable.

## Step 4 — Accept or reject

- **Accept** — the value is written to your data. Correct the number in the box first if the
  reading is off; what you accept is what is stored.
- **Reject** — nothing is written. Use it for a misread figure or one you do not want.

You can also do this from the Documents list once you trust a reading, but the first time it is
worth doing it beside the document.

## Step 5 — Find it in your report

| Accepted as | Appears in |
|---|---|
| Emission activity | **Emission Activity** — with its tCO₂e calculated from the factor |
| Indicator | **Indicators** — against that indicator for the year, or the month |

From there it flows into the Emissions Dashboard, IFRS disclosures and the Export Center like any
figure you had typed.

---

## What cannot be extracted yet

The platform only proposes a figure when it has somewhere to put it — one of your emission factors
or one of your indicators. On a typical TNB commercial bill that means:

| On the bill | Extracted |
|---|---|
| Consumption in kWh, peak and off-peak | Yes |
| Total consumption | Yes, as the electricity indicator |
| Maximum demand (kW) | No — no indicator holds it |
| Amount payable (RM) | No — money on a utility bill is not one of the reported figures |
| Power factor | No |

This is deliberate: a figure is never forced into an indicator just because the units happen to
match. If you need one of these reported, it needs an indicator of its own first — ask your
administrator.

Other documents work the same way: a water bill fills water intake in m³, a waste invoice fills
waste in tonnes, a fuel invoice fills diesel or petrol in litres.

---

## When something goes wrong

**"Could not be read."** Open it and use **Read it again** — a failure is often a momentary one.
If it fails again, the row names the reason.

**Nothing was found in a document that clearly has figures.** The figures may not correspond to
anything you currently report on. Check the list above.

**A figure is wrong.** Correct it in the box before accepting, or reject it and enter the value by
hand. A wrong reading is worth mentioning to your administrator — the quoted text shows what the
platform thought it was reading.

**Accept is refused for a past year.** That year has been signed off. Sign-off freezes the figures
behind it, so a new value cannot be added without the sign-off being revoked first.
