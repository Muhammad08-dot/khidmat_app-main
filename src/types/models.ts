import { Database } from './database.types';

export type User = Database['public']['Tables']['profiles']['Row'];
export type Provider = Database['public']['Tables']['providers']['Row'];
export type ServiceCategory = Database['public']['Tables']['categories']['Row'];

