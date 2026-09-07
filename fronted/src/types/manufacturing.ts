export interface CompanyEntity {
  id: string;
  name: string;
  code: string;
  currencyCode: string;
  baseCurrency: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: 'FinishedGood' | 'RawMaterial' | 'SubAssembly' | 'Service' | 'Kit';
  unitOfMeasure: string;
  standardCost?: number;
  salesPrice?: number;
  isActive: boolean;
  bomId?: string;
  routingId?: string;
  category?: string;
  trackingMethod: 'None' | 'Serial' | 'Lot' | 'Batch';
  revision?: string;
  minOrderQty?: number;
  leadTimeDays?: number;
  phantomBom: boolean;
}

export interface BomLine {
  id: string;
  sequence: number;
  rawMaterialProductId: string;
  rawMaterialProduct?: Product;
  rawMaterialProductCode: string;
  rawMaterialProductName: string;
  quantityPer: number;
  unitOfMeasure: string;
  wastePercentage: number;
  scrapPercentage: number;
  referenceDesignator?: string;
  operationSequence?: number;
  isPhantom: boolean;
  isOptional: boolean;
  substituteProductId?: string;
  substituteProduct?: Product;
  quantityRequired?: number;
  notes?: string;
}

export interface Bom {
  id: string;
  bomNumber: string;
  revision: string;
  finishedProductId: string;
  finishedProduct?: Product;
  finishedProductCode: string;
  finishedProductName: string;
  quantityPerBatch: number;
  quantityProduced?: number;
  unitOfMeasure: string;
  status: 'Draft' | 'Approved' | 'Active' | 'Obsolete' | 'Archived';
  type: 'Standard' | 'Phantom' | 'Planning' | 'Engineering' | 'Service';
  effectiveDate: string;
  expiryDate?: string;
  approvedBy?: string;
  approvedDate?: string;
  lines: BomLine[];
  totalMaterialCost: number;
  totalLaborCost: number;
  totalOverheadCost: number;
  totalStandardCost: number;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface WorkCenter {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: 'Machine' | 'Labor' | 'Both' | 'Subcontract';
  capacityPerDay: number;
  efficiencyPercentage: number;
  costPerHour: number;
  overheadRatePerHour: number;
  calendarId?: string;
  locationId?: string;
  isActive: boolean;
  machineAssetId?: string;
  crewSize: number;
  setupTimeMinutes: number;
  queueTimeMinutes: number;
  moveTimeMinutes: number;
  waitTimeMinutes: number;
}

export interface RoutingOperation {
  id: string;
  sequence: number;
  operationCode: string;
  operationName: string;
  description?: string;
  workCenterId: string;
  workCenter?: WorkCenter;
  setupTimeMinutes: number;
  runTimeMinutesPerUnit: number;
  waitTimeMinutes: number;
  moveTimeMinutes: number;
  queueTimeMinutes: number;
  crewSize: number;
  laborRatePerHour: number;
  machineRatePerHour: number;
  overheadRatePerHour: number;
  yieldPercentage: number;
  isSubcontracted: boolean;
  vendorId?: string;
  outsideProcessingCost?: number;
  inspectionRequired: boolean;
  inspectionInstructions?: string;
  notes?: string;
}

export interface Routing {
  id: string;
  routingNumber: string;
  revision: string;
  productId: string;
  product?: Product;
  productCode: string;
  productName: string;
  status: 'Draft' | 'Approved' | 'Active' | 'Obsolete';
  effectiveDate: string;
  operations: RoutingOperation[];
  totalSetupTime: number;
  totalRunTimePerUnit: number;
  totalLaborCost: number;
  totalMachineCost: number;
  totalOverheadCost: number;
  totalStandardCost: number;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderLine {
  id: string;
  workOrderId: string;
  sequence: number;
  productId: string;
  product?: Product;
  productCode: string;
  productName: string;
  quantityRequired: number;
  quantityIssued: number;
  quantityConsumed: number;
  quantityScrapped: number;
  unitCost: number;
  totalCost: number;
  warehouseId: string;
  warehouse?: Warehouse;
  lotNumber?: string;
  serialNumber?: string;
  status: 'Pending' | 'Partial' | 'Issued' | 'Returned';
}

export interface WorkOrderOperation {
  id: string;
  workOrderId: string;
  sequence: number;
  operationCode: string;
  operationName: string;
  workCenterId: string;
  workCenter?: WorkCenter;
  workCenterCode: string;
  workCenterName: string;
  plannedSetupMinutes: number;
  plannedRunMinutes: number;
  actualSetupMinutes: number;
  actualRunMinutes: number;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  machineAssetId?: string;
  machineAssetName?: string;
  status: 'Pending' | 'Released' | 'InProgress' | 'OnHold' | 'Completed' | 'Skipped';
  completedQuantity: number;
  scrapQuantity: number;
  laborCost: number;
  machineCost: number;
  overheadCost: number;
  totalCost: number;
  notes?: string;
}

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  status: 'Draft' | 'Released' | 'InProgress' | 'OnHold' | 'Completed' | 'Cancelled' | 'Closed';
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  productId: string;
  product?: Product;
  productCode: string;
  productName: string;
  bomId?: string;
  bom?: Bom;
  bomRevision?: string;
  routingId?: string;
  routing?: Routing;
  routingRevision?: string;
  quantityOrdered: number;
  quantityProduced: number;
  quantityScrapped: number;
  quantityRejected: number;
  quantityAccepted: number;
  unitOfMeasure: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  releasedDate?: string;
  completedDate?: string;
  warehouseId: string;
  warehouse?: Warehouse;
  rawMaterialWarehouseId: string;
  finishedGoodsWarehouseId: string;
  assignedSupervisorId?: string;
  assignedSupervisorName?: string;
  totalMaterialCost: number;
  totalLaborCost: number;
  totalMachineCost: number;
  totalOverheadCost: number;
  totalActualCost: number;
  totalStandardCost: number;
  varianceMaterial: number;
  varianceLabor: number;
  varianceOverhead: number;
  totalVariance: number;
  finishedProductName?: string;
  workCenterName?: string;
  machineAssetName?: string;
  quantityToProduce?: number;
  directLaborCost?: number;
  overheadCost?: number;
  totalCost?: number;
  unitCost?: number;
  machineRunHours?: number;
  machineHourlyRate?: number;
  laborHours?: number;
  laborHourlyRate?: number;
  acceptedQuantity?: number;
  inspectorName?: string;
  scrapQuantity?: number;
  scrapReason?: string;
  lines: WorkOrderLine[];
  operations: WorkOrderOperation[];
  qcRequired: boolean;
  qcStatus: 'Pending' | 'InProgress' | 'Passed' | 'Failed' | 'Conditional';
  companyId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface MaterialIssue {
  id: string;
  issueNumber: string;
  workOrderId: string;
  workOrder?: WorkOrder;
  workOrderNumber: string;
  issueDate: string;
  issuedBy: string;
  issuedByName: string;
  status: 'Draft' | 'Issued' | 'Partial' | 'Returned' | 'Cancelled';
  lines: MaterialIssueLine[];
  totalCost: number;
  notes?: string;
  companyId: string;
}

export interface MaterialIssueLine {
  id: string;
  issueId: string;
  workOrderLineId: string;
  productId: string;
  product?: Product;
  productCode: string;
  productName: string;
  quantityRequired: number;
  quantityIssued: number;
  quantityReturned: number;
  unitCost: number;
  totalCost: number;
  warehouseId: string;
  warehouse?: Warehouse;
  binLocation?: string;
  lotNumber?: string;
  serialNumber?: string;
}

export interface LaborEntry {
  id: string;
  workOrderId: string;
  workOrder?: WorkOrder;
  workOrderNumber: string;
  operationId: string;
  operation?: WorkOrderOperation;
  operationName: string;
  employeeId: string;
  employeeName: string;
  workCenterId: string;
  workCenter?: WorkCenter;
  workCenterName: string;
  date: string;
  startTime: string;
  endTime: string;
  setupMinutes: number;
  runMinutes: number;
  breakMinutes: number;
  totalMinutes: number;
  laborRatePerHour: number;
  overtimeRatePerHour?: number;
  overtimeMinutes: number;
  laborCost: number;
  overheadCost: number;
  description?: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  approvedBy?: string;
  approvedDate?: string;
}

export interface MachineTimeEntry {
  id: string;
  workOrderId: string;
  workOrder?: WorkOrder;
  workOrderNumber: string;
  operationId: string;
  operation?: WorkOrderOperation;
  operationName: string;
  machineAssetId: string;
  machineAsset?: FixedAsset;
  machineAssetTag: string;
  machineAssetName: string;
  workCenterId: string;
  workCenter?: WorkCenter;
  workCenterName: string;
  date: string;
  startTime: string;
  endTime: string;
  setupMinutes: number;
  runMinutes: number;
  downtimeMinutes: number;
  totalMinutes: number;
  machineRatePerHour: number;
  overheadRatePerHour: number;
  meterReadingStart: number;
  meterReadingEnd: number;
  meterUnit: 'Hours' | 'Cycles' | 'Units';
  machineCost: number;
  overheadCost: number;
  operatorId?: string;
  operatorName?: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  notes?: string;
}

export interface QcInspection {
  id: string;
  inspectionNumber: string;
  workOrderId: string;
  workOrder?: WorkOrder;
  workOrderNumber: string;
  operationId?: string;
  operation?: WorkOrderOperation;
  inspectionType: 'FirstArticle' | 'InProcess' | 'Final' | 'Receiving' | 'Shipping';
  inspectionDate: string;
  inspectorId: string;
  inspectorName: string;
  quantityInspected: number;
  quantityPassed: number;
  quantityFailed: number;
  quantityRework: number;
  sampleSize: number;
  aqlLevel?: string;
  status: 'Pending' | 'InProgress' | 'Passed' | 'Failed' | 'ConditionalPass';
  disposition: 'Accept' | 'Reject' | 'Rework' | 'Scrap' | 'ReturnToVendor' | 'UseAsIs';
  defectNotes?: string;
  correctiveAction?: string;
  specifications?: QcSpecification[];
  measurements?: QcMeasurement[];
  companyId: string;
}

export interface QcSpecification {
  id: string;
  characteristic: string;
  specification: string;
  lowerLimit?: number;
  upperLimit?: number;
  target?: number;
  unitOfMeasure: string;
}

export interface QcMeasurement {
  id: string;
  specificationId: string;
  specification?: QcSpecification;
  sampleNumber: number;
  measuredValue: number;
  passed: boolean;
  notes?: string;
}

export interface WorkOrderCompletion {
  id: string;
  completionNumber: string;
  workOrderId: string;
  workOrder?: WorkOrder;
  workOrderNumber: string;
  completionDate: string;
  quantityCompleted: number;
  quantityScrapped: number;
  quantityRework: number;
  finishedGoodsWarehouseId: string;
  finishedGoodsWarehouse?: Warehouse;
  binLocation?: string;
  lotNumber?: string;
  serialNumbers?: string[];
  totalMaterialCost: number;
  totalLaborCost: number;
  totalMachineCost: number;
  totalOverheadCost: number;
  totalActualCost: number;
  standardCost: number;
  variance: number;
  status: 'Draft' | 'Posted' | 'Reversed';
  postedBy?: string;
  postedDate?: string;
  glJournalId?: string;
  notes?: string;
  companyId: string;
}

export interface JobCosting {
  workOrderId: string;
  workOrderNumber: string;
  productName: string;
  quantityProduced: number;
  standardCosts: {
    material: number;
    labor: number;
    machine: number;
    overhead: number;
    total: number;
    perUnit: number;
  };
  actualCosts: {
    material: number;
    labor: number;
    machine: number;
    overhead: number;
    total: number;
    perUnit: number;
  };
  variances: {
    material: { price: number; usage: number; total: number };
    labor: { rate: number; efficiency: number; total: number };
    overhead: { spending: number; volume: number; total: number };
    total: number;
  };
  wipValuation: {
    openingWip: number;
    currentPeriodCosts: number;
    completedGoods: number;
    closingWip: number;
  };
  absorption: {
    laborHoursAbsorbed: number;
    machineHoursAbsorbed: number;
    overheadAbsorbed: number;
    overheadRatePerLaborHour: number;
    overheadRatePerMachineHour: number;
  };
}

export interface ProductionSchedule {
  id: string;
  workOrderId: string;
  workOrder?: WorkOrder;
  workOrderNumber: string;
  productName: string;
  operationId: string;
  operation?: WorkOrderOperation;
  operationName: string;
  workCenterId: string;
  workCenter?: WorkCenter;
  workCenterName: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: 'Scheduled' | 'Dispatched' | 'InProgress' | 'Completed' | 'Delayed';
  priority: number;
  constraints: string[];
}

export interface SubcontractOrder {
  id: string;
  orderNumber: string;
  workOrderId: string;
  workOrder?: WorkOrder;
  workOrderNumber: string;
  operationId: string;
  operation?: WorkOrderOperation;
  operationName: string;
  vendorId: string;
  vendorName: string;
  orderDate: string;
  promisedDate: string;
  actualReceiptDate?: string;
  quantitySent: number;
  quantityReceived: number;
  quantityRejected: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  status: 'Draft' | 'Sent' | 'PartialReceipt' | 'Received' | 'Closed' | 'Cancelled';
  lines: SubcontractOrderLine[];
  companyId: string;
}

export interface SubcontractOrderLine {
  id: string;
  orderId: string;
  productId: string;
  product?: Product;
  productCode: string;
  productName: string;
  quantitySent: number;
  quantityReceived: number;
  unitCost: number;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  type: 'RawMaterial' | 'WorkInProcess' | 'FinishedGoods' | 'Transit' | 'Scrap';
  isDefault: boolean;
  locationId?: string;
}

export interface FixedAsset {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  serialNumber?: string;
  modelNumber?: string;
  locationId?: string;
  departmentId?: string;
  status: 'Active' | 'Maintenance' | 'Retired' | 'Disposed';
  acquisitionCost: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  meterReading: number;
  meterUnit: 'Hours' | 'Cycles' | 'Kilometers' | 'Units';
}

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  departmentId?: string;
  departmentName?: string;
  position?: string;
  hourlyRate: number;
  overtimeRate: number;
  isActive: boolean;
}

export interface Vendor {
  id: string;
  vendorCode: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  currency: string;
  paymentTerms?: string;
  isActive: boolean;
}

export interface ManufacturingFilters {
  search?: string;
  status?: string[];
  productId?: string;
  workCenterId?: string;
  dateFrom?: string;
  dateTo?: string;
  priority?: string[];
  assignedTo?: string;
}

export interface ManufacturingKpis {
  totalWorkOrders: number;
  activeWorkOrders: number;
  completedThisMonth: number;
  onTimeDeliveryRate: number;
  scrapRate: number;
  reworkRate: number;
  wipValue: number;
  totalVariance: number;
  machineUtilization: number;
  laborEfficiency: number;
  firstPassYield: number;
  averageLeadTime: number;
  capacityUtilization: number;
}