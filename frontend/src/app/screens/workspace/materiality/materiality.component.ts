import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MaterialityApiService } from '../../../core/esg/esg-api.service';
import {
  AssessmentDetailResponse,
  AssessmentSummaryResponse,
  ScoreInput,
  StakeholderOptionResponse,
} from '../../../core/esg/esg.model';
import { ReferenceApiService } from '../../../core/reference/reference-api.service';
import { MatterResponse } from '../../../core/reference/reference.model';
import { SessionService } from '../../../core/auth/session.service';
import { UiService } from '../../../core/ui.service';
import { toApiError } from '../../../core/http/api-error';

const CARD = 'background:#fff;border:1px solid #E9ECE6;border-radius:16px;padding:22px;margin-bottom:16px;';
const H = 'font-size:12px;font-weight:600;color:#8A968F;letter-spacing:.3px;margin-bottom:14px;';
const INPUT = 'height:38px;border-radius:9px;border:1px solid #E5E8E1;padding:0 11px;font-family:inherit;font-size:13.5px;background:#fff;';
const BTN = 'height:38px;padding:0 16px;border-radius:9px;border:none;cursor:pointer;background:#4C96B3;color:#fff;font-weight:600;font-size:13px;font-family:inherit;';

/** The app's category palette, as RGB triples so the heat scale can vary only the alpha. */
const CAT_RGB: Record<string, string> = {
  ENVIRONMENTAL: '76,150,179', // #4C96B3
  SOCIAL: '169,159,219', // #A99FDB
  GOVERNANCE: '217,107,161', // #D96BA1
};
const CAT_SOLID: Record<string, string> = {
  ENVIRONMENTAL: '#4C96B3',
  SOCIAL: '#A99FDB',
  GOVERNANCE: '#D96BA1',
};

@Component({
  selector: 'app-materiality',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="animation:vfade .3s ease both;max-width:1120px;">
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;margin:0 0 4px;letter-spacing:-.5px;">Materiality</h1>
      <p style="color:#64726B;margin:0 0 20px;font-size:14px;">Click a cell to set the score — colour depth shows intensity at a glance.</p>

      <div *ngIf="error()" style="background:#FBEAE7;border:1px solid #F0C4BC;color:#8C3A2E;border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;">{{ error() }}</div>

      <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;">
        <!-- ---------- scoring column ---------- -->
        <div style="flex:1;min-width:520px;">
          <!-- stakeholders -->
          <div [style]="card">
            <div [style]="h">STAKEHOLDER GROUPS ({{ selectedStakeholders().length }} selected)</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
              <button *ngFor="let s of stakeholders()" (click)="toggle(s)" type="button"
                [style.background]="s.selected ? '#E7F0F2' : '#fff'"
                [style.border-color]="s.selected ? '#BFD8DD' : '#E5E8E1'"
                [style.color]="s.selected ? '#4C96B3' : '#64726B'"
                style="padding:8px 14px;border-radius:20px;border-width:1.5px;border-style:solid;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit;">
                {{ s.name }}
              </button>
            </div>
            <div style="display:flex;gap:10px;">
              <input #newSh placeholder="Add a stakeholder group" [style]="input" style="flex:1;max-width:280px;">
              <button (click)="addStakeholder(newSh.value); newSh.value = ''" [style]="btn">Add</button>
            </div>
          </div>

          <!-- scoring -->
          <div [style]="card">
            <div [style]="h">SCORE MATTERS · 1–5</div>

            <div *ngIf="matters().length"
              style="display:grid;grid-template-columns:1fr auto auto;gap:2px 18px;align-items:center;font-size:10px;letter-spacing:.7px;color:#A9B3AD;font-weight:700;margin-bottom:8px;padding:0 12px;">
              <span>MATTER</span><span>IMPACT</span><span>INFLUENCE</span>
            </div>

            <div *ngFor="let m of matters()"
              style="display:grid;grid-template-columns:1fr auto auto;gap:2px 18px;align-items:center;padding:12px;margin-bottom:6px;border-radius:11px;background:#FBFCFA;border:1px solid #EFF2EC;">
              <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                <span [style.background]="solidOf(m.category)" style="width:8px;height:8px;border-radius:50%;flex-shrink:0;"></span>
                <div style="min-width:0;">
                  <div style="font-size:13.5px;font-weight:700;color:#26302B;">{{ m.name }}</div>
                  <div style="font-size:9.5px;letter-spacing:.6px;color:#A9B3AD;font-weight:700;margin-top:1px;">{{ m.category }}</div>
                </div>
              </div>
              <div style="display:flex;gap:4px;">
                <button *ngFor="let n of scale" type="button" (click)="setScore(m.id, 'impact', n)"
                  [attr.aria-label]="'Impact ' + n + ' for ' + m.name"
                  [attr.aria-pressed]="n === impactOf(m.id)"
                  [style.background]="heat(m.category, n, impactOf(m.id))"
                  style="width:22px;height:22px;border-radius:5px;border:none;padding:0;cursor:pointer;"></button>
              </div>
              <div style="display:flex;gap:4px;">
                <button *ngFor="let n of scale" type="button" (click)="setScore(m.id, 'influence', n)"
                  [attr.aria-label]="'Influence ' + n + ' for ' + m.name"
                  [attr.aria-pressed]="n === influenceOf(m.id)"
                  [style.background]="heat(m.category, n, influenceOf(m.id))"
                  style="width:22px;height:22px;border-radius:5px;border:none;padding:0;cursor:pointer;"></button>
              </div>
            </div>

            <div *ngIf="loading()" style="color:#8A968F;font-size:13.5px;">Loading matters…</div>
            <div *ngIf="!loading() && !matters().length" style="color:#8A968F;font-size:13.5px;">No applicable matters found.</div>
          </div>
        </div>

        <!-- ---------- side column ---------- -->
        <div style="width:300px;flex-shrink:0;">
          <div [style]="card">
            <div style="font-size:14px;font-weight:700;color:#26302B;margin-bottom:3px;">Create assessment</div>
            <div style="font-size:12.5px;color:#8A968F;margin-bottom:16px;line-height:1.45;">Save the current scores as a named assessment.</div>

            <div style="font-size:10px;letter-spacing:.6px;color:#A9B3AD;font-weight:700;margin-bottom:6px;">NAME</div>
            <input #name placeholder="Assessment name" [style]="input" style="width:100%;box-sizing:border-box;margin-bottom:14px;">

            <div style="font-size:10px;letter-spacing:.6px;color:#A9B3AD;font-weight:700;margin-bottom:6px;">DATE</div>
            <input #date type="date" [value]="today" [style]="input" style="width:100%;box-sizing:border-box;margin-bottom:18px;">

            <button (click)="create(name.value, date.value)" [style]="btn" [disabled]="busy() || !matters().length"
              style="width:100%;">Create assessment</button>
          </div>

          <!-- assessments -->
          <div [style]="card">
            <div [style]="h">ASSESSMENTS ({{ assessments().length }})</div>
            <div *ngFor="let a of assessments()" [attr.data-assessment]="a.name"
              style="padding:11px 0;border-bottom:1px solid #F2F4F0;">
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="flex:1;min-width:0;">
                  <div style="font-size:13.5px;font-weight:600;">{{ a.name }}</div>
                  <div style="font-size:12px;color:#8A968F;">{{ a.assessmentDate }}</div>
                </div>
                <span style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:11px;flex-shrink:0;"
                  [style.background]="a.status === 'VALIDATED' ? '#E4EEF0' : '#F3F5F1'"
                  [style.color]="a.status === 'VALIDATED' ? '#4C96B3' : '#64726B'">{{ a.status === 'VALIDATED' ? 'Validated' : 'Draft' }}</span>
              </div>
              <div style="display:flex;align-items:center;gap:12px;margin-top:8px;">
                <button *ngIf="canValidate() && a.status !== 'VALIDATED'" (click)="validate(a)" [style]="btn" style="height:30px;font-size:12px;padding:0 12px;">Validate</button>
                <a [href]="reportUrl(a)" target="_blank" style="font-size:12.5px;color:#4C96B3;font-weight:600;">PDF</a>
              </div>
            </div>
            <div *ngIf="!assessments().length" style="color:#8A968F;font-size:13.5px;">No assessments yet.</div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class MaterialityComponent implements OnInit {
  private api = inject(MaterialityApiService);
  private reference = inject(ReferenceApiService);
  private session = inject(SessionService);
  private ui = inject(UiService);

  card = CARD;
  h = H;
  input = INPUT;
  btn = BTN;
  scale = [1, 2, 3, 4, 5];
  today = new Date().toISOString().slice(0, 10);

  matters = signal<MatterResponse[]>([]);
  stakeholders = signal<StakeholderOptionResponse[]>([]);
  assessments = signal<AssessmentSummaryResponse[]>([]);
  private scores = signal<Record<string, { impact: number; influence: number }>>({});
  busy = signal(false);
  loading = signal(false);
  error = signal('');

  canValidate = computed(() => this.session.role() === 'COMPANY_ADMIN');
  selectedStakeholders = computed(() => this.stakeholders().filter((s) => s.selected));

  ngOnInit(): void {
    this.loading.set(true);
    this.reference.applicableMatters().subscribe({
      next: (m) => {
        this.matters.set(m);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(toApiError(err).message);
        this.loading.set(false);
      },
    });
    this.loadStakeholders();
    this.loadAssessments();
  }

  private loadStakeholders() {
    this.api.stakeholderOptions().subscribe({ next: (s) => this.stakeholders.set(s), error: () => {} });
  }

  private loadAssessments() {
    this.api.assessments().subscribe({ next: (a) => this.assessments.set(a), error: () => {} });
  }

  solidOf(category: string): string {
    return CAT_SOLID[category] ?? '#8A968F';
  }

  /**
   * Cells at or below the score carry the category colour, deepening with level; the rest stay
   * grey. Alpha rather than distinct colours keeps a row readable as a single strip.
   */
  heat(category: string, level: number, score: number): string {
    if (level > score) return '#ECEEF1';
    const rgb = CAT_RGB[category] ?? '138,150,143';
    return `rgba(${rgb},${(0.15 + level * 0.17).toFixed(2)})`;
  }

  impactOf(matterId: string): number {
    return this.scores()[matterId]?.impact ?? 3;
  }

  influenceOf(matterId: string): number {
    return this.scores()[matterId]?.influence ?? 3;
  }

  setScore(matterId: string, key: 'impact' | 'influence', value: number) {
    this.scores.update((s) => ({
      ...s,
      [matterId]: {
        impact: key === 'impact' ? value : (s[matterId]?.impact ?? 3),
        influence: key === 'influence' ? value : (s[matterId]?.influence ?? 3),
      },
    }));
  }

  toggle(s: StakeholderOptionResponse) {
    this.api.toggleStakeholder(s.id, !s.selected).subscribe({
      next: () => this.loadStakeholders(),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  addStakeholder(name: string) {
    if (!name.trim()) return;
    this.api.addStakeholder(name.trim()).subscribe({
      next: () => this.loadStakeholders(),
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  create(name: string, date: string) {
    if (!name.trim() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');

    // Every applicable matter is submitted; unscored ones default to the middle of the scale.
    const scores: ScoreInput[] = this.matters().map((m) => ({
      matterId: m.id,
      impact: this.impactOf(m.id),
      influence: this.influenceOf(m.id),
    }));

    this.api
      .createAssessment(name.trim(), date || this.today, scores, this.selectedStakeholders().map((s) => s.name))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.ui.showToast('Assessment created.');
          this.loadAssessments();
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(toApiError(err).message);
        },
      });
  }

  validate(a: AssessmentSummaryResponse) {
    this.api.validate(a.id).subscribe({
      next: () => {
        this.ui.showToast(`${a.name} validated.`);
        this.loadAssessments();
      },
      error: (err) => this.error.set(toApiError(err).message),
    });
  }

  reportUrl(a: AssessmentSummaryResponse | AssessmentDetailResponse): string {
    return this.api.reportUrl(a.id);
  }
}
