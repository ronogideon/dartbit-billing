
export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING'
}

export enum ConnectionType {
  PPPOE = 'PPPoE',
  HOTSPOT = 'Hotspot'
}

export enum RouterStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE'
}

export interface BillingPlan {
  id: string;
  name: string;
  type: ConnectionType;
  speedLimit: string; // e.g. "10M/10M"
  price: number;
  validityDisplay: string; // e.g. "30 Days", "1 Hour"
  durationMinutes: number; // For system logic/expiries
  description: string;
}

export interface Client {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  connectionType: ConnectionType;
  planId: string;
  status: ClientStatus;
  balance: number;
  expiryDate: string;
  bandwidthUsage: number; // in GB
  address: string;
}

export interface RouterNode {
  id: string;
  name: string;
  host: string;
  port?: number;
  username?: string;
  password?: string;
  status: RouterStatus;
  cpu: number;
  memory: number; // Free memory in MB
  totalMemory?: number;
  sessions: number;
  uptime: string;
  lastSync: string;
  model?: string;
  version?: string;
}

export interface Payment {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  planName: string;
  date: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  transactionId: string;
  method: 'M-Pesa' | 'Voucher';
}
