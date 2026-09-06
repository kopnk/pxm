export type ProjectSelectSource = {
  id: string;
  projectName?: string | null;
  poNumber?: string | null;
  progressStageCodes?: string[];
};

export type ProjectSelectOption = {
  value: string;
  label: string;
};

export const formatProjectSelectLabel = (project: ProjectSelectSource) => {
  const name = project.projectName?.trim() || "Unnamed project";
  const poNumber = project.poNumber?.trim();
  return poNumber ? `${name} - ${poNumber}` : name;
};

export const toProjectSelectOptions = (
  projects: readonly ProjectSelectSource[],
): ProjectSelectOption[] =>
  projects.map((project) => ({
    value: project.id,
    label: formatProjectSelectLabel(project),
  }));
