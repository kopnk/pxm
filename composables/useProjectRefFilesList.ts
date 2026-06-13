import { ref, computed, type MaybeRefOrGetter, toValue } from "vue";
import { useAuthStore } from "@/stores/auth";
import {
  useProjectFilesApi,
  type ProjectFileItem,
} from "@/composables/useProjectFilesApi";
import { useNotify } from "@/composables/useNotify";

export function useProjectRefFilesList(
  refTable: string,
  refId: MaybeRefOrGetter<string | undefined>,
) {
  const { getProjectFiles, deleteProjectFile } = useProjectFilesApi();
  const auth = useAuthStore();
  const notify = useNotify();

  const projectFiles = ref<ProjectFileItem[]>([]);
  const deletingFileId = ref<string | null>(null);
  const canDelete = computed(() => auth.user?.role === "superadmin");

  const docsForCategory = (category: string) =>
    projectFiles.value.filter((file) => file.fileCategory === category);

  const load = async () => {
    const id = toValue(refId)?.trim();
    if (!id) return;

    projectFiles.value = await getProjectFiles({
      refTable,
      refId: id,
      limit: 100,
    });
  };

  const remove = async (fileId: string) => {
    if (!canDelete.value) return;
    if (!window.confirm("Delete this document permanently?")) return;

    deletingFileId.value = fileId;
    try {
      await deleteProjectFile(fileId);
      await load();
      notify.success("Document deleted");
    } catch (err: any) {
      notify.error(err?.data?.message || err?.message || "Delete failed");
    } finally {
      deletingFileId.value = null;
    }
  };

  return {
    projectFiles,
    deletingFileId,
    canDelete,
    docsForCategory,
    load,
    remove,
  };
}
