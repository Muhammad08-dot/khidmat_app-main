export interface User {
  id: string;
  name: string;
  phone: string;
  role: 'customer' | 'provider';
  avatarUrl?: string;
  isRtl?: boolean;
}

export interface ServiceCategory {
  id: string;
  name: string;
  iconName: string;
  basePrice: number;
}
