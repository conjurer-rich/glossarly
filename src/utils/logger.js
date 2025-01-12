class Logger {
  static debug = true;
  static prefix = "[Glossarly]";

  static log(...args) {
    if (this.debug) {
      console.log(this.prefix, ...args);
    }
  }

  static warn(...args) {
    if (this.debug) {
      console.warn(this.prefix, ...args);
    }
  }

  static error(...args) {
    if (this.debug) {
      console.error(this.prefix, ...args);
    }
  }

  static setDebug(enabled) {
    this.debug = enabled;
  }
}
