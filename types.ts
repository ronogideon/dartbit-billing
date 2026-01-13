
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
  speedLimit: string;
  price: number;
  validityDisplay: string;
  durationMinutes: number;
  description: string;
}

export interface Client {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  email: string;
  phone: string;
  connectionType: ConnectionType;
  planId: string;
  status: ClientStatus;
  balance: number;
  expiryDate: string; // Now supports ISO format with time
  bandwidthUsage: number;
  address: string;
  lastSeen?: string; // ISO timestamp
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
  memory: number;
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
