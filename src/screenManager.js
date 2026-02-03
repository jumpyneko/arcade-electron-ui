// src/screenManager.js

// Define the screen flow sequence
const SCREEN_SEQUENCE = [
    "start",
    "roulette",
    "playmode",
    "infomode",
    "roulette",
    "playmode",
    "infomode",
    "roulette",
    "playmode",
    "modelpicker",
    "end"
  ];
  
  class ScreenManager {
    constructor() {
      this.currentIndex = 0;
      this.screens = new Map();
      this.isTransitioning = false;
      this.transitionCallback = null;
      this.sharedData = {}; // e.g. { lastRouletteSector: number }
    }
  
    // Register a screen with its functions
    register(screenName, { init, render, cleanup }) {
      this.screens.set(screenName, { init, render, cleanup });
    }
  
    // Get current screen name
    getCurrentScreen() {
      return SCREEN_SEQUENCE[this.currentIndex];
    }
  
    // Move to next screen in sequence
    async next(data = {}) {
      if (this.isTransitioning) return;
      if (this.currentIndex >= SCREEN_SEQUENCE.length - 1) return;

      Object.assign(this.sharedData, data);
  
      const currentScreen = this.getCurrentScreen();
      const screenData = this.screens.get(currentScreen);
      
      // Cleanup current screen
      if (screenData?.cleanup) {
        screenData.cleanup();
      }
  
      this.isTransitioning = true;
  
      // Future: Play transition animation here
      if (this.transitionCallback) {
        await this.transitionCallback();
      }
  
      this.currentIndex++;
      const nextScreen = this.getCurrentScreen();
      const nextScreenData = this.screens.get(nextScreen);
  
      // Initialize next screen
      if (nextScreenData?.init) {
        nextScreenData.init();
      }
  
      this.isTransitioning = false;
    }
  
    // Jump to a specific screen (useful for testing)
    goTo(screenName) {
      const index = SCREEN_SEQUENCE.indexOf(screenName);
      if (index !== -1) {
        const currentScreen = this.getCurrentScreen();
        const screenData = this.screens.get(currentScreen);
        if (screenData?.cleanup) {
          screenData.cleanup();
        }
  
        this.currentIndex = index;
        const nextScreenData = this.screens.get(this.getCurrentScreen());
        if (nextScreenData?.init) {
          nextScreenData.init();
        }
      }
    }
  
    // Render current screen
    render(ctx, canvas) {
      const screenName = this.getCurrentScreen();
      const screenData = this.screens.get(screenName);
      if (screenData?.render) {
        screenData.render(ctx, canvas);
      }
    }

    setTransitionAnimation(transitionFn) {
      this.transitionCallback = transitionFn;
    }
  }
  
  export const screenManager = new ScreenManager();