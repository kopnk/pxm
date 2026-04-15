import { ref } from "vue"
import { useNotify } from "@/composables/useNotify"

export const useFormHandler = () => {
  const loading = ref(false)
  const notify = useNotify()

  const extractErrorMessage = (err: any) => {
    const fieldErrors = err?.data?.data?.fieldErrors
    if (fieldErrors && typeof fieldErrors === "object") {
      const firstEntry = Object.entries(fieldErrors).find(
        ([, value]) => Array.isArray(value) && value.length > 0
      ) as [string, string[]] | undefined

      if (firstEntry) {
        const [field, messages] = firstEntry
        return `${field}: ${messages[0]}`
      }
    }

    return (
      err?.data?.message ||
      err?.statusMessage ||
      err?.message ||
      "Operation failed"
    )
  }

  const handle = async (
    action: () => Promise<void>,
    successMessage = "Success"
  ) => {
    if (loading.value) return

    try {
      loading.value = true
      await action()
      notify.success(successMessage)
    } catch (err: any) {
      notify.error(extractErrorMessage(err))
      throw err
    } finally {
      loading.value = false
    }
  }

  return { loading, handle }
}