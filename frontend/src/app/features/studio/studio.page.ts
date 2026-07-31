import { Component, inject, OnInit, signal } from '@angular/core';
import { MenuStore } from '../../core/state/menu.store';
import { CreateItemDialogComponent } from './components/create-item-dialog/create-item-dialog.component';
import { HttpConsoleComponent } from './components/http-console/http-console.component';
import { ItemDetailComponent } from './components/item-detail/item-detail.component';
import { MenuTreeComponent } from './components/menu-tree/menu-tree.component';
import { StatsStripComponent } from './components/stats-strip/stats-strip.component';
import { StudioHeaderComponent } from './components/studio-header/studio-header.component';
import { VisualMapComponent } from './components/visual-map/visual-map.component';
import { UiGlassPanelComponent } from '../../shared/ui/glass-panel/glass-panel.component';
import { UiButtonComponent } from '../../shared/ui/button/button.component';

@Component({
  selector: 'app-studio-page',
  standalone: true,
  imports: [
    StudioHeaderComponent,
    StatsStripComponent,
    MenuTreeComponent,
    VisualMapComponent,
    ItemDetailComponent,
    HttpConsoleComponent,
    CreateItemDialogComponent,
    UiGlassPanelComponent,
    UiButtonComponent,
  ],
  template: `
    <div class="studio">
      <app-studio-header (createRequested)="openCreate(null)" />
      <app-stats-strip />

      @if (store.error(); as err) {
        <div class="banner">
          <span>{{ err }}</span>
          <ui-button size="sm" variant="ghost" (pressed)="store.load()">Tentar de novo</ui-button>
        </div>
      }

      <div class="main">
        <ui-glass-panel class="main__left">
          <div class="panel">
            @if (store.viewMode() === 'tree') {
              <app-menu-tree (addChildRequested)="openCreate($event)" />
            } @else {
              <app-visual-map />
            }
          </div>
        </ui-glass-panel>

        <app-item-detail (addChildRequested)="openCreate($event)" />
      </div>

      <app-http-console />

      <app-create-item-dialog
        [open]="createOpen()"
        [presetParentId]="createParentId()"
        (closed)="createOpen.set(false)"
      />
    </div>
  `,
  styles: [
    `
      .studio {
        max-width: 1280px;
        margin: 0 auto;
        padding: 1.1rem;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        min-height: 100vh;
      }

      .main {
        display: grid;
        grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.8fr);
        gap: 0.85rem;
        min-height: 320px;
      }

      .panel {
        padding: 0.85rem;
        min-height: 300px;
        height: 100%;
      }

      .banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.7rem 0.9rem;
        border-radius: var(--radius-sm);
        border: 1px solid oklch(68% 0.21 20 / 0.45);
        background: oklch(30% 0.08 20 / 0.25);
        color: oklch(90% 0.05 20);
      }

      @media (max-width: 900px) {
        .main {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class StudioPageComponent implements OnInit {
  readonly store = inject(MenuStore);
  readonly createOpen = signal(false);
  readonly createParentId = signal<string | null>(null);

  ngOnInit(): void {
    void this.store.load();
  }

  openCreate(parentId: string | null): void {
    this.createParentId.set(parentId);
    this.createOpen.set(true);
  }
}
