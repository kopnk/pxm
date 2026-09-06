import { computed, reactive, ref } from "vue";
import type { Project } from "@/stores/projects";
import { apiFetch } from "~/utils/apiFetch";
import { useProgressStageApi } from "@/composables/useProgressStageApi";
import type { ProgressStage } from "@/stores/progressStage";

type ProjectStatus = "active" | "closed" | "cancelled";

export interface ProjectFormState {
  contractNumber: string;
  prScNumber: string;
  poNumber: string;
  poDate: string;
  deliveryDate: string;
  komDate: string;
  projectName: string;
  subTotal: number;
  hpp: number;
  dpp: number;
  mrg: number;
  discount: number;
  vatRate: number;
  status: ProjectStatus;
  pm: string;
  clientId: string;
  progressStageCodes: string[];
}

interface ClientOption {
  id: string;
  name: string;
}

const defaultProjectForm = (): ProjectFormState => ({
  contractNumber: "",
  prScNumber: "",
  poNumber: "",
  poDate: "",
  deliveryDate: "",
  komDate: "",
  projectName: "",
  subTotal: 0,
  hpp: 0,
  dpp: 0,
  mrg: 0,
  discount: 0,
  vatRate: 11,
  status: "active",
  pm: "",
  clientId: "",
  progressStageCodes: [],
});

export const useProjectForm = () => {
  const form = reactive<ProjectFormState>(defaultProjectForm());
  const clients = ref<ClientOption[]>([]);
  const clientsLoading = ref(false);
  const clientsError = ref<string | null>(null);
  const progressStages = ref<ProgressStage[]>([]);
  const progressStagesLoading = ref(false);
  const progressStagesError = ref<string | null>(null);
  const { getProgressStages } = useProgressStageApi();

  const isValid = computed(() => {
    return (
      form.projectName.trim().length >= 3 &&
      form.prScNumber.trim().length > 0 &&
      form.poNumber.trim().length > 0 &&
      form.poDate !== ""
    );
  });

  const netPrice = computed(
    () => Number(form.subTotal || 0) - Number(form.discount || 0),
  );

  const vatAmount = computed(
    () => netPrice.value * (Number(form.vatRate || 0) / 100),
  );

  const grandTotal = computed(() => netPrice.value + vatAmount.value);

  const formatCurrency = (value: string | number | null | undefined) => {
    const numberValue = Number(value || 0);
    return Number.isNaN(numberValue)
      ? "0"
      : numberValue.toLocaleString("id-ID", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        });
  };

  const netPriceDisplay = computed(() => formatCurrency(netPrice.value));
  const vatAmountDisplay = computed(() => formatCurrency(vatAmount.value));
  const grandTotalDisplay = computed(() => formatCurrency(grandTotal.value));

  const loadClientOptions = async () => {
    clientsLoading.value = true;
    clientsError.value = null;

    try {
      const res: any = await apiFetch("/api/clients", {
        query: { limit: 500 },
      });

      clients.value = (res.data?.items ?? []).map((client: any) => ({
        id: client.id,
        name: client.name,
      }));
    } catch (err: any) {
      clientsError.value =
        err?.data?.message || err?.message || "Failed to load clients";
      throw err;
    } finally {
      clientsLoading.value = false;
    }
  };

  const loadProgressStageOptions = async () => {
    progressStagesLoading.value = true;
    progressStagesError.value = null;
    try {
      const res: any = await getProgressStages({ limit: 1000, isActive: true });
      progressStages.value = [...(res.data?.items ?? [])].sort(
        (a: ProgressStage, b: ProgressStage) => a.sequence - b.sequence,
      );
    } catch (err: any) {
      progressStagesError.value =
        err?.data?.message || err?.message || "Failed to load progress stages";
      throw err;
    } finally {
      progressStagesLoading.value = false;
    }
  };

  const fillFromProject = (project: Project) => {
    Object.assign(form, {
      contractNumber: project.contractNumber ?? "",
      prScNumber: project.prScNumber ?? "",
      poNumber: project.poNumber ?? "",
      poDate: project.poDate?.substring(0, 10) ?? "",
      deliveryDate: project.deliveryDate?.substring(0, 10) ?? "",
      komDate: project.komDate?.substring(0, 10) ?? "",
      projectName: project.projectName ?? "",
      subTotal: Number(project.subTotal ?? 0),
      hpp: Number(project.hpp ?? 0),
      dpp: Number(project.dpp ?? 0),
      mrg: Number(project.mrg ?? 0),
      discount: Number(project.discount ?? 0),
      vatRate: Number(project.vatRate ?? 11),
      status: (project.status ?? "active") as ProjectStatus,
      pm: project.pm ?? "",
      clientId: project.clientId ?? "",
      progressStageCodes: [...(project.progressStageCodes ?? [])],
    });
  };

  const buildPayload = () => ({
    contractNumber: form.contractNumber.trim() || null,
    prScNumber: form.prScNumber.trim(),
    poNumber: form.poNumber.trim(),
    poDate: form.poDate,
    deliveryDate: form.deliveryDate || null,
    komDate: form.komDate || null,
    projectName: form.projectName.trim(),
    subTotal: Number(form.subTotal || 0),
    discount: Number(form.discount || 0),
    vatRate: Number(form.vatRate || 0),
    status: form.status,
    pm: form.pm.trim(),
    clientId: form.clientId || null,
    progressStageCodes: [...form.progressStageCodes],
  });

  const resetForm = () => {
    Object.assign(form, defaultProjectForm());
  };

  return {
    form,
    clients,
    clientsLoading,
    clientsError,
    progressStages,
    progressStagesLoading,
    progressStagesError,
    isValid,
    netPrice,
    vatAmount,
    grandTotal,
    netPriceDisplay,
    vatAmountDisplay,
    grandTotalDisplay,
    formatCurrency,
    loadClientOptions,
    loadProgressStageOptions,
    fillFromProject,
    buildPayload,
    resetForm,
  };
};
