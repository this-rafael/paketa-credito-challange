import { Injectable, computed, signal } from '@angular/core';
import {
  HttpConsoleEntry,
  MethodFilter,
  StatusFilter,
} from '../models/http-console';

@Injectable({ providedIn: 'root' })
export class HttpConsoleStore {
  private readonly entriesSignal = signal<HttpConsoleEntry[]>([]);
  private readonly selectedIdSignal = signal<string | null>(null);
  private readonly methodFilterSignal = signal<MethodFilter>('ALL');
  private readonly statusFilterSignal = signal<StatusFilter>('ALL');

  readonly entries = this.entriesSignal.asReadonly();
  readonly selectedId = this.selectedIdSignal.asReadonly();
  readonly methodFilter = this.methodFilterSignal.asReadonly();
  readonly statusFilter = this.statusFilterSignal.asReadonly();

  readonly filteredEntries = computed(() => {
    const method = this.methodFilterSignal();
    const status = this.statusFilterSignal();
    return this.entriesSignal().filter((entry) => {
      const methodOk = method === 'ALL' || entry.method === method;
      const statusOk =
        status === 'ALL' ||
        (entry.status !== null &&
          ((status === '2xx' && entry.status >= 200 && entry.status < 300) ||
            (status === '4xx' && entry.status >= 400 && entry.status < 500) ||
            (status === '5xx' && entry.status >= 500)));
      return methodOk && statusOk;
    });
  });

  readonly selectedEntry = computed(() => {
    const id = this.selectedIdSignal();
    return this.entriesSignal().find((e) => e.id === id) ?? null;
  });

  readonly requestCount = computed(() => this.entriesSignal().length);

  push(entry: HttpConsoleEntry): void {
    this.entriesSignal.update((list) => [entry, ...list].slice(0, 100));
    if (!this.selectedIdSignal()) {
      this.selectedIdSignal.set(entry.id);
    }
  }

  select(id: string): void {
    this.selectedIdSignal.set(id);
  }

  setMethodFilter(filter: MethodFilter): void {
    this.methodFilterSignal.set(filter);
  }

  setStatusFilter(filter: StatusFilter): void {
    this.statusFilterSignal.set(filter);
  }

  clear(): void {
    this.entriesSignal.set([]);
    this.selectedIdSignal.set(null);
  }
}
