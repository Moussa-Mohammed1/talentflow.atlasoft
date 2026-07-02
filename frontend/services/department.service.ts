import api from "@/lib/axios";
import type { Department, DepartmentCreateRequest, DepartmentUpdateRequest } from "@/types/department";

export const DepartmentService = {
  async list(): Promise<Department[]> {
    const response = await api.get<Department[]>("/departments");
    return response.data;
  },

  async getById(id: number): Promise<Department> {
    const response = await api.get<Department>(`/departments/${id}`);
    return response.data;
  },

  async create(data: DepartmentCreateRequest): Promise<Department> {
    const response = await api.post<Department>("/departments", data);
    return response.data;
  },

  async update(id: number, data: DepartmentUpdateRequest): Promise<Department> {
    const response = await api.patch<Department>(`/departments/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/departments/${id}`);
  },
};
