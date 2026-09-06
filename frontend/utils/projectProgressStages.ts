export type ProjectStageConfiguration = {
  progressStageCodes?: readonly string[] | null;
};

/**
 * Empty configuration belongs to a legacy project and intentionally enables
 * every available stage. New projects must persist at least one stage.
 */
export function isProjectStageEnabled(
  project: ProjectStageConfiguration | undefined,
  stageCode: string,
) {
  const configuredCodes = project?.progressStageCodes ?? [];
  return !configuredCodes.length || configuredCodes.includes(stageCode);
}

export function collectProjectStageCodes(
  projects: readonly ProjectStageConfiguration[],
  legacyStageCodes: readonly string[],
) {
  const result = new Set<string>();
  for (const project of projects) {
    const configuredCodes = project.progressStageCodes ?? [];
    for (const code of configuredCodes.length ? configuredCodes : legacyStageCodes) {
      result.add(code);
    }
  }
  return result;
}
