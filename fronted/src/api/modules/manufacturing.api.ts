import { apiClient } from '../client';
import type {
  Bom,
  BomLine,
  Routing,
  RoutingOperation,
  WorkOrder,
  WorkOrderLine,
  WorkOrderOperation,
  WorkOrderCompletion,
  MaterialIssue,
  MaterialIssueLine,
  LaborEntry,
  MachineTimeEntry,
  QcInspection,
  QcSpecification,
  QcMeasurement,
  WorkCenter,
  JobCosting,
  ProductionSchedule,
  SubcontractOrder,
  SubcontractOrderLine,
  ManufacturingFilters,
  ManufacturingKpis,
  Product,
} from '@/types/manufacturing';

export type {
  Bom,
  Bom as BillOfMaterials,
  BomLine,
  Routing,
  RoutingOperation,
  WorkOrder,
  WorkOrderLine,
  WorkOrderOperation,
  WorkOrderCompletion,
  MaterialIssue,
  MaterialIssueLine,
  LaborEntry,
  MachineTimeEntry,
  QcInspection,
  QcSpecification,
  QcMeasurement,
  WorkCenter,
  JobCosting,
  ProductionSchedule,
  SubcontractOrder,
  SubcontractOrderLine,
  ManufacturingFilters,
  ManufacturingKpis,
};

const BASE = '/manufacturing';

export const manufacturingApi = {
  // ==================== BOM ====================
  getBoms: async (companyId: string, filters?: ManufacturingFilters): Promise<Bom[]> => {
    const params = new URLSearchParams({ companyId, ...filters as any });
    return apiClient<Bom[]>(`${BASE}/boms?${params}`);
  },

  getBom: async (id: string): Promise<Bom> => {
    return apiClient<Bom>(`${BASE}/boms/${id}`);
  },

  createBom: async (data: Partial<Bom>): Promise<Bom> => {
    return apiClient<Bom>(`${BASE}/boms`, { method: 'POST', body: JSON.stringify(data) });
  },

  updateBom: async (id: string, data: Partial<Bom>): Promise<Bom> => {
    return apiClient<Bom>(`${BASE}/boms/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  approveBom: async (id: string): Promise<Bom> => {
    return apiClient<Bom>(`${BASE}/boms/${id}/approve`, { method: 'POST' });
  },

  reviseBom: async (id: string, revision: string): Promise<Bom> => {
    return apiClient<Bom>(`${BASE}/boms/${id}/revise`, { method: 'POST', body: JSON.stringify({ revision }) });
  },

  deleteBom: async (id: string): Promise<void> => {
    return apiClient<void>(`${BASE}/boms/${id}`, { method: 'DELETE' });
  },

  getBomCostRollup: async (id: string): Promise<{ material: number; labor: number; overhead: number; total: number }> => {
    return apiClient(`${BASE}/boms/${id}/cost-rollup`);
  },

  copyBom: async (id: string, newProductId: string): Promise<Bom> => {
    return apiClient<Bom>(`${BASE}/boms/${id}/copy`, { method: 'POST', body: JSON.stringify({ newProductId }) });
  },

  // ==================== Routing ====================
  getRoutings: async (companyId: string, filters?: ManufacturingFilters): Promise<Routing[]> => {
    const params = new URLSearchParams({ companyId, ...filters as any });
    return apiClient<Routing[]>(`${BASE}/routings?${params}`);
  },

  getRouting: async (id: string): Promise<Routing> => {
    return apiClient<Routing>(`${BASE}/routings/${id}`);
  },

  createRouting: async (data: Partial<Routing>): Promise<Routing> => {
    return apiClient<Routing>(`${BASE}/routings`, { method: 'POST', body: JSON.stringify(data) });
  },

  updateRouting: async (id: string, data: Partial<Routing>): Promise<Routing> => {
    return apiClient<Routing>(`${BASE}/routings/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  approveRouting: async (id: string): Promise<Routing> => {
    return apiClient<Routing>(`${BASE}/routings/${id}/approve`, { method: 'POST' });
  },

  deleteRouting: async (id: string): Promise<void> => {
    return apiClient<void>(`${BASE}/routings/${id}`, { method: 'DELETE' });
  },

  getWorkCenters: async (companyId: string): Promise<WorkCenter[]> => {
    return apiClient<WorkCenter[]>(`${BASE}/work-centers?companyId=${companyId}`);
  },

  createWorkCenter: async (data: Partial<WorkCenter>): Promise<WorkCenter> => {
    return apiClient<WorkCenter>(`${BASE}/work-centers`, { method: 'POST', body: JSON.stringify(data) });
  },

  updateWorkCenter: async (id: string, data: Partial<WorkCenter>): Promise<WorkCenter> => {
    return apiClient<WorkCenter>(`${BASE}/work-centers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  // ==================== Work Orders ====================
  getWorkOrders: async (companyId: string, filters?: ManufacturingFilters): Promise<WorkOrder[]> => {
    const params = new URLSearchParams({ companyId, ...filters as any });
    return apiClient<WorkOrder[]>(`${BASE}/work-orders?${params}`);
  },

  getWorkOrder: async (id: string): Promise<WorkOrder> => {
    return apiClient<WorkOrder>(`${BASE}/work-orders/${id}`);
  },

  createWorkOrder: async (data: Partial<WorkOrder>): Promise<WorkOrder> => {
    return apiClient<WorkOrder>(`${BASE}/work-orders`, { method: 'POST', body: JSON.stringify(data) });
  },

  updateWorkOrder: async (id: string, data: Partial<WorkOrder>): Promise<WorkOrder> => {
    return apiClient<WorkOrder>(`${BASE}/work-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  releaseWorkOrder: async (id: string): Promise<WorkOrder> => {
    return apiClient<WorkOrder>(`${BASE}/work-orders/${id}/release`, { method: 'POST' });
  },

  startWorkOrder: async (id: string): Promise<WorkOrder> => {
    return apiClient<WorkOrder>(`${BASE}/work-orders/${id}/start`, { method: 'POST' });
  },

  holdWorkOrder: async (id: string, reason: string): Promise<WorkOrder> => {
    return apiClient<WorkOrder>(`${BASE}/work-orders/${id}/hold`, { method: 'POST', body: JSON.stringify({ reason }) });
  },

  resumeWorkOrder: async (id: string): Promise<WorkOrder> => {
    return apiClient<WorkOrder>(`${BASE}/work-orders/${id}/resume`, { method: 'POST' });
  },

  cancelWorkOrder: async (id: string, reason: string): Promise<WorkOrder> => {
    return apiClient<WorkOrder>(`${BASE}/work-orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
  },

  closeWorkOrder: async (id: string): Promise<WorkOrder> => {
    return apiClient<WorkOrder>(`${BASE}/work-orders/${id}/close`, { method: 'POST' });
  },

  deleteWorkOrder: async (id: string): Promise<void> => {
    return apiClient<void>(`${BASE}/work-orders/${id}`, { method: 'DELETE' });
  },

  // Work Order Lines
  issueMaterialToWorkOrder: async (workOrderId: string, lines: Partial<MaterialIssueLine>[]): Promise<MaterialIssue> => {
    return apiClient<MaterialIssue>(`${BASE}/work-orders/${workOrderId}/issue-material`, {
      method: 'POST',
      body: JSON.stringify({ lines }),
    });
  },

  returnMaterialFromWorkOrder: async (workOrderId: string, lines: Partial<MaterialIssueLine>[]): Promise<MaterialIssue> => {
    return apiClient<MaterialIssue>(`${BASE}/work-orders/${workOrderId}/return-material`, {
      method: 'POST',
      body: JSON.stringify({ lines }),
    });
  },

  backflushWorkOrder: async (workOrderId: string): Promise<MaterialIssue> => {
    return apiClient<MaterialIssue>(`${BASE}/work-orders/${workOrderId}/backflush`, { method: 'POST' });
  },

  // Work Order Operations
  startOperation: async (workOrderId: string, operationId: string, data: Partial<WorkOrderOperation>): Promise<WorkOrderOperation> => {
    return apiClient<WorkOrderOperation>(`${BASE}/work-orders/${workOrderId}/operations/${operationId}/start`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  completeOperation: async (workOrderId: string, operationId: string, data: Partial<WorkOrderOperation>): Promise<WorkOrderOperation> => {
    return apiClient<WorkOrderOperation>(`${BASE}/work-orders/${workOrderId}/operations/${operationId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  scrapOperation: async (workOrderId: string, operationId: string, quantity: number, reason: string): Promise<WorkOrderOperation> => {
    return apiClient<WorkOrderOperation>(`${BASE}/work-orders/${workOrderId}/operations/${operationId}/scrap`, {
      method: 'POST',
      body: JSON.stringify({ quantity, reason }),
    });
  },

  // ==================== Material Issuance ====================
  getMaterialIssues: async (companyId: string, filters?: ManufacturingFilters): Promise<MaterialIssue[]> => {
    const params = new URLSearchParams({ companyId, ...filters as any });
    return apiClient<MaterialIssue[]>(`${BASE}/material-issues?${params}`);
  },

  getMaterialIssue: async (id: string): Promise<MaterialIssue> => {
    return apiClient<MaterialIssue>(`${BASE}/material-issues/${id}`);
  },

  createMaterialIssue: async (data: Partial<MaterialIssue>): Promise<MaterialIssue> => {
    return apiClient<MaterialIssue>(`${BASE}/material-issues`, { method: 'POST', body: JSON.stringify(data) });
  },

  postMaterialIssue: async (id: string): Promise<MaterialIssue> => {
    return apiClient<MaterialIssue>(`${BASE}/material-issues/${id}/post`, { method: 'POST' });
  },

  printPickList: async (issueId: string): Promise<Blob> => {
    return (apiClient as any)(`${BASE}/material-issues/${issueId}/pick-list`, { method: 'GET', responseType: 'blob' });
  },

  // ==================== Labor & Machine Time ====================
  getLaborEntries: async (companyId: string, filters?: ManufacturingFilters): Promise<LaborEntry[]> => {
    const params = new URLSearchParams({ companyId, ...filters as any });
    return apiClient<LaborEntry[]>(`${BASE}/labor-entries?${params}`);
  },

  createLaborEntry: async (data: Partial<LaborEntry>): Promise<LaborEntry> => {
    return apiClient<LaborEntry>(`${BASE}/labor-entries`, { method: 'POST', body: JSON.stringify(data) });
  },

  updateLaborEntry: async (id: string, data: Partial<LaborEntry>): Promise<LaborEntry> => {
    return apiClient<LaborEntry>(`${BASE}/labor-entries/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  approveLaborEntry: async (id: string): Promise<LaborEntry> => {
    return apiClient<LaborEntry>(`${BASE}/labor-entries/${id}/approve`, { method: 'POST' });
  },

  getMachineTimeEntries: async (companyId: string, filters?: ManufacturingFilters): Promise<MachineTimeEntry[]> => {
    const params = new URLSearchParams({ companyId, ...filters as any });
    return apiClient<MachineTimeEntry[]>(`${BASE}/machine-time?${params}`);
  },

  createMachineTimeEntry: async (data: Partial<MachineTimeEntry>): Promise<MachineTimeEntry> => {
    return apiClient<MachineTimeEntry>(`${BASE}/machine-time`, { method: 'POST', body: JSON.stringify(data) });
  },

  updateMachineTimeEntry: async (id: string, data: Partial<MachineTimeEntry>): Promise<MachineTimeEntry> => {
    return apiClient<MachineTimeEntry>(`${BASE}/machine-time/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  approveMachineTimeEntry: async (id: string): Promise<MachineTimeEntry> => {
    return apiClient<MachineTimeEntry>(`${BASE}/machine-time/${id}/approve`, { method: 'POST' });
  },

  // ==================== Quality Control ====================
  getQcInspections: async (companyId: string, filters?: ManufacturingFilters): Promise<QcInspection[]> => {
    const params = new URLSearchParams({ companyId, ...filters as any });
    return apiClient<QcInspection[]>(`${BASE}/qc-inspections?${params}`);
  },

  getQcInspection: async (id: string): Promise<QcInspection> => {
    return apiClient<QcInspection>(`${BASE}/qc-inspections/${id}`);
  },

  createQcInspection: async (data: Partial<QcInspection>): Promise<QcInspection> => {
    return apiClient<QcInspection>(`${BASE}/qc-inspections`, { method: 'POST', body: JSON.stringify(data) });
  },

  updateQcInspection: async (id: string, data: Partial<QcInspection>): Promise<QcInspection> => {
    return apiClient<QcInspection>(`${BASE}/qc-inspections/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  performQcInspection: async (id: string, data: Partial<QcInspection>): Promise<QcInspection> => {
    return apiClient<QcInspection>(`${BASE}/qc-inspections/${id}/perform`, { method: 'POST', body: JSON.stringify(data) });
  },

  getQcSpecifications: async (productId: string): Promise<QcSpecification[]> => {
    return apiClient<QcSpecification[]>(`${BASE}/qc-specifications?productId=${productId}`);
  },

  createQcSpecification: async (data: Partial<QcSpecification>): Promise<QcSpecification> => {
    return apiClient<QcSpecification>(`${BASE}/qc-specifications`, { method: 'POST', body: JSON.stringify(data) });
  },

  // ==================== Work Order Completion ====================
  getCompletions: async (companyId: string, filters?: ManufacturingFilters): Promise<WorkOrderCompletion[]> => {
    const params = new URLSearchParams({ companyId, ...filters as any });
    return apiClient<WorkOrderCompletion[]>(`${BASE}/completions?${params}`);
  },

  getCompletion: async (id: string): Promise<WorkOrderCompletion> => {
    return apiClient<WorkOrderCompletion>(`${BASE}/completions/${id}`);
  },

  createCompletion: async (data: Partial<WorkOrderCompletion>): Promise<WorkOrderCompletion> => {
    return apiClient<WorkOrderCompletion>(`${BASE}/completions`, { method: 'POST', body: JSON.stringify(data) });
  },

  postCompletion: async (id: string): Promise<WorkOrderCompletion> => {
    return apiClient<WorkOrderCompletion>(`${BASE}/completions/${id}/post`, { method: 'POST' });
  },

  reverseCompletion: async (id: string, reason: string): Promise<WorkOrderCompletion> => {
    return apiClient<WorkOrderCompletion>(`${BASE}/completions/${id}/reverse`, { method: 'POST', body: JSON.stringify({ reason }) });
  },

  // ==================== Job Costing ====================
  getJobCosting: async (workOrderId: string): Promise<JobCosting> => {
    return apiClient<JobCosting>(`${BASE}/job-costing/${workOrderId}`);
  },

  getJobCostingReport: async (companyId: string, filters?: ManufacturingFilters): Promise<JobCosting[]> => {
    const params = new URLSearchParams({ companyId, ...filters as any });
    return apiClient<JobCosting[]>(`${BASE}/job-costing/report?${params}`);
  },

  getWipValuation: async (companyId: string, date: string): Promise<any> => {
    return apiClient(`${BASE}/wip-valuation?companyId=${companyId}&date=${date}`);
  },

  getVarianceAnalysis: async (companyId: string, filters?: ManufacturingFilters): Promise<any[]> => {
    const params = new URLSearchParams({ companyId, ...filters as any });
    return apiClient<any[]>(`${BASE}/variance-analysis?${params}`);
  },

  // ==================== Production Scheduling ====================
  getProductionSchedule: async (companyId: string, dateFrom: string, dateTo: string): Promise<ProductionSchedule[]> => {
    return apiClient<ProductionSchedule[]>(`${BASE}/schedule?companyId=${companyId}&from=${dateFrom}&to=${dateTo}`);
  },

  updateProductionSchedule: async (schedule: ProductionSchedule[]): Promise<ProductionSchedule[]> => {
    return apiClient<ProductionSchedule[]>(`${BASE}/schedule`, { method: 'PUT', body: JSON.stringify(schedule) });
  },

  dispatchSchedule: async (id: string): Promise<ProductionSchedule> => {
    return apiClient<ProductionSchedule>(`${BASE}/schedule/${id}/dispatch`, { method: 'POST' });
  },

  getFiniteSchedule: async (companyId: string, workCenterIds: string[], horizonDays: number): Promise<any> => {
    return apiClient(`${BASE}/schedule/finite?companyId=${companyId}&workCenters=${workCenterIds.join(',')}&horizon=${horizonDays}`);
  },

  // ==================== Subcontracting ====================
  getSubcontractOrders: async (companyId: string, filters?: ManufacturingFilters): Promise<SubcontractOrder[]> => {
    const params = new URLSearchParams({ companyId, ...filters as any });
    return apiClient<SubcontractOrder[]>(`${BASE}/subcontract?${params}`);
  },

  createSubcontractOrder: async (data: Partial<SubcontractOrder>): Promise<SubcontractOrder> => {
    return apiClient<SubcontractOrder>(`${BASE}/subcontract`, { method: 'POST', body: JSON.stringify(data) });
  },

  receiveSubcontractOrder: async (id: string, lines: Partial<SubcontractOrderLine>[]): Promise<SubcontractOrder> => {
    return apiClient<SubcontractOrder>(`${BASE}/subcontract/${id}/receive`, { method: 'POST', body: JSON.stringify({ lines }) });
  },

  // ==================== KPIs & Analytics ====================
  getManufacturingKpis: async (companyId: string, dateFrom?: string, dateTo?: string): Promise<ManufacturingKpis> => {
    const params = new URLSearchParams({ companyId });
    if (dateFrom) params.append('from', dateFrom);
    if (dateTo) params.append('to', dateTo);
    return apiClient<ManufacturingKpis>(`${BASE}/kpis?${params}`);
  },

  getShopFloorStatus: async (companyId: string): Promise<any[]> => {
    return apiClient<any[]>(`${BASE}/shop-floor/status?companyId=${companyId}`);
  },

  getCapacityPlan: async (companyId: string, dateFrom: string, dateTo: string): Promise<any> => {
    return apiClient(`${BASE}/capacity-plan?companyId=${companyId}&from=${dateFrom}&to=${dateTo}`);
  },

  // ==================== Products (Manufacturing specific) ====================
  getManufacturingProducts: async (companyId: string): Promise<Product[]> => {
    return apiClient<Product[]>(`${BASE}/products?companyId=${companyId}&types=FinishedGood,RawMaterial,SubAssembly`);
  },
};

export default manufacturingApi;