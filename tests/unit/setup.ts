import { loadDistrict } from '../../src/world/district';

// The real-scale district map is a separately loaded chunk (D098); load it once before any test touches rooms.district.
await loadDistrict();
