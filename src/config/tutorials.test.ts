import { describe, expect, it } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { navigation } from './navigation';
import { PAGE_TUTORIALS, SYSTEM_TOUR, tutorialForPath, tutorialsByFrequency } from './tutorials';

/** Route patterns of every page under the dashboard layout, e.g. "/orders/[orderId]". */
function dashboardRoutes(): string[] {
  const root = join(__dirname, '..', 'app', '(dashboard)');
  const routes: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry === 'page.tsx') {
        const rel = relative(root, dir).split(sep).filter(Boolean).join('/');
        routes.push(rel ? `/${rel}` : '/');
      }
    }
  };
  walk(root);
  return routes.sort();
}

describe('vendor tutorials', () => {
  it('has a tutorial for every dashboard page, so the ? button never comes up empty', () => {
    const covered = PAGE_TUTORIALS.map((t) => t.route).sort();
    expect(dashboardRoutes()).toEqual(covered);
  });

  it('covers every page in the navigation', () => {
    for (const item of navigation) {
      expect(tutorialForPath(item.href), item.href).toBeDefined();
    }
  });

  it('matches dynamic routes and ignores trailing slashes', () => {
    expect(tutorialForPath('/orders/123e4567-e89b-42d3-a456-426614174000')?.title).toBe('Order details');
    expect(tutorialForPath('/menu/abc/edit')?.title).toBe('Edit a dish');
    expect(tutorialForPath('/orders/')?.title).toBe('Orders');
    expect(tutorialForPath('/')?.title).toBe('Dashboard');
    expect(tutorialForPath('/login')).toBeUndefined();
  });

  it('labels the one-time setup pages as "Do once"', () => {
    const once = tutorialsByFrequency().once.map((t) => t.route).sort();
    expect(once).toEqual(['/availability', '/menu', '/menu/soups', '/settings']);
  });

  it('keeps detail pages out of the Guide list', () => {
    const listed = Object.values(tutorialsByFrequency()).flat();
    expect(listed.some((t) => t.route.includes('['))).toBe(false);
  });

  it('writes every tutorial with a reason and at least one step', () => {
    for (const tutorial of PAGE_TUTORIALS) {
      expect(tutorial.why.length, tutorial.route).toBeGreaterThan(40);
      expect(tutorial.steps.length, tutorial.route).toBeGreaterThan(0);
    }
  });

  it('only links the tour to pages that exist', () => {
    const routes = new Set(dashboardRoutes());
    for (const step of SYSTEM_TOUR) {
      for (const link of step.links ?? []) expect(routes.has(link.href), link.href).toBe(true);
    }
  });
});
