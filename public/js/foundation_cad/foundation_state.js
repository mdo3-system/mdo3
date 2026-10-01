/**
 * foundation_state.js
 * 基礎梁CAD プロジェクト状態管理・ストレージ同期
 */

import { DEFAULT_BEAMS, DEFAULT_AVG_GL, DEFAULT_SLAB_COMMON, STORAGE_KEY } from './foundation_constants.js';

class FoundationStateManager {
  constructor() {
    this.beamList = JSON.parse(JSON.stringify(DEFAULT_BEAMS));
    this.currentBeamIndex = 0;
    this.avgGlConfig = JSON.parse(JSON.stringify(DEFAULT_AVG_GL));
    this.slabCommon = JSON.parse(JSON.stringify(DEFAULT_SLAB_COMMON));
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(eventType, data) {
    this.listeners.forEach(fn => fn(eventType, data));
  }

  getCurrentBeam() {
    return this.beamList[this.currentBeamIndex] || this.beamList[0];
  }

  setCurrentBeamIndex(index) {
    if (index >= 0 && index < this.beamList.length) {
      this.currentBeamIndex = index;
      this.autoSave();
      this.notify('changeBeam', this.getCurrentBeam());
    }
  }

  updateCurrentBeamParam(key, val) {
    const b = this.getCurrentBeam();
    if (!b) return;
    b[key] = val;
    this.autoSave();
    this.notify('updateParam', { key, val, beam: b });
  }

  updateAvgGlParam(key, val) {
    this.avgGlConfig[key] = val;
    this.autoSave();
    this.notify('updateAvgGl', this.avgGlConfig);
  }

  updateSlabParam(shortBar, longBar) {
    if (shortBar) this.slabCommon.shortBar = shortBar;
    if (longBar) this.slabCommon.longBar = longBar;
    this.autoSave();
    this.notify('updateSlab', this.slabCommon);
  }

  addNewBeam() {
    const nextNum = this.beamList.length + 1;
    const newId = `FG${nextNum}`;
    const baseBeam = this.getCurrentBeam();
    const newBeam = JSON.parse(JSON.stringify(baseBeam));
    newBeam.id = newId;
    newBeam.title = newId;
    this.beamList.push(newBeam);
    this.currentBeamIndex = this.beamList.length - 1;
    this.autoSave();
    this.notify('addBeam', newBeam);
  }

  cloneCurrentBeam() {
    const baseBeam = this.getCurrentBeam();
    const nextNum = this.beamList.length + 1;
    const newId = `FG${nextNum}`;
    const newBeam = JSON.parse(JSON.stringify(baseBeam));
    newBeam.id = newId;
    newBeam.title = newId;
    this.beamList.push(newBeam);
    this.currentBeamIndex = this.beamList.length - 1;
    this.autoSave();
    this.notify('cloneBeam', newBeam);
  }

  deleteCurrentBeam() {
    if (this.beamList.length <= 1) return false;
    this.beamList.splice(this.currentBeamIndex, 1);
    this.currentBeamIndex = Math.max(0, this.currentBeamIndex - 1);
    this.autoSave();
    this.notify('deleteBeam', this.currentBeamIndex);
    return true;
  }

  autoSave() {
    try {
      const state = {
        beamList: this.beamList,
        currentBeamIndex: this.currentBeamIndex,
        avgGlConfig: this.avgGlConfig,
        slabCommon: this.slabCommon
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('AutoSave error:', e);
    }
  }

  autoLoad() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.beamList && state.beamList.length) {
          this.beamList = state.beamList;
          this.currentBeamIndex = Math.min(state.currentBeamIndex || 0, this.beamList.length - 1);
          if (state.avgGlConfig) this.avgGlConfig = state.avgGlConfig;
          if (state.slabCommon) this.slabCommon = state.slabCommon;
          return true;
        }
      }
    } catch (e) {
      console.warn('AutoLoad error:', e);
    }
    return false;
  }

  exportJSON() {
    const state = {
      version: '5.0',
      generator: 'mdo3_foundation_cad_pro',
      date: new Date().toISOString(),
      beamList: this.beamList,
      avgGlConfig: this.avgGlConfig,
      slabCommon: this.slabCommon
    };
    const jsonStr = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Foundation_Beam_Project_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  importJSON(jsonString) {
    try {
      const state = JSON.parse(jsonString);
      if (state.beamList && state.beamList.length) {
        this.beamList = state.beamList;
        this.currentBeamIndex = 0;
        if (state.avgGlConfig) this.avgGlConfig = state.avgGlConfig;
        if (state.slabCommon) this.slabCommon = state.slabCommon;
        this.autoSave();
        this.notify('loadState', this.beamList);
        return true;
      }
    } catch (err) {
      console.error('Import error:', err);
    }
    return false;
  }
}

export const foundationState = new FoundationStateManager();
