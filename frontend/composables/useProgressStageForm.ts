import { reactive } from "vue";
import type { ProgressStage } from "@/stores/progressStage";

export type ProgressStageForm = {
  code: string;
  name: string;
  stageType: "admin" | "field" | "document";
  sequence: number;
  isActive: boolean;
};

export function useProgressStageForm() {
  const form = reactive<ProgressStageForm>({
    code: "",
    name: "",
    stageType: "document",
    sequence: 1,
    isActive: true,
  });

  const fillForm = (stage: Partial<ProgressStage>) => {
    form.code = stage.code ?? "";
    form.name = stage.name ?? "";
    form.stageType = stage.stageType ?? "document";
    form.sequence = Number(stage.sequence ?? 1) || 1;
    form.isActive = stage.isActive ?? true;
  };

  const toPayload = () => ({
    code: form.code.trim().toLowerCase(),
    name: form.name.trim(),
    stageType: form.stageType,
    sequence: Number(form.sequence) || 1,
    isActive: form.isActive,
  });

  return {
    form,
    fillForm,
    toPayload,
  };
}
