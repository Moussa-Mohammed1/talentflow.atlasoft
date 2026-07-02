export interface Department {
  id: number;
  name: string;
  required_exp_years: number;
  required_skills: string[];
  created_at: string | null;
}

export interface DepartmentCreateRequest {
  name: string;
  required_exp_years: number;
  required_skills?: string;
}

export interface DepartmentUpdateRequest {
  name?: string;
  required_exp_years?: number;
  required_skills?: string;
}
