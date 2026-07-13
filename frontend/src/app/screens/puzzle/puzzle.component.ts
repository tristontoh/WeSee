import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

interface Tile {
  slot: number;
  x: string;
  y: string;
  bg: string;
  pos: string;
  cursor: string;
}

const MAX_MOVES = 13;
const START_TIME = 30;

@Component({
  selector: 'app-puzzle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="min-height:100vh;width:100%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 20px;gap:20px;font-family:'Nunito',system-ui,sans-serif;color:#2A2A2A;-webkit-font-smoothing:antialiased;">

      <div style="text-align:center;max-width:440px;">
        <div style="display:inline-flex;align-items:center;gap:8px;background:#FFF6CC;border:2px solid #F2D64B;color:#8A6D00;font-weight:700;font-size:12px;letter-spacing:.5px;text-transform:uppercase;padding:6px 14px;border-radius:999px;margin-bottom:14px;">🐝 Bee Challenge</div>
        <h1 style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:40px;margin:0 0 8px;color:#1F1F1F;letter-spacing:-.5px;">Sliding Puzzle</h1>
        <p style="margin:0;font-size:15px;color:#6B6B6B;line-height:1.5;">Play to win a <b style="color:#1F1F1F;">FREE 1-month subscription</b>. Good luck!</p>
      </div>

      <div style="display:flex;gap:14px;align-items:stretch;">
        <div style="background:#F7F7F5;border:2px solid #ECECE8;border-radius:16px;padding:12px 22px;text-align:center;min-width:110px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#9A9A96;margin-bottom:2px;">Moves left</div>
          <div style="font-family:'Fredoka',sans-serif;font-size:30px;font-weight:600;" [style.color]="movesColor()">{{ movesLeft() }}</div>
        </div>
        <div style="background:#F7F7F5;border:2px solid #ECECE8;border-radius:16px;padding:12px 22px;text-align:center;min-width:110px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#9A9A96;margin-bottom:2px;">Time</div>
          <div style="font-family:'Fredoka',sans-serif;font-size:30px;font-weight:600;" [style.color]="timeColor()">{{ timeLeft() }}s</div>
        </div>
      </div>

      <div style="position:relative;width:312px;height:312px;background:#111;border-radius:18px;padding:6px;box-shadow:0 18px 40px rgba(0,0,0,.18);">
        <div style="position:relative;width:300px;height:300px;border-radius:12px;overflow:hidden;background:#F2D64B;">
          <div *ngFor="let t of tiles()" (click)="slide(t.slot)" style="position:absolute;width:100px;height:100px;background-size:300% 300%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.5);transition:left .16s ease,top .16s ease;"
               [style.left]="t.x" [style.top]="t.y" [style.cursor]="t.cursor" [style.background-image]="t.bg" [style.background-position]="t.pos"></div>

          <div style="position:absolute;inset:0;background-image:url('assets/bee_puzzle.png');background-size:cover;background-position:center;pointer-events:none;transition:opacity .12s ease;" [style.opacity]="peeking() ? 1 : 0"></div>
        </div>
      </div>

      <div style="display:flex;gap:12px;">
        <button (click)="shuffle()" class="hover-yellow" style="font-family:'Nunito',sans-serif;font-weight:800;font-size:15px;border:none;background:#F2D64B;color:#3A2E00;border-radius:12px;padding:13px 26px;cursor:pointer;box-shadow:0 4px 0 #C9AE1E;transition:transform .1s ease;">Shuffle</button>
        <button (mousedown)="peekOn()" (mouseup)="peekOff()" (mouseleave)="peekOff()" (touchstart)="peekOn()" (touchend)="peekOff()" class="hover-peek" style="font-family:'Nunito',sans-serif;font-weight:800;font-size:15px;border:2px solid #E4E4E0;background:#fff;color:#4A4A4A;border-radius:12px;padding:13px 26px;cursor:pointer;user-select:none;transition:background .1s ease;">Hold to peek</button>
      </div>

      <div style="font-size:12.5px;color:#B0B0AC;max-width:360px;text-align:center;">Tap a tile next to the empty space to slide it.</div>

      <!-- LOSE POPUP -->
      <div *ngIf="over()" style="position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(20,18,8,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);">
        <div style="position:relative;background:#fff;border-radius:22px;padding:34px 32px 28px;width:340px;text-align:center;box-shadow:0 30px 70px rgba(0,0,0,.35);animation:puzzlePopIn .3s cubic-bezier(.2,1.2,.4,1) both;">
          <button (click)="dismiss()" aria-label="Close" class="hover-close" style="position:absolute;top:14px;right:14px;width:30px;height:30px;border:none;border-radius:50%;background:#F3F3F0;color:#8A8A86;font-size:16px;font-weight:700;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
          <div style="font-size:56px;line-height:1;margin-bottom:8px;animation:puzzleBuzz .5s ease-in-out infinite;">🐝</div>
          <div style="font-family:'Fredoka',sans-serif;font-size:30px;font-weight:600;color:#1F1F1F;margin-bottom:6px;">Yeah… you wish</div>
          <p style="margin:0 0 22px;font-size:14.5px;color:#6B6B6B;line-height:1.5;">{{ loseReason() }} No free month for you.</p>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <button (click)="shuffle()" class="hover-yellow" style="font-family:'Nunito',sans-serif;font-weight:800;font-size:15px;border:none;background:#F2D64B;color:#3A2E00;border-radius:12px;padding:13px 28px;cursor:pointer;box-shadow:0 4px 0 #C9AE1E;width:100%;">Try again</button>
            <button (click)="seeBilling()" class="hover-peek" style="font-family:'Nunito',sans-serif;font-weight:800;font-size:15px;border:2px solid #E4E4E0;background:#fff;color:#4A4A4A;border-radius:12px;padding:12px 28px;cursor:pointer;width:100%;">See our billing plans</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @keyframes puzzlePopIn { 0% { opacity: 0; transform: scale(0.8) translateY(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
      @keyframes puzzleBuzz { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-2deg); } 75% { transform: rotate(2deg); } }
      .hover-yellow:active { transform: translateY(2px); box-shadow: 0 2px 0 #c9ae1e; }
      .hover-peek:active { background: #f3f3f0; }
      .hover-close:hover { background: #e7e7e2; color: #4a4a4a; }
    `,
  ],
})
export class PuzzleComponent implements OnDestroy {
  private router = inject(Router);
  private timer: ReturnType<typeof setInterval> | null = null;

  board = signal<number[]>([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  moves = signal(0);
  timeLeft = signal(START_TIME);
  running = signal(false);
  over = signal(false);
  loseReason = signal('');
  peeking = signal(false);

  movesLeft = computed(() => Math.max(0, MAX_MOVES - this.moves()));
  movesColor = computed(() => (this.movesLeft() <= 2 ? '#E24A4A' : '#1F1F1F'));
  timeColor = computed(() => (this.timeLeft() <= 5 ? '#E24A4A' : '#1F1F1F'));

  tiles = computed<Tile[]>(() =>
    this.board().map((piece, slot) => {
      const sc = slot % 3;
      const sr = Math.floor(slot / 3);
      const pc = piece % 3;
      const pr = Math.floor(piece / 3);
      const isEmpty = piece === 8;
      return {
        slot,
        x: sc * 100 + 'px',
        y: sr * 100 + 'px',
        bg: isEmpty ? 'none' : "url('assets/bee_puzzle.png')",
        pos: pc * 50 + '% ' + pr * 50 + '%',
        cursor: isEmpty ? 'default' : 'pointer',
      };
    }),
  );

  constructor() {
    this.shuffle();
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private makeBoard(): number[] {
    const p = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (let i = p.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    const arr = p.filter((x) => x !== 8);
    let inv = 0;
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) if (arr[i] > arr[j]) inv++;
    // solvable iff inversions even -> force ODD so it can never be solved
    if (inv % 2 === 0) {
      const a = p.indexOf(0);
      const b = p.indexOf(1);
      [p[a], p[b]] = [p[b], p[a]];
    }
    return p;
  }

  shuffle() {
    if (this.timer) clearInterval(this.timer);
    this.board.set(this.makeBoard());
    this.moves.set(0);
    this.timeLeft.set(START_TIME);
    this.running.set(true);
    this.over.set(false);
    this.loseReason.set('');
    this.peeking.set(false);
    this.timer = setInterval(() => this.tick(), 1000);
  }

  private tick() {
    if (!this.running()) return;
    const t = this.timeLeft() - 1;
    if (t <= 0) {
      if (this.timer) clearInterval(this.timer);
      this.timeLeft.set(0);
      this.running.set(false);
      this.over.set(true);
      this.loseReason.set("Time's up.");
      return;
    }
    this.timeLeft.set(t);
  }

  slide(slot: number) {
    if (!this.running() || this.over()) return;
    const board = this.board();
    const empty = board.indexOf(8);
    const r1 = Math.floor(slot / 3);
    const c1 = slot % 3;
    const r2 = Math.floor(empty / 3);
    const c2 = empty % 3;
    const adj = Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
    if (!adj) return;
    const next = board.slice();
    [next[slot], next[empty]] = [next[empty], next[slot]];
    this.board.set(next);
    const moves = this.moves() + 1;
    this.moves.set(moves);
    // never a win check — the board is unsolvable by construction
    if (moves >= MAX_MOVES) {
      if (this.timer) clearInterval(this.timer);
      this.running.set(false);
      this.over.set(true);
      this.loseReason.set('Out of moves.');
    }
  }

  dismiss() {
    if (this.timer) clearInterval(this.timer);
    this.over.set(false);
    this.running.set(false);
  }

  seeBilling() {
    this.router.navigateByUrl('/settings?view=billing');
  }

  peekOn() {
    this.peeking.set(true);
  }

  peekOff() {
    this.peeking.set(false);
  }
}
