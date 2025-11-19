export class Logger {
  private static formatTimestamp(): string {
    return new Date().toISOString();
  }

  static info(message: string, meta?: any): void {
    console.log(`[${this.formatTimestamp()}] [INFO] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }

  static error(message: string, error?: any): void {
    console.error(`[${this.formatTimestamp()}] [ERROR] ${message}`, error);
  }

  static warn(message: string, meta?: any): void {
    console.warn(`[${this.formatTimestamp()}] [WARN] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }

  static debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.formatTimestamp()}] [DEBUG] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
    }
  }
}
