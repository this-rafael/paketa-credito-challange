import { DatePipe, JsonPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  MethodFilter,
  StatusFilter,
} from '../../../../core/models/http-console';
import { HttpConsoleStore } from '../../../../core/state/http-console.store';
import { UiBadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { UiButtonComponent } from '../../../../shared/ui/button/button.component';
import { UiGlassPanelComponent } from '../../../../shared/ui/glass-panel/glass-panel.component';

@Component({
  selector: 'app-http-console',
  standalone: true,
  imports: [DatePipe, JsonPipe, UiGlassPanelComponent, UiBadgeComponent, UiButtonComponent],
  template: `
    <ui-glass-panel>
      <div class="console">
        <header>
          <div class="title">
            <h2>HTTP Console</h2>
            <ui-badge tone="green">{{ store.requestCount() }} req</ui-badge>
          </div>
          <div class="filters">
            @for (method of methods; track method) {
              <button
                type="button"
                [class.active]="store.methodFilter() === method"
                (click)="store.setMethodFilter(method)"
              >
                {{ method }}
              </button>
            }
            <span class="sep"></span>
            @for (status of statuses; track status) {
              <button
                type="button"
                [class.active]="store.statusFilter() === status"
                (click)="store.setStatusFilter(status)"
              >
                {{ status }}
              </button>
            }
            <ui-button size="sm" variant="ghost" (pressed)="store.clear()">Limpar</ui-button>
          </div>
        </header>

        <div class="body">
          <aside class="list">
            @if (store.filteredEntries().length === 0) {
              <p class="empty">Nenhuma requisição ainda.</p>
            } @else {
              @for (entry of store.filteredEntries(); track entry.id) {
                <button
                  type="button"
                  class="entry"
                  [class.active]="store.selectedId() === entry.id"
                  (click)="store.select(entry.id)"
                >
                  <div class="entry__top">
                    <ui-badge [tone]="methodTone(entry.method)">{{ entry.method }}</ui-badge>
                    <span class="url">{{ entry.url }}</span>
                  </div>
                  <div class="entry__meta">
                    <span>{{ entry.timestamp | date: 'HH:mm:ss' }}</span>
                    <span [class.ok]="isOk(entry.status)" [class.err]="!isOk(entry.status)">
                      {{ entry.status ?? '—' }} {{ entry.statusText }}
                    </span>
                    <span>{{ entry.durationMs }} ms</span>
                  </div>
                  <small>{{ entry.operation }}</small>
                </button>
              }
            }
          </aside>

          <section class="detail">
            <div class="tabs">
              @for (tab of tabs; track tab) {
                <button
                  type="button"
                  [class.active]="activeTab() === tab"
                  (click)="activeTab.set(tab)"
                >
                  {{ tab }}
                </button>
              }
            </div>

            @if (store.selectedEntry(); as entry) {
              @switch (activeTab()) {
                @case ('Overview') {
                  <dl class="overview">
                    <div><dt>Método</dt><dd>{{ entry.method }}</dd></div>
                    <div><dt>Status</dt><dd>{{ entry.status }} {{ entry.statusText }}</dd></div>
                    <div><dt>Duração</dt><dd>{{ entry.durationMs }} ms</dd></div>
                    <div><dt>Timestamp</dt><dd>{{ entry.timestamp | date: 'dd/MM/yyyy, HH:mm:ss' }}</dd></div>
                    <div><dt>Operação</dt><dd>{{ entry.operation }}</dd></div>
                    <div><dt>URL</dt><dd class="mono">{{ entry.url }}</dd></div>
                    @if (entry.errorMessage) {
                      <div><dt>Erro</dt><dd class="err">{{ entry.errorMessage }}</dd></div>
                    }
                  </dl>
                }
                @case ('Headers') {
                  <pre>{{ entry.requestHeaders | json }}</pre>
                  <h3>Response</h3>
                  <pre>{{ entry.responseHeaders | json }}</pre>
                }
                @case ('Body') {
                  <pre>{{ entry.requestBody | json }}</pre>
                }
                @case ('Response') {
                  <pre>{{ entry.responseBody | json }}</pre>
                }
              }
            } @else {
              <p class="empty">Selecione uma requisição.</p>
            }
          </section>
        </div>
      </div>
    </ui-glass-panel>
  `,
  styles: [
    `
      .console {
        padding: 0.9rem 1rem 1rem;
      }

      header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }

      .title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .title h2 {
        margin: 0;
        font-size: 0.95rem;
      }

      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
        align-items: center;
      }

      .filters button {
        border: 1px solid var(--border);
        background: transparent;
        color: var(--muted-foreground);
        border-radius: 999px;
        padding: 0.2rem 0.55rem;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
      }

      .filters button.active {
        color: var(--neon-green);
        border-color: oklch(79% 0.18 155 / 0.45);
        background: oklch(30% 0.08 155 / 0.2);
      }

      .sep {
        width: 1px;
        height: 1rem;
        background: var(--border);
        margin: 0 0.2rem;
      }

      .body {
        display: grid;
        grid-template-columns: minmax(240px, 0.9fr) 1.2fr;
        gap: 0.75rem;
        min-height: 220px;
      }

      .list {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        max-height: 280px;
        overflow: auto;
      }

      .entry {
        text-align: left;
        border: 1px solid var(--border);
        background: oklch(18% 0.03 275 / 0.55);
        border-radius: var(--radius-sm);
        padding: 0.55rem 0.65rem;
        color: inherit;
        cursor: pointer;
      }

      .entry.active {
        border-color: oklch(79% 0.18 155 / 0.45);
        box-shadow: var(--shadow-glow);
      }

      .entry__top {
        display: flex;
        gap: 0.45rem;
        align-items: center;
        min-width: 0;
      }

      .url {
        font-size: 0.78rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .entry__meta {
        display: flex;
        gap: 0.55rem;
        font-size: 0.72rem;
        color: var(--muted-foreground);
        margin-top: 0.25rem;
      }

      .entry small {
        color: var(--muted-foreground);
      }

      .ok {
        color: var(--neon-green);
      }

      .err {
        color: var(--neon-red);
      }

      .detail {
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: oklch(18% 0.03 275 / 0.45);
        padding: 0.65rem;
        min-height: 220px;
      }

      .tabs {
        display: flex;
        gap: 0.3rem;
        margin-bottom: 0.65rem;
        flex-wrap: wrap;
      }

      .tabs button {
        border: none;
        background: transparent;
        color: var(--muted-foreground);
        padding: 0.3rem 0.55rem;
        border-radius: 999px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.78rem;
      }

      .tabs button.active {
        background: var(--accent);
        color: var(--foreground);
      }

      pre {
        margin: 0;
        padding: 0.65rem;
        border-radius: var(--radius-sm);
        background: oklch(14% 0.025 275);
        overflow: auto;
        max-height: 200px;
        font-size: 0.75rem;
      }

      .detail h3 {
        margin: 0.75rem 0 0.35rem;
        font-size: 0.8rem;
        color: var(--muted-foreground);
      }

      .overview {
        display: grid;
        gap: 0.55rem;
        margin: 0;
      }

      .overview div {
        display: grid;
        grid-template-columns: 100px 1fr;
        gap: 0.5rem;
      }

      .overview dt {
        color: var(--muted-foreground);
        font-size: 0.75rem;
        text-transform: uppercase;
      }

      .overview dd {
        margin: 0;
        font-size: 0.88rem;
        word-break: break-all;
      }

      .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.8rem;
      }

      .empty {
        color: var(--muted-foreground);
        font-size: 0.85rem;
      }

      @media (max-width: 900px) {
        .body {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class HttpConsoleComponent {
  readonly store = inject(HttpConsoleStore);
  readonly methods: MethodFilter[] = ['ALL', 'GET', 'POST', 'DELETE'];
  readonly statuses: StatusFilter[] = ['ALL', '2xx', '4xx', '5xx'];
  readonly tabs = ['Overview', 'Headers', 'Body', 'Response'] as const;
  readonly activeTab = signal<(typeof this.tabs)[number]>('Overview');

  methodTone(method: string): 'green' | 'blue' | 'red' | 'muted' {
    if (method === 'GET') return 'blue';
    if (method === 'POST') return 'green';
    if (method === 'DELETE') return 'red';
    return 'muted';
  }

  isOk(status: number | null): boolean {
    return status !== null && status >= 200 && status < 300;
  }
}
