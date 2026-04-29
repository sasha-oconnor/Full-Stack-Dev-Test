export interface Customer {
  id: string;
  name: string;
  address: string;
  phone?: string;
  propertyType: "residential" | "commercial";
  squareFootage?: number;
  systemType: string;
  systemAge?: number;
  lastServiceDate?: string;
}

export interface Equipment {
  id: string;
  name: string;
  category: string;
  brand: string;
  modelNumber: string;
  baseCost: number;
}

export interface LaborRate {
  jobType: "diagnostic" | "repair" | "install" | "maintenance" | "ductwork";
  level: string;
  hourlyRate: number;
  estimatedHours: { min: number; max: number };
}

export interface EstimateLineItem {
  equipment: Equipment;
  quantity: number;
}

export interface Estimate {
  customerId: string;
  lineItems: EstimateLineItem[];
  laborRate: LaborRate | null;
  notes: string;
}
