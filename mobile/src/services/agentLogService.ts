export class AgentLogService {
  private logs: string[] = [];

  constructor() {
    this.addLog("AgentLogService initialized.");
  }

  public addLog(msg: string): void {
    const timestamp = new Date().toISOString();
    this.logs.push(`[${timestamp}] ${msg}`);
    console.log(`[AgentLogService] ${msg}`);
  }

  public getLogs(): string[] {
    return [...this.logs];
  }
}

export const agentLogService = new AgentLogService();
