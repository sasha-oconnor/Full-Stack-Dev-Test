import type { Customer, Equipment, LaborRate } from "@/lib/types";
import rawCustomers from "../../data/customers.json";
import rawEquipment from "../../data/equipment.json";
import rawLaborRates from "../../data/labor_rates.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCustomers(): Customer[] {
  return (rawCustomers as any[]).map((c) => ({
    id: c.id,
    name: c.name,
    address: c.address,
    phone: c.phone,
    // Normalize: CUST008 uses `property_type` instead of `propertyType`
    propertyType: (c.propertyType ?? c.property_type ?? "residential") as
      | "residential"
      | "commercial",
    // Normalize: CUST008 uses `sqft` instead of `squareFootage`
    squareFootage: c.squareFootage ?? c.sqft,
    systemType: c.systemType,
    systemAge: c.systemAge,
    lastServiceDate: c.lastServiceDate,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getEquipment(): Equipment[] {
  return (rawEquipment as any[]).map((e) => ({
    id: e.id,
    name: e.name,
    category: e.category,
    brand: e.brand,
    modelNumber: e.modelNumber,
    // Normalize: EQ012 and EQ028 use `base_cost` instead of `baseCost`
    baseCost: e.baseCost ?? e.base_cost ?? 0,
  }));
}

export function getLaborRates(): LaborRate[] {
  return rawLaborRates as LaborRate[];
}

export function getCustomerById(id: string): Customer | undefined {
  return getCustomers().find((c) => c.id === id);
}

export function getEquipmentById(id: string): Equipment | undefined {
  return getEquipment().find((e) => e.id === id);
}

export function getEquipmentCategories(): string[] {
  const categories = getEquipment().map((e) => e.category);
  return Array.from(new Set(categories)).sort();
}
