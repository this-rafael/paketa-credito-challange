import {
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MenuStore } from '../../../../core/state/menu.store';

@Component({
  selector: 'app-visual-map',
  standalone: true,
  template: `
    <div
      class="map"
      #viewport
      (wheel)="onWheel($event)"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp()"
      (pointerleave)="onPointerUp()"
    >
      @if (store.layout().nodes.length === 0) {
        <p class="empty">Nenhum item para exibir no mapa.</p>
      } @else {
        <svg
          class="map__svg"
          [attr.width]="store.layout().width"
          [attr.height]="store.layout().height"
          [style.transform]="transform()"
        >
          @for (edge of store.layout().edges; track edge.id) {
            <path
              class="edge"
              [attr.d]="edgePath(edge.x1, edge.y1, edge.x2, edge.y2)"
            />
          }
          @for (node of store.layout().nodes; track node.id) {
            <g
              class="node"
              [class.selected]="store.selectedId() === node.id"
              [attr.transform]="'translate(' + node.x + ' ' + node.y + ')'"
              (click)="store.select(node.id)"
            >
              <rect
                [attr.width]="node.width"
                [attr.height]="node.height"
                rx="12"
                ry="12"
              />
              <text x="14" y="24" class="title">{{ node.name }}</text>
              <text x="14" y="42" class="meta">
                id {{ node.id }} · {{ node.childCount }} filho(s)
              </text>
            </g>
          }
        </svg>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-height: 280px;
      }

      .map {
        position: relative;
        overflow: hidden;
        height: 100%;
        min-height: 280px;
        border-radius: var(--radius-sm);
        background:
          radial-gradient(circle at 20% 20%, oklch(35% 0.05 280 / 0.25), transparent 45%),
          oklch(18% 0.03 275 / 0.55);
        cursor: grab;
        touch-action: none;
      }

      .map:active {
        cursor: grabbing;
      }

      .empty {
        margin: 1rem;
        color: var(--muted-foreground);
      }

      .map__svg {
        transform-origin: 0 0;
      }

      .edge {
        fill: none;
        stroke: oklch(72% 0.09 275 / 0.45);
        stroke-width: 2;
      }

      .node rect {
        fill: oklch(24% 0.035 275 / 0.9);
        stroke: var(--border);
        stroke-width: 1.5;
      }

      .node.selected rect {
        stroke: var(--neon-green);
        filter: drop-shadow(0 0 10px oklch(79% 0.18 155 / 0.35));
      }

      .node {
        cursor: pointer;
      }

      .title {
        fill: var(--foreground);
        font-size: 13px;
        font-weight: 700;
        font-family: var(--font-sans);
      }

      .meta {
        fill: var(--muted-foreground);
        font-size: 11px;
        font-family: var(--font-sans);
      }
    `,
  ],
})
export class VisualMapComponent {
  readonly store = inject(MenuStore);
  private readonly viewport = viewChild<ElementRef<HTMLDivElement>>('viewport');

  private readonly scale = signal(1);
  private readonly offsetX = signal(0);
  private readonly offsetY = signal(0);
  private dragging = false;
  private lastX = 0;
  private lastY = 0;

  readonly transform = computed(
    () =>
      `translate(${this.offsetX()}px, ${this.offsetY()}px) scale(${this.scale()})`,
  );

  edgePath(x1: number, y1: number, x2: number, y2: number): string {
    const midY = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const next = Math.min(2.2, Math.max(0.4, this.scale() * delta));
    this.scale.set(next);
  }

  onPointerDown(event: PointerEvent): void {
    if ((event.target as HTMLElement).closest('.node')) return;
    this.dragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.viewport()?.nativeElement.setPointerCapture?.(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.offsetX.update((v) => v + dx);
    this.offsetY.update((v) => v + dy);
  }

  onPointerUp(): void {
    this.dragging = false;
  }
}
