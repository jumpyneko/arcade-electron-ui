// src/audioManager.js
class AudioManager {
    constructor() {
      this.catalog = new Map();      // id -> src
      this.baseNodes = new Map();    // id -> Audio (for preload/decode)
      this.masterVolume = 1;
      this.muted = false;
  
      // active instances (multiple for sfx, one for voice if you enforce with groups)
      this.activeById = new Map();   // id -> Set<Audio>
      this.activeByGroup = new Map(); // group -> Set<Audio>
    }
  
    registerMany(entries) {
      // entries: { id: "assets/sounds/file.wav", ... }
      Object.entries(entries).forEach(([id, src]) => this.register(id, src));
    }
  
    register(id, src) {
      this.catalog.set(id, src);
  
      // preload base node once
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = this._effectiveVolume(1);
      this.baseNodes.set(id, audio);
    }
  
    preload(ids = null) {
      const targets = ids ?? Array.from(this.baseNodes.keys());
      targets.forEach((id) => {
        const a = this.baseNodes.get(id);
        if (a) a.load();
      });
    }
  
    setMasterVolume(value) {
      this.masterVolume = Math.max(0, Math.min(1, value));
      this._syncAllVolumes();
    }
  
    setMuted(muted) {
      this.muted = !!muted;
      this._syncAllVolumes();
    }
  
    async play(id, options = {}) {
      const {
        volume = 1,
        loop = false,
        restart = false,
        group = "sfx",
        stopGroupBeforePlay = false,
      } = options;
  
      const src = this.catalog.get(id);
      if (!src) {
        console.warn(`[audioManager] Unknown sound id: ${id}`);
        return null;
      }
  
      if (stopGroupBeforePlay) {
        this.stopGroup(group);
      }
  
      // If restart=true, stop currently playing instances for this id first
      if (restart) {
        this.stop(id);
      }
  
      const instance = new Audio(src);
      instance.preload = "auto";
      instance.loop = loop;
      instance.volume = this._effectiveVolume(volume);
  
      this._trackInstance(id, group, instance);
  
      instance.addEventListener("ended", () => {
        this._untrackInstance(id, group, instance);
      }, { once: true });
  
      instance.addEventListener("error", () => {
        this._untrackInstance(id, group, instance);
        console.warn(`[audioManager] Failed to load/play: ${id}`);
      }, { once: true });
  
      try {
        await instance.play();
        return instance;
      } catch (err) {
        this._untrackInstance(id, group, instance);
        console.warn(`[audioManager] play() rejected for ${id}:`, err);
        return null;
      }
    }
  
    async playAndWait(id, options = {}) {
      const instance = await this.play(id, options);
      if (!instance) return false;
  
      return new Promise((resolve) => {
        instance.addEventListener("ended", () => resolve(true), { once: true });
        instance.addEventListener("error", () => resolve(false), { once: true });
      });
    }
  
    stop(id) {
      const set = this.activeById.get(id);
      if (!set) return;
  
      for (const audio of set) {
        audio.pause();
        audio.currentTime = 0;
        // untrack from group maps too
        this._untrackEverywhere(audio);
      }
      this.activeById.delete(id);
    }
  
    stopGroup(group) {
      const set = this.activeByGroup.get(group);
      if (!set) return;
  
      for (const audio of set) {
        audio.pause();
        audio.currentTime = 0;
        this._untrackEverywhere(audio);
      }
      this.activeByGroup.delete(group);
    }
  
    stopAll() {
      // clone sets to avoid mutation issues while iterating
      const all = [];
      this.activeById.forEach((set) => set.forEach((a) => all.push(a)));
  
      all.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
        this._untrackEverywhere(audio);
      });
  
      this.activeById.clear();
      this.activeByGroup.clear();
    }
  
    isPlaying(id) {
      const set = this.activeById.get(id);
      return !!set && set.size > 0;
    }
  
    _effectiveVolume(localVolume) {
      if (this.muted) return 0;
      return Math.max(0, Math.min(1, localVolume * this.masterVolume));
    }
  
    _syncAllVolumes() {
      this.activeById.forEach((set) => {
        set.forEach((a) => {
          // keeps each instance’s own base volume in dataset if present
          const base = Number(a.dataset.baseVolume ?? "1");
          a.volume = this._effectiveVolume(base);
        });
      });
  
      this.baseNodes.forEach((a) => {
        a.volume = this._effectiveVolume(1);
      });
    }
  
    _trackInstance(id, group, audio) {
      audio.dataset.soundId = id;
      audio.dataset.group = group;
      audio.dataset.baseVolume = String(audio.volume / (this.masterVolume || 1) || 1);
  
      if (!this.activeById.has(id)) this.activeById.set(id, new Set());
      this.activeById.get(id).add(audio);
  
      if (!this.activeByGroup.has(group)) this.activeByGroup.set(group, new Set());
      this.activeByGroup.get(group).add(audio);
    }
  
    _untrackInstance(id, group, audio) {
      const byId = this.activeById.get(id);
      if (byId) {
        byId.delete(audio);
        if (byId.size === 0) this.activeById.delete(id);
      }
  
      const byGroup = this.activeByGroup.get(group);
      if (byGroup) {
        byGroup.delete(audio);
        if (byGroup.size === 0) this.activeByGroup.delete(group);
      }
    }
  
    _untrackEverywhere(audio) {
      const id = audio.dataset.soundId;
      const group = audio.dataset.group;
      if (id && group) this._untrackInstance(id, group, audio);
    }
  }
  
  export const audioManager = new AudioManager();