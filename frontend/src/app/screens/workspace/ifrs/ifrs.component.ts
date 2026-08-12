import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { IfrsApiService } from '../../../core/ifrs/ifrs-api.service';
import {
  BusinessSegmentResponse,
  CURRENCIES,
  HORIZONS,
  INTEGRATION_LEVELS,
  IfrsS1DisclosureResponse,
  IfrsS2Response,
  REVIEW_FREQUENCIES,
  RO_TYPES,
  S1ItemResponse,
} from '../../../core/ifrs/ifrs.model';
import { UiService } from '../../../core/ui.service';
import { toApiError } from '../../../core/http/api-error';

type FieldKind = 'textarea' | 'select' | 'number' | 'boolean';

interface Field {
  key: string;
  label: string;
  hint?: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
}

const FREQ = REVIEW_FREQUENCIES.map((o) => ({ value: o.value as string, label: o.label }));
const INTEG = INTEGRATION_LEVELS.map((o) => ({ value: o.value as string, label: o.label }));
const CCY = CURRENCIES.map((c) => ({ value: c as string, label: c }));

/** IFRS S1 — general sustainability-related disclosures. */
const S1_FIELDS: Field[] = [
  { key: 'oversightDescription', label: 'Governance oversight', hint: 'How the board oversees sustainability risks and opportunities.', kind: 'textarea' },
  { key: 'reviewFrequency', label: 'Review frequency', kind: 'select', options: FREQ },
  { key: 'responsibleCommittee', label: 'Responsible committee', kind: 'textarea' },
  { key: 'identificationProcess', label: 'Identification process', hint: 'How sustainability risks and opportunities are identified and assessed.', kind: 'textarea' },
  { key: 'integrationLevel', label: 'Integration into risk management', kind: 'select', options: INTEG },
  { key: 'trackedMetrics', label: 'Metrics tracked', kind: 'textarea' },
  { key: 'targetsSummary', label: 'Targets summary', kind: 'textarea' },
  { key: 'connectedInformation', label: 'Connected information', hint: 'Links between sustainability data and the financial statements.', kind: 'textarea' },
];

/** IFRS S2 — climate-related disclosures. */
const S2_FIELDS: Field[] = [
  { key: 'oversightDescription', label: 'Governance oversight', kind: 'textarea' },
  { key: 'reviewFrequency', label: 'Review frequency', kind: 'select', options: FREQ },
  { key: 'responsibleCommittee', label: 'Responsible committee', kind: 'textarea' },
  { key: 'executiveRemunerationLinked', label: 'Executive pay linked to climate targets', kind: 'boolean' },
  { key: 'executiveRemunerationDescription', label: 'How remuneration is linked', kind: 'textarea' },
  { key: 'physicalRisks', label: 'Physical risks', hint: 'Acute and chronic climate risks to operations and assets.', kind: 'textarea' },
  { key: 'transitionPlan', label: 'Transition plan', kind: 'textarea' },
  { key: 'climateResilience', label: 'Climate resilience', hint: 'Scenario analysis and the resilience of your strategy.', kind: 'textarea' },
  { key: 'identificationProcess', label: 'Identification process', kind: 'textarea' },
  { key: 'integrationLevel', label: 'Integration into risk management', kind: 'select', options: INTEG },
  { key: 'trackedMetrics', label: 'Metrics tracked', kind: 'textarea' },
  { key: 'reductionTargets', label: 'Reduction targets', kind: 'textarea' },
  { key: 'transitionRiskAssetPct', label: 'Assets exposed to transition risk (%)', kind: 'number' },
  { key: 'physicalRiskAssetPct', label: 'Assets exposed to physical risk (%)', kind: 'number' },
  { key: 'climateOpportunityAssetPct', label: 'Assets aligned to climate opportunity (%)', kind: 'number' },
  { key: 'climateCapex', label: 'Climate capital expenditure', kind: 'number' },
  { key: 'climateCapexCurrency', label: 'Capex currency', kind: 'select', options: CCY },
  { key: 'carbonPricing', label: 'Internal carbon pricing', hint: 'How an internal carbon price is applied, if at all.', kind: 'textarea' },
  { key: 'carbonPriceValue', label: 'Internal carbon price', kind: 'number' },
  { key: 'carbonPriceCurrency', label: 'Carbon price currency', kind: 'select', options: CCY },
];

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:22px;margin-bottom:16px;';
const INPUT = 'height:38px;border-radius:9px;border:1px solid #E5E8E1;padding:0 11px;font-family:inherit;font-size:13.5px;background:#fff;width:100%;';
const AREA = 'border-radius:9px;border:1px solid #E5E8E1;padding:9px 11px;font-family:inherit;font-size:13.5px;background:#fff;width:100%;min-height:64px;resize:vertical;';
const BTN = 'height:38px;padding:0 16px;border-radius:9px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:13px;font-family:inherit;';

@Component({
  selector: 'app-ifrs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;max-width:920px;">
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 4px;letter-spacing:-.5px;">IFRS disclosures</h1>
      <p style="color:#64726B;margin:0 0 20px;font-size:14px;">S1 general sustainability and S2 climate disclosures, plus the risks and opportunities behind them.</p>

      <div class="glass" style="display:inline-flex;align-items:center;gap:2px;border-radius:11px;padding:4px;margin-bottom:20px;">
        <button *ngFor="let t of tabs" (click)="tab.set(t.key)" style="border:none;cursor:pointer;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:600;font-family:inherit;"
          [style.background]="tab() === t.key ? '#4C96B3' : 'transparent'" [style.color]="tab() === t.key ? '#fff' : '#64726B'">{{ t.label }}</button>
      </div>

      <div *ngIf="planBlocked()" style="background:#FFF8E6;border:1px solid #F0DCA8;border-radius:14px;padding:20px;">
        <div style="font-weight:600;font-size:14px;margin-bottom:5px;">IFRS disclosures need the Issuer Ready plan</div>
        <div style="font-size:13px;color:#7A6A3A;line-height:1.5;">S1 and S2 reporting is part of the issuer module.</div>
      </div>

      <div *ngIf="error() && !planBlocked()" style="background:#FBEAE7;border:1px solid #F0C4BC;color:#8C3A2E;border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;">{{ error() }}</div>

      <ng-container *ngIf="!planBlocked()">
        <!-- S1 / S2 narrative forms share one renderer -->
        <div *ngIf="tab() !== 'segments'" [style]="card">
          <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:16px;">{{ tab() === 's1' ? 'IFRS S1 · GENERAL REQUIREMENTS' : 'IFRS S2 · CLIMATE' }}</div>

          <div *ngFor="let f of fields()" style="margin-bottom:16px;">
            <label style="font-size:12.5px;font-weight:600;color:#33413A;display:block;margin-bottom:5px;">{{ f.label }}</label>
            <div *ngIf="f.hint" style="font-size:12px;color:#8A968F;margin-bottom:6px;">{{ f.hint }}</div>

            <textarea *ngIf="f.kind === 'textarea'" [value]="strValue(f.key)" (blur)="setField(f.key, $any($event.target).value)" [style]="area"></textarea>

            <select *ngIf="f.kind === 'select'" (change)="setField(f.key, $any($event.target).value)" [style]="input">
              <option value="" [selected]="!strValue(f.key)">Not set</option>
              <option *ngFor="let o of f.options" [value]="o.value" [selected]="o.value === strValue(f.key)">{{ o.label }}</option>
            </select>

            <input *ngIf="f.kind === 'number'" [value]="strValue(f.key)" (blur)="setField(f.key, $any($event.target).value)" inputmode="decimal" [style]="input">

            <select *ngIf="f.kind === 'boolean'" (change)="setField(f.key, $any($event.target).value)" [style]="input">
              <option value="" [selected]="boolValue(f.key) === null">Not set</option>
              <option value="true" [selected]="boolValue(f.key) === true">Yes</option>
              <option value="false" [selected]="boolValue(f.key) === false">No</option>
            </select>
          </div>

          <button (click)="save()" [style]="btn" [disabled]="busy()">{{ busy() ? 'Saving…' : 'Save ' + (tab() === 's1' ? 'S1' : 'S2') }}</button>
        </div>

        <!-- segments + risks/opportunities -->
        <ng-container *ngIf="tab() === 'segments'">
          <div [style]="card">
            <div style="font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;">ADD BUSINESS SEGMENT</div>
            <div style="display:flex;gap:10px;">
              <input #segName placeholder="e.g. Manufacturing" [style]="input" style="flex:1;">
              <button (click)="addSegment(segName.value); segName.value = ''" [style]="btn" [disabled]="busy()">Add segment</button>
            </div>
          </div>

          <!-- data-segment gives tests a stable handle: every company is seeded with four
               default segments, so "the first card" is never the one under test. -->
          <div *ngFor="let s of segments()" [attr.data-segment]="s.name" [style]="card">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
              <div style="flex:1;font-size:15px;font-weight:600;">{{ s.name }}</div>
              <button (click)="removeSegment(s)" style="height:32px;padding:0 11px;border-radius:9px;border:1px solid #F0C4BC;background:#fff;color:#8C3A2E;cursor:pointer;font-size:12.5px;font-family:inherit;">Delete segment</button>
            </div>

            <div *ngFor="let it of s.items" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #F2F4F0;">
              <span style="font-size:11px;font-weight:600;padding:3px 9px;border-radius:10px;"
                [style.background]="it.type === 'RISK' ? '#FBEAE7' : '#E4EEF0'"
                [style.color]="it.type === 'RISK' ? '#8C3A2E' : '#4C96B3'">{{ it.type === 'RISK' ? 'Risk' : 'Opportunity' }}</span>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13.5px;font-weight:600;">{{ it.title }}</div>
                <div style="font-size:12px;color:#8A968F;">{{ horizonLabel(it.horizon) }}<span *ngIf="it.financialImpact != null"> · {{ it.currency }} {{ it.financialImpact }}</span></div>
              </div>
              <button (click)="removeItem(it)" style="height:30px;padding:0 10px;border-radius:8px;border:1px solid #E5E8E1;background:#fff;cursor:pointer;font-size:12px;font-family:inherit;">Remove</button>
            </div>
            <div *ngIf="!s.items.length" style="color:#8A968F;font-size:13px;padding:6px 0;">No risks or opportunities recorded.</div>

            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:14px;">
              <input #itTitle placeholder="Title" [style]="input" style="flex:2;min-width:150px;">
              <select #itType [style]="input" style="flex:1;min-width:110px;">
                <option *ngFor="let o of roTypes" [value]="o.value">{{ o.label }}</option>
              </select>
              <select #itHorizon [style]="input" style="flex:1;min-width:120px;">
                <option *ngFor="let o of horizons" [value]="o.value">{{ o.label }}</option>
              </select>
              <input #itImpact placeholder="Impact" inputmode="decimal" [style]="input" style="flex:1;min-width:100px;">
              <select #itCcy [style]="input" style="width:90px;">
                <option *ngFor="let c of currencies" [value]="c">{{ c }}</option>
              </select>
              <button (click)="addItem(s, itTitle.value, itType.value, itHorizon.value, itImpact.value, itCcy.value); itTitle.value = ''; itImpact.value = ''" [style]="btn">Add</button>
            </div>
          </div>

          <div *ngIf="!segments().length" style="color:#8A968F;font-size:13.5px;">No business segments yet.</div>
        </ng-container>
      </ng-container>
    </div>
  `,
})
export class IfrsComponent implements OnInit {
  private api = inject(IfrsApiService);
  private ui = inject(UiService);

  card = CARD;
  input = INPUT;
  area = AREA;
  btn = BTN;
  roTypes = RO_TYPES;
  horizons = HORIZONS;
  currencies = CURRENCIES;

  tabs = [
    { key: 's1', label: 'IFRS S1' },
    { key: 's2', label: 'IFRS S2' },
    { key: 'segments', label: 'Risks & opportunities' },
  ];

  tab = signal<string>('s1');
  s1 = signal<IfrsS1DisclosureResponse | null>(null);
  s2 = signal<IfrsS2Response | null>(null);
  segments = signal<BusinessSegmentResponse[]>([]);
  busy = signal(false);
  error = signal('');
  planBlocked = signal(false);

  fields = computed<Field[]>(() => (this.tab() === 's1' ? S1_FIELDS : S2_FIELDS));

  private current = computed<Record<string, unknown> | null>(() =>
    this.tab() === 's1'
      ? (this.s1() as unknown as Record<string, unknown> | null)
      : (this.s2() as unknown as Record<string, unknown> | null),
  );

  ngOnInit(): void {
    this.api.getS1().subscribe({
      next: (d) => this.s1.set(d),
      error: (err) => this.handle(err),
    });
    this.api.getS2().subscribe({ next: (d) => this.s2.set(d), error: () => {} });
    this.loadSegments();
  }

  private handle(err: unknown) {
    const e = toApiError(err as never);
    if (e.status === 403) this.planBlocked.set(true);
    else this.error.set(e.message);
  }

  private loadSegments() {
    this.api.listSegments().subscribe({ next: (s) => this.segments.set(s), error: () => {} });
  }

  horizonLabel(h: string): string {
    return HORIZONS.find((x) => x.value === h)?.label ?? h;
  }

  strValue(key: string): string {
    const v = this.current()?.[key];
    return v == null ? '' : String(v);
  }

  boolValue(key: string): boolean | null {
    const v = this.current()?.[key];
    return v == null ? null : Boolean(v);
  }

  /** Writes into the in-memory record; persisted by the Save button. */
  setField(key: string, raw: string) {
    const field = this.fields().find((f) => f.key === key);
    let value: unknown = raw === '' ? null : raw;
    if (field?.kind === 'number' && raw !== '') {
      const n = Number(raw);
      value = Number.isNaN(n) ? null : n;
    }
    if (field?.kind === 'boolean') value = raw === '' ? null : raw === 'true';

    if (this.tab() === 's1') this.s1.update((d) => (d ? ({ ...d, [key]: value } as IfrsS1DisclosureResponse) : d));
    else this.s2.update((d) => (d ? ({ ...d, [key]: value } as IfrsS2Response) : d));
  }

  save() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    const done = (label: string) => {
      this.busy.set(false);
      this.ui.showToast(`${label} saved.`);
    };
    const fail = (err: unknown) => {
      this.busy.set(false);
      this.handle(err);
    };

    if (this.tab() === 's1') {
      const body = this.s1();
      if (!body) return this.busy.set(false);
      this.api.updateS1(body).subscribe({ next: (d) => { this.s1.set(d); done('IFRS S1'); }, error: fail });
    } else {
      const body = this.s2();
      if (!body) return this.busy.set(false);
      this.api.updateS2(body).subscribe({ next: (d) => { this.s2.set(d); done('IFRS S2'); }, error: fail });
    }
  }

  addSegment(name: string) {
    if (!name.trim() || this.busy()) return;
    this.busy.set(true);
    this.api.createSegment(name.trim()).subscribe({
      next: () => {
        this.busy.set(false);
        this.loadSegments();
      },
      error: (err) => {
        this.busy.set(false);
        this.handle(err);
      },
    });
  }

  removeSegment(s: BusinessSegmentResponse) {
    this.api.deleteSegment(s.id).subscribe({ next: () => this.loadSegments(), error: (e) => this.handle(e) });
  }

  addItem(s: BusinessSegmentResponse, title: string, type: string, horizon: string, impact: string, ccy: string) {
    if (!title.trim()) return;
    const n = Number(impact);
    this.api
      .addItem(s.id, {
        title: title.trim(),
        type: type as S1ItemResponse['type'],
        horizon: horizon as S1ItemResponse['horizon'],
        financialImpact: impact.trim() === '' || Number.isNaN(n) ? null : n,
        currency: ccy as S1ItemResponse['currency'],
      })
      .subscribe({ next: () => this.loadSegments(), error: (e) => this.handle(e) });
  }

  removeItem(it: S1ItemResponse) {
    this.api.deleteItem(it.id).subscribe({ next: () => this.loadSegments(), error: (e) => this.handle(e) });
  }
}
