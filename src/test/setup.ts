import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Do not define __TAURI__ by default - let tests control it
// This allows tests to properly test isTauri() returning false
