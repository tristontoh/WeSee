/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, ShieldCheck, Fingerprint, Lock } from 'lucide-react';
import { usePlan, PlanType } from '../contexts/PlanContext';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';

/**
 * The nine steps that take one document from upload to a filed disclosure.
 *
 * Deliberately not an overlay tour. A step-anchored tour breaks whenever a selector moves — the
 * React rewrite would have invalidated every anchor — and it is only ever seen once, by someone
 * who has just finished two setup wizards and is clicking to get past them. A page instead: skim
 * the nine cards in under a minute, open the one you are actually stuck on, and every card can
 * take you to the screen it describes. That last part is why it stays useful after the first day.
 *
 * Screenshots live in `public/assets/guide/` rather than being imported: they are documentation,
 * not part of the bundle, and re-shooting one should not mean a rebuild.
 */

interface Step {
  key: string;
  title: string;
  /** One line, read while skimming. Everything else waits for the dialog. */
  summary: string;
  /** The nav item this step happens on — shown on the card, and the label on the jump button. */
  screen: string;
  path: string;
  /** Breadcrumb of the actual clicks, shown at the top of the dialog. */
  where: string;
  shot: string;
  detail: string[];
  /** A second screenshot for the steps that genuinely span two screens. */
  extraShot?: { src: string; caption: string };
  caption: string;
  /**
   * The two steps where the user's click is binding: accepting a figure writes it to the report,
   * signing locks the cycle behind a hash. Marked so they do not read as ordinary navigation.
   */
  binding?: string;
  /**
   * The feature registry key, for the three steps that are above STARTER. Opening one of those on
   * a plan that does not include it lands on the upgrade wall — fine in itself, but being sent
   * there by a guide with no warning reads as the guide being wrong about the product.
   */
  feature?: string;
}

const PLAN_LABELS: Record<PlanType, string> = {
  'starter': 'Starter',
  'growth': 'Growth',
  'issuer-ready': 'Issuer-Ready',
};

const SHOT = (name: string) => `/assets/guide/${name}.jpg`;

const STEPS: Step[] = [
  {
    key: 'dashboard',
    title: 'Read the Dashboard',
    summary: 'Four tiles count your matters. Needs Attention is the to-do list.',
    screen: 'Dashboard',
    path: '/dashboard',
    where: 'Left menu → Dashboard',
    shot: SHOT('dashboard'),
    caption: 'Completion and attention are different questions — a matter can be both.',
    detail: [
      'The four tiles count matters — the sustainability topics you are obliged to report — as Total, Completed, In Progress and Needs Attention.',
      'Needs Attention is your to-do list. Each row says why it is flagged (no data logged yet, or a target breached) and clicks through to the indicator behind it.',
      'Reporting Readiness, further down, answers the only question that matters near a deadline: can this be filed yet.',
    ],
  },
  {
    key: 'materiality',
    title: 'Say what matters',
    summary: 'Score every topic twice — effect on the company, effect on the world.',
    screen: 'Materiality',
    path: '/materiality',
    where: 'Left menu → Materiality → Assessment Wizard',
    shot: SHOT('materiality'),
    caption: 'Energy Consumption & GHG Footprint, scored on both axes.',
    detail: [
      'Four stages, in order: Stakeholder Map → Matter Scoring → Matrix Analysis → Summary & Capture.',
      'Score each matter twice. Financial materiality asks what the issue does to the company; impact materiality asks what the company does to the world.',
      'Do this before entering numbers. The matrix decides which indicators you are then required to fill.',
    ],
  },
  {
    key: 'upload',
    title: 'Drop in a bill',
    summary: 'PDF or a phone photo, up to 10 MB. Check the preview, then Process.',
    screen: 'Document Extraction',
    path: '/extraction',
    where: 'Left menu → Document Extraction → Choose a document',
    shot: SHOT('upload'),
    caption: 'Malay billing layouts are fine. Nothing needs marking up.',
    extraShot: { src: SHOT('processing'), caption: 'Close the dialog and it carries on in the background.' },
    detail: [
      'PDF, PNG and JPG are read — a phone photo of a bill is fine. XLSX, CSV and DOCX upload and are kept, but nothing reads them; those values go in by hand.',
      'Nothing is sent until you press Process, and the page shows the document first. Catching the wrong month here costs nothing.',
      'Four stages follow: uploading the document, waiting for a reader, reading the figures, ready to review. Safe to close — it keeps reading and the result lands in Documents.',
    ],
  },
  {
    key: 'review',
    title: 'Accept each figure',
    summary: 'The platform proposes. Nothing reaches your report until you accept it.',
    screen: 'Documents',
    path: '/documents',
    where: 'Left menu → Documents → open the processed file',
    shot: SHOT('review'),
    caption: '744,747 kWh at peak, 167,699 off-peak, and the 912.446 MWh total derived from them.',
    binding: 'The control',
    detail: [
      'The platform proposes. Nothing is written to your data until a person accepts, and everything accepted is later covered by the assurance hash.',
      'Each row shows the figure, what it maps to, and the exact line it came from, page number included. Set the fiscal year on each row: the period decides which report the figure appears in.',
      'The reader can only name emission factors and indicators your company already has — it cannot invent one. And it never does arithmetic: the bill reads kilowatt hours, the indicator wants megawatt hours, and the platform converts, not the model.',
    ],
  },
  {
    key: 'books',
    title: 'One entry, two books',
    summary: 'The figure lands in Emission Activity and the Indicators Log at once.',
    screen: 'Emission Activity',
    path: '/activity',
    where: 'Left menu → Emission Activity, and Indicators',
    shot: SHOT('indicators'),
    caption: 'The same reading, filed as a Bursa disclosure indicator.',
    extraShot: { src: SHOT('emissions'), caption: 'Converted with published factors, then applied to a scope.' },
    detail: [
      'In Emission Activity the figure becomes an entry converted to tCO₂e with published Malaysian factors, which you apply to a scope — grid electricity to Scope 2, diesel to Scope 1.',
      'The same reading appears in the ESG Indicators Log as a disclosure indicator under the Bursa Common Sustainability Matters, with its own audit trail and history.',
      'You never key it twice — which is where most reporting errors actually come from.',
    ],
  },
  {
    key: 'ifrs',
    feature: 'ifrs-s1-s2',
    title: 'Answer S1 and S2',
    summary: 'The written parts — governance and climate risk — with evidence attached.',
    screen: 'IFRS S1/S2',
    path: '/ifrs-s1-s2',
    where: 'Left menu → IFRS S1/S2',
    shot: SHOT('ifrs'),
    caption: 'Governance oversight, answered once, with the evidence attached to the answer.',
    detail: [
      'S1 asks who holds oversight and how the board reviews it. S2 asks the same of climate risk, segment by segment, and carries the greenhouse gas disclosure ledger.',
      'Find Evidence pulls up the documents behind a claim, so a sentence about peak consumption can point at the bill it came from.',
      'Draft with AI proposes wording. Treat it as a first draft you edit, not an answer you accept.',
    ],
  },
  {
    key: 'targets',
    feature: 'targets',
    title: 'Set a target',
    summary: 'Link it to an indicator and a baseline. Progress calculates itself.',
    screen: 'Targets',
    path: '/targets',
    where: 'Left menu → Targets → Add Target',
    shot: SHOT('targets'),
    caption: 'Linked to Total Electricity Consumed, so the chart moves when the indicator does.',
    detail: [
      'A target links an indicator to a baseline year — cut purchased electricity 30% against the FY2025 baseline, where FY2025 is the figure taken off that bill.',
      'Progress is not typed in. It recalculates from indicator data as new readings are accepted.',
      'The on-track and off-track flags on the Dashboard follow from it.',
    ],
  },
  {
    key: 'signoff',
    feature: 'assurance-workspace',
    title: 'Sign and lock',
    summary: 'A SHA-256 hash covers every value. Change one and it stops matching.',
    screen: 'Assurance Workspace',
    path: '/assurance-workspace',
    where: 'Left menu → Assurance Workspace → Execute Board Level Sign-Off',
    shot: SHOT('signoff'),
    caption: 'The signature is over the figures, not over a PDF produced later.',
    binding: 'The lock',
    detail: [
      'Mark the cycle internally reviewed once the metrics are complete, then sign: signatory, designation, notes, and the assurance level you are claiming. Internal Review is not the same claim as external assurance — pick the true one.',
      'Sign and Lock Cycle takes a SHA-256 digest across every value in the disclosure. Change one figure afterwards and the hash stops matching.',
      'An auditor asking where 912.446 MWh came from gets the bill, the page, the line, and who accepted it — without anyone hunting through email.',
    ],
  },
  {
    key: 'export',
    title: 'Export and file',
    summary: 'Report PDF for people, CSV for analysts, CSI file for the exchange.',
    screen: 'Reports',
    path: '/reports',
    where: 'Left menu → Reports',
    shot: SHOT('export'),
    caption: 'Raw ledger for your analysts, CSI export for the exchange.',
    extraShot: { src: SHOT('report'), caption: 'Previewed before download — this is what gets filed.' },
    detail: [
      'Integrated ESG Disclosure Report — the human document. Preview it, then Confirm & Download.',
      'Raw Data Export — the CSV ledger of every indicator and its history, for your own analysts.',
      'CSI-Compatible Export — structured to Bursa’s upload rules, with Matter ID, Metric Code, Reporting Value, Unit and Submission Status already in the right columns. Export History records who exported what, when, and against which sign-off.',
    ],
  },
];

const TRUTHS = [
  {
    icon: <ShieldCheck className="w-4 h-4" />,
    label: 'Consent',
    title: 'Nothing enters without a person',
    body: 'Extracted figures wait in staging. There is no path from a document to a disclosure that skips you.',
  },
  {
    icon: <Fingerprint className="w-4 h-4" />,
    label: 'Provenance',
    title: 'Every number keeps its source',
    body: 'A figure carries its document, page and printed line right through to the exported report.',
  },
  {
    icon: <Lock className="w-4 h-4" />,
    label: 'Integrity',
    title: 'Sign-off is a lock, not a label',
    body: 'If a signed figure changes afterwards, the hash mismatch shows it. Nobody has to spot it by eye.',
  },
];

export default function GuideView() {
  const navigate = useNavigate();
  const { hasFeature, getFeatureDetails } = usePlan();

  /** The plan a step needs, or null when this workspace already has it. */
  const planNeededFor = (step: Step): string | null => {
    if (!step.feature || hasFeature(step.feature)) return null;
    return PLAN_LABELS[getFeatureDetails(step.feature).requiredPlan];
  };
  const [openKey, setOpenKey] = useState<string | null>(null);

  const open = STEPS.find((s) => s.key === openKey) ?? null;

  return (
    <div className="space-y-6 w-full pb-16">

      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">From a bill to a filed disclosure</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Nine steps, in order. Skim the cards; open any one for the detail, or jump straight to the screen it
            describes.
          </p>
        </div>
      </div>

      {/* 2. BEFORE YOU START */}
      <Card className="bg-white border-gray-100" padded="sm">
        <p className="text-xs text-gray-600 leading-relaxed">
          <span className="font-bold text-gray-900">Before you start:</span> verify the link emailed to you, then
          answer the three setup questions — market, sector, reporting frameworks. They decide which indicators you
          are held to, so answer them accurately.
        </p>
      </Card>

      {/* 3. THE NINE STEPS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {STEPS.map((step, i) => (
          <div
            key={step.key}
            className={`group bg-white rounded-[20px] border shadow-sm overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              step.binding ? 'border-emerald-200' : 'border-gray-100'
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenKey(step.key)}
              aria-label={`Step ${i + 1}: ${step.title} — read the detail`}
              className="block w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset"
            >
              <img
                src={step.shot}
                alt={`${step.screen} screen`}
                loading="lazy"
                className="w-full aspect-video object-cover object-left-top border-b border-gray-100 bg-gray-50"
              />
              <div className="px-5 pt-4 pb-3">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[11px] font-bold text-emerald-600 tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-base font-bold tracking-tight text-gray-900">{step.title}</h3>
                </div>
                <p className="text-[13px] text-gray-500 leading-relaxed mt-1.5">{step.summary}</p>
                {planNeededFor(step) && (
                  <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2.5 py-1 w-fit">
                    Needs {planNeededFor(step)}
                  </p>
                )}
              </div>
            </button>

            <div className="mt-auto flex items-center justify-between gap-2 px-5 pb-4 pt-1">
              <div className="flex items-center gap-1.5 min-w-0">
                {step.binding && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1 shrink-0">
                    {step.binding}
                  </span>
                )}
                {!step.binding && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 truncate">{step.screen}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setOpenKey(step.key)}
                  className="text-[11px] font-bold text-gray-400 hover:text-gray-700 inline-flex items-center gap-0.5 cursor-pointer transition-colors px-1.5 py-1 rounded-md"
                >
                  Detail <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(step.path)}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-0.5 cursor-pointer transition-colors px-1.5 py-1 rounded-md"
                >
                  Open <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4. THREE THINGS THAT ARE ALWAYS TRUE */}
      <div className="pt-2">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Three things that are always true</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TRUTHS.map((t) => (
            <Card key={t.label} className="bg-white border-gray-100" padded="sm">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                {t.icon}
                <span className="text-[10px] font-bold uppercase tracking-wider">{t.label}</span>
              </div>
              <h4 className="text-[13px] font-bold text-gray-900 mb-1">{t.title}</h4>
              <p className="text-xs text-gray-500 leading-relaxed">{t.body}</p>
            </Card>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-gray-400 leading-relaxed">
        Worked example: a TNB electricity bill for WeSee Manufacturing Sdn Bhd, FY2025. If a screen looks different
        from the picture, trust the app.
      </p>

      {/* 5. DETAIL DIALOG */}
      <Modal
        open={open !== null}
        onClose={() => setOpenKey(null)}
        title={open?.title ?? ''}
        subtitle={open?.where}
        className="max-w-3xl!"
        footer={
          open && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setOpenKey(null)}>
                Close
              </Button>
              <Button
                size="sm"
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
                onClick={() => {
                  setOpenKey(null);
                  navigate(open.path);
                }}
              >
                Go to {open.screen}
              </Button>
            </>
          )
        }
      >
        {open && (
          <div className="space-y-4 pb-2">
            {planNeededFor(open) && (
              <p className="text-[13px] text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5">
                This step needs the <strong className="font-semibold">{planNeededFor(open)}</strong> plan. You can
                read it here; opening the screen will offer you the upgrade rather than the feature.
              </p>
            )}
            <ul className="space-y-2.5">
              {open.detail.map((line) => (
                <li key={line} className="flex gap-2.5 text-[13px] text-gray-600 leading-relaxed">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <figure className="space-y-1.5">
              <img
                src={open.shot}
                alt={`${open.screen} screen`}
                className="w-full rounded-xl border border-gray-100 bg-gray-50"
              />
              <figcaption className="text-[11px] text-gray-400">{open.caption}</figcaption>
            </figure>

            {open.extraShot && (
              <figure className="space-y-1.5">
                <img
                  src={open.extraShot.src}
                  alt={`${open.screen} screen, second view`}
                  className="w-full rounded-xl border border-gray-100 bg-gray-50"
                />
                <figcaption className="text-[11px] text-gray-400">{open.extraShot.caption}</figcaption>
              </figure>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
