import { ref, computed, type MaybeRefOrGetter, toValue } from "vue";
import { useAuthStore } from "@/stores/auth";
import {
  useProjectFilesApi,
  type ProjectFileItem,
} from "@/composables/useProjectFilesApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { confirmDeleteDocumentMessage } from "@/lib/entityMessages";

export function useProjectRefFilesList(
  refTable: string,
  refId: MaybeRefOrGetter<string | undefined>,
) {
  const { getProjectFiles, deleteProjectFile } = useProjectFilesApi();
  const auth = useAuthStore();
  const { handle } = useFormHandler();

  const projectFiles = ref<ProjectFileItem[]>([]);
  const deletingFileId = ref<string | null>(null);
  const showDeleteModal = ref(false);
  const deleteTargetId = ref<string | null>(null);
  const canDelete = computed(() => auth.user?.role === "superadmin");
  const deleteTargetFile = computed(() =>
    projectFiles.value.find((file) => file.id === deleteTargetId.value),
  );

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

  const requestDelete = (fileId: string) => {
    if (!canDelete.value) return;
    deleteTargetId.value = fileId;
    showDeleteModal.value = true;
  };

  const cancelDelete = () => {
    if (deletingFileId.value) return;
    showDeleteModal.value = false;
    deleteTargetId.value = null;
  };

  const remove = async () => {
    if (!canDelete.value || !deleteTargetId.value) return;

    const fileId = deleteTargetId.value;

    try {
      await handle(async () => {
        deletingFileId.value = fileId;
        const response = await deleteProjectFile(fileId);
        await load();
        return response;
      });
      showDeleteModal.value = false;
      deleteTargetId.value = null;
    } catch {
      // `useFormHandler` already shows the toast.
    } finally {
      deletingFileId.value = null;
    }
  };

  return {
    projectFiles,
    deletingFileId,
    showDeleteModal,
    deleteTargetFile,
    canDelete,
    docsForCategory,
    load,
    requestDelete,
    cancelDelete,
    remove,
    deleteMessage: confirmDeleteDocumentMessage,
  };
}
