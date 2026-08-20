import { computed, reactive, ref, watch } from "vue";
import type { RegionType } from "@/stores/regionMaster";
import { useRegionMasterApi } from "@/composables/useRegionMasterApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessCreated, toastSuccessUpdated } from "@/composables/useToastMessages";
import { getApiErrorMessage } from "@/lib/apiError";
import { useNotify } from "@/composables/useNotify";

type RegionFormInitial = {
  id?: string;
  name?: string;
  type?: RegionType;
  parentId?: string | null;
};

export const REGION_TYPE_LABELS: Record<RegionType, string> = {
  region: "Region",
  sub_region: "Sub Region",
  city_kab: "City / Kab",
};

export const useRegionForm = (mode: "create" | "update", initial?: RegionFormInitial) => {
  const { createRegion, updateRegion, getParentOptions } = useRegionMasterApi();
  const { loading, handle } = useFormHandler();
  const notify = useNotify();

  const form = reactive({
    name: initial?.name ?? "",
    type: (initial?.type ?? "region") as RegionType,
    parentId: initial?.parentId ?? "",
  });

  const parentOptions = ref<{ id: string; name: string }[]>([]);
  const parentsLoading = ref(false);
  const parentsLoadError = ref<string | null>(null);

  const showParent = computed(() => form.type !== "region");

  const parentPlaceholder = computed(() => {
    if (parentsLoading.value) return "Loading…";
    if (parentsLoadError.value) return "Failed to load parents";
    if (!parentOptions.value.length) return "No parent available";
    return "Select parent";
  });

  const loadParents = async () => {
    if (form.type === "region") {
      parentOptions.value = [];
      form.parentId = "";
      parentsLoadError.value = null;
      return;
    }

    parentsLoading.value = true;
    parentsLoadError.value = null;

    try {
      parentOptions.value = await getParentOptions(form.type);
      if (
        form.parentId &&
        !parentOptions.value.some((item) => item.id === form.parentId)
      ) {
        form.parentId = "";
      }
    } catch (err) {
      parentOptions.value = [];
      form.parentId = "";
      parentsLoadError.value = getApiErrorMessage(err, "Failed to load parent options");
      notify.error(parentsLoadError.value);
    } finally {
      parentsLoading.value = false;
    }
  };

  watch(
    () => form.type,
    () => {
      void loadParents();
    },
    { immediate: true },
  );

  const submitCreate = async () => {
    await handle(async () => {
      await createRegion({
        name: form.name.trim(),
        type: form.type,
        parentId: form.type === "region" ? null : form.parentId || null,
      });
      await navigateTo("/regions");
    }, toastSuccessCreated("region"));
  };

  const submitUpdate = async (id: string) => {
    await handle(async () => {
      await updateRegion(id, {
        name: form.name.trim(),
        type: form.type,
        parentId: form.type === "region" ? null : form.parentId || null,
      });
      await navigateTo("/regions");
    }, toastSuccessUpdated("region"));
  };

  return {
    form,
    parentOptions,
    parentsLoading,
    parentsLoadError,
    parentPlaceholder,
    showParent,
    loading,
    submitCreate,
    submitUpdate,
  };
};
