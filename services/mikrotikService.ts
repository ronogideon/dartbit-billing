
import { Client, ConnectionType, ClientStatus, RouterNode, BillingPlan, Payment } from '../types';

class MikroTikService {
  private customBridgeUrl: string | null = null;
  private currentBridgeUrl = window.location.origin;
  public isSimulated = false;

  setBridgeUrl(url: string) {
    if (!url) return;
    const clean = url.replace(/^https?:\/\//, '').split('/')[0];
    this.customBridgeUrl = `http://${clean}:5000`;
  }

  setSimulationMode(enabled: boolean) {
    this.isSimulated = enabled;
  }

  async checkHealth(): Promise<boolean> {
    const targets = [
      this.customBridgeUrl,
      window.location.origin,
      `http://${window.location.hostname}:5000`,
      'http://127.0.0.1:5000'
    ].filter(Boolean) as string[];

    for (const url of targets) {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 1500);
        const response = await fetch(`${url}/api/health?_t=${Date.now()}`, { 
          signal: controller.signal,
          mode: 'cors'
        });
        clearTimeout(id);
        const data = await response.json();
        if (data.success) {
          this.currentBridgeUrl = url;
          return true;
        }
      } catch (error) {
        continue;
      }
    }
    return false;
  }

  async clearDiscovery(): Promise<void> {
    try {
      await fetch(`${this.currentBridgeUrl}/api/discovery/clear`, { method: 'POST' });
    } catch (e) {}
  }

  async getClients(): Promise<Client[]> {
    if (this.isSimulated) return [];
    try {
      const res = await fetch(`${this.currentBridgeUrl}/api/clients?_t=${Date.now()}`);
      return await res.json();
    } catch (e) { return []; }
  }

  async getActiveSessions(): Promise<any[]> {
    if (this.isSimulated) return [];
    try {
      const res = await fetch(`${this.currentBridgeUrl}/api/mikrotik/active-sessions?_t=${Date.now()}`);
      return await res.json();
    } catch (e) { return []; }
  }

  async saveClient(client: Client): Promise<void> {
    if (this.isSimulated) return;
    await fetch(`${this.currentBridgeUrl}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client)
    });
  }

  async deleteClient(id: string): Promise<void> {
    if (this.isSimulated) return;
    await fetch(`${this.currentBridgeUrl}/api/clients/${id}`, { method: 'DELETE' });
  }

  async getPlans(): Promise<BillingPlan[]> {
    if (this.isSimulated) return [];
    try {
      const res = await fetch(`${this.currentBridgeUrl}/api/plans?_t=${Date.now()}`);
      return await res.json();
    } catch (e) { return []; }
  }

  async savePlan(plan: BillingPlan): Promise<void> {
    if (this.isSimulated) return;
    await fetch(`${this.currentBridgeUrl}/api/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan)
    });
  }

  async deletePlan(id: string): Promise<void> {
    if (this.isSimulated) return;
    await fetch(`${this.currentBridgeUrl}/api/plans/${id}`, { method: 'DELETE' });
  }

  async getRouters(): Promise<RouterNode[]> {
    if (this.isSimulated) return [];
    try {
      const res = await fetch(`${this.currentBridgeUrl}/api/routers?_t=${Date.now()}`);
      return await res.json();
    } catch (e) { return []; }
  }

  async saveRouters(routers: RouterNode[]): Promise<void> {
    if (this.isSimulated) return;
    await fetch(`${this.currentBridgeUrl}/api/routers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(routers)
    });
  }

  async deleteRouter(id: string): Promise<void> {
    if (this.isSimulated) return;
    const response = await fetch(`${this.currentBridgeUrl}/api/routers/${id}`, { 
      method: 'DELETE' 
    });
    if (!response.ok) throw new Error('Delete failed on bridge');
  }

  async getPayments(): Promise<Payment[]> {
    if (this.isSimulated) return [];
    try {
      const res = await fetch(`${this.currentBridgeUrl}/api/payments?_t=${Date.now()}`);
      return await res.json();
    } catch (e) { return []; }
  }

  async discoverRouters(): Promise<any[]> {
    if (this.isSimulated) return [];
    try {
      const response = await fetch(`${this.currentBridgeUrl}/api/discovered?_t=${Date.now()}`);
      return await response.json();
    } catch (e) { return []; }
  }
}

export const mikrotikService = new MikroTikService();
