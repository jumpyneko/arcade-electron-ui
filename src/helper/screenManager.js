// src/screenManager.js
import { screenChanged } from "../communication/controlRoomOutput.js";
import { applyScreen } from "./playerSide.js";

function notifyScreenChanged(screenName, sharedData) {
  if (screenName === "playmode") {
    screenChanged(screenName, sharedData.lastRouletteSector ?? sharedData.nextPov ?? null);
    return;
  }
  const includeModelId = screenName === "nameScreen" || screenName === "end";
  screenChanged(screenName, includeModelId ? sharedData.chosenModelId : null);
}

// Define the screen flow sequence
const SCREEN_SEQUENCE = [
    "start",
    "rouletteStrip",
    "playmode",
    "slotmachine",
    "modelpicker",
    "nameScreen", // Added new screen before endScreen
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
    register(screenName, screenModule) {
      this.screens.set(screenName, screenModule);
    }
  
    // Get current screen name
    getCurrentScreen() {
      return SCREEN_SEQUENCE[this.currentIndex];
    }

    // Get next screen name
    getNextScreen() {
      if (this.currentIndex >= SCREEN_SEQUENCE.length - 1) return null;
      return SCREEN_SEQUENCE[this.currentIndex + 1];
    }

    // Initializes the first screen and notifies Max
    start() {
      const screen = this.getCurrentScreen();
      const screenData = this.screens.get(screen);
      // The side a screen is played from decides how the display is turned, so
      // it is applied before init() draws or loads anything for that screen.
      applyScreen(screen);
      if (screenData?.init) {
        screenData.init();
      }
      notifyScreenChanged(screen, this.sharedData);
    }

    // Restart the game, sets a new round
    restartGame() {
      const currentScreen = this.getCurrentScreen();
      const screenData = this.screens.get(currentScreen);
      if (screenData?.cleanup) {
        screenData.cleanup();
      }
    
      this.currentIndex = 0;
      this.sharedData = {};

      applyScreen(this.getCurrentScreen());
      const nextScreenData = this.screens.get(this.getCurrentScreen());
      if (nextScreenData?.init) {
        nextScreenData.init();
      }
    
      notifyScreenChanged(this.getCurrentScreen(), this.sharedData);
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

      applyScreen(nextScreen);
  
      // Initialize next screen
      if (nextScreenData?.init) {
        nextScreenData.init();
      }

      // Notify Max that this screen has started
      notifyScreenChanged(nextScreen, this.sharedData);
  
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
        applyScreen(this.getCurrentScreen());
        const nextScreenData = this.screens.get(this.getCurrentScreen());
        if (nextScreenData?.init) {
          nextScreenData.init();
        }

        // Notify Max that this screen has started
        notifyScreenChanged(this.getCurrentScreen(), this.sharedData);
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
