import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MenuApiService } from '../api/menu-api.service';
import {
  FlatMenuItem,
  MenuItem,
  MenuStats,
  ViewMode,
} from '../models/menu';
import {
  computeStats,
  findItem,
  flattenMenu,
  toRelatedId,
} from '../utils/menu-tree';
import { buildTreeLayout } from '../utils/tree-layout';

@Injectable({ providedIn: 'root' })
export class MenuStore {
  private readonly api = inject(MenuApiService);

  private readonly treeSignal = signal<MenuItem[]>([]);
  private readonly selectedIdSignal = signal<string | null>(null);
  private readonly viewModeSignal = signal<ViewMode>('tree');
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly mutatingSignal = signal(false);

  readonly tree = this.treeSignal.asReadonly();
  readonly selectedId = this.selectedIdSignal.asReadonly();
  readonly viewMode = this.viewModeSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly mutating = this.mutatingSignal.asReadonly();

  readonly flatItems = computed(() => flattenMenu(this.treeSignal()));
  readonly stats = computed<MenuStats>(() => computeStats(this.treeSignal()));
  readonly layout = computed(() => buildTreeLayout(this.treeSignal()));

  readonly selectedFlat = computed<FlatMenuItem | null>(() => {
    const id = this.selectedIdSignal();
    if (!id) return null;
    return this.flatItems().find((item) => item.id === id) ?? null;
  });

  readonly selectedItem = computed(() => {
    const id = this.selectedIdSignal();
    if (!id) return null;
    return findItem(this.treeSignal(), id);
  });

  setViewMode(mode: ViewMode): void {
    this.viewModeSignal.set(mode);
  }

  select(id: string | null): void {
    this.selectedIdSignal.set(id);
  }

  async load(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    try {
      const tree = await firstValueFrom(this.api.getMenu());
      this.treeSignal.set(tree ?? []);
      const selected = this.selectedIdSignal();
      if (selected && !findItem(tree ?? [], selected)) {
        this.selectedIdSignal.set(null);
      }
    } catch (err) {
      this.errorSignal.set(this.toErrorMessage(err, 'Falha ao carregar o menu'));
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async createItem(name: string, relatedId?: string | null): Promise<boolean> {
    const trimmed = name.trim();
    if (!trimmed) {
      this.errorSignal.set('Nome é obrigatório');
      return false;
    }

    this.mutatingSignal.set(true);
    this.errorSignal.set(null);
    try {
      const body = {
        name: trimmed,
        ...(relatedId ? { relatedId: toRelatedId(relatedId) } : {}),
      };
      const created = await firstValueFrom(this.api.createItem(body));
      await this.load();
      if (created?.id) {
        this.selectedIdSignal.set(created.id);
      }
      return true;
    } catch (err) {
      this.errorSignal.set(this.toErrorMessage(err, 'Falha ao criar item'));
      return false;
    } finally {
      this.mutatingSignal.set(false);
    }
  }

  async deleteSelected(): Promise<boolean> {
    const id = this.selectedIdSignal();
    if (!id) return false;
    return this.deleteItem(id);
  }

  async deleteItem(id: string): Promise<boolean> {
    this.mutatingSignal.set(true);
    this.errorSignal.set(null);
    try {
      await firstValueFrom(this.api.deleteItem(id));
      if (this.selectedIdSignal() === id) {
        this.selectedIdSignal.set(null);
      }
      await this.load();
      return true;
    } catch (err) {
      this.errorSignal.set(this.toErrorMessage(err, 'Falha ao excluir item'));
      return false;
    } finally {
      this.mutatingSignal.set(false);
    }
  }

  private toErrorMessage(err: unknown, fallback: string): string {
    if (typeof err === 'object' && err && 'error' in err) {
      const body = (err as { error?: unknown }).error;
      if (typeof body === 'string' && body.trim()) return body;
      if (body && typeof body === 'object') {
        // Mock API: `{ message }` | Real API: `{ error: { message } }`
        if ('message' in body) {
          const message = (body as { message?: unknown }).message;
          if (typeof message === 'string') return message;
        }
        if ('error' in body) {
          const nested = (body as { error?: unknown }).error;
          if (nested && typeof nested === 'object' && 'message' in nested) {
            const message = (nested as { message?: unknown }).message;
            if (typeof message === 'string') return message;
          }
        }
      }
    }
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  }
}
