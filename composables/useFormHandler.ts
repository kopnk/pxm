import { nextTick, ref } from "vue"
import { useNotify } from "@/composables/useNotify"
import { readApiSuccessMessage } from "@/lib/apiEnvelope"

export const useFormHandler = () => {
  const loading = ref(false)
  const notify = useNotify()
  const fieldErrorClass = "is-invalid"
  const fieldErrorSelector = "[data-form-field-error]"

  const getFieldErrors = (err: any) => {
    const fieldErrors = err?.data?.data?.fieldErrors
    if (fieldErrors && typeof fieldErrors === "object") {
      return fieldErrors as Record<string, string[]>
    }

    return null
  }

  const extractFirstFieldError = (err: any) => {
    const fieldErrors = getFieldErrors(err)
    if (fieldErrors) {
      const firstEntry = Object.entries(fieldErrors).find(
        ([, value]) => Array.isArray(value) && value.length > 0
      ) as [string, string[]] | undefined

      if (firstEntry) {
        const [field, messages] = firstEntry
        return `${field}: ${messages[0]}`
      }
    }

    return null
  }

  const extractErrorMessage = (err: any) => {
    const fieldError = extractFirstFieldError(err)
    if (fieldError) return fieldError

    return (
      err?.data?.message ||
      err?.statusMessage ||
      err?.message ||
      "Operation failed"
    )
  }

  const normalizeText = (value: string) =>
    value
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .trim()
      .toLowerCase()

  const fieldCandidates = (field: string) => {
    const normalized = normalizeText(field)
    const lastWord = normalized.split(" ").filter(Boolean).at(-1)

    return [
      field,
      field.replace(/\./g, "\\."),
      field.replace(/[.[\]]+/g, "_"),
      field.replace(/[.[\]]+/g, "-"),
      normalized,
      lastWord || "",
    ].filter(Boolean)
  }

  const escapeSelector = (value: string) =>
    typeof CSS !== "undefined" && CSS.escape
      ? CSS.escape(value)
      : value.replace(/["\\]/g, "\\$&")

  const findFieldByLabel = (field: string) => {
    const candidates = new Set(fieldCandidates(field).map(normalizeText))
    const labels = Array.from(document.querySelectorAll("label"))

    for (const label of labels) {
      const labelText = normalizeText(label.textContent || "")
      if (!labelText) continue

      const matches = Array.from(candidates).some(
        (candidate) =>
          labelText === candidate ||
          labelText.includes(candidate) ||
          candidate.includes(labelText),
      )

      if (!matches) continue

      const control =
        label.htmlFor
          ? document.getElementById(label.htmlFor)
          : label.parentElement?.querySelector(
              "input:not([type='hidden']), select, textarea",
            )

      if (control instanceof HTMLElement) return control
    }

    return null
  }

  const clearRenderedFieldErrors = () => {
    if (typeof document === "undefined") return

    document.querySelectorAll(fieldErrorSelector).forEach((element) => {
      element.remove()
    })

    document
      .querySelectorAll<HTMLElement>(`.${fieldErrorClass}`)
      .forEach((element) => {
        element.classList.remove(fieldErrorClass)
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement
        ) {
          element.setCustomValidity("")
        }
      })
  }

  const findFieldElement = (field: string) => {
    const selectors = fieldCandidates(field).flatMap((candidate) => [
      `[name="${escapeSelector(candidate)}"]`,
      `#${escapeSelector(candidate)}`,
      `[data-field="${escapeSelector(candidate)}"]`,
    ])

    return (
      selectors
        .map((selector) => document.querySelector<HTMLElement>(selector))
        .find(Boolean) ||
      findFieldByLabel(field) ||
      null
    )
  }

  const renderFieldError = (
    target: HTMLElement,
    message: string | undefined,
  ) => {
    if (!message) return

    target.classList.add(fieldErrorClass)

    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement
    ) {
      target.setCustomValidity(message)
      target.addEventListener("input", () => target.setCustomValidity(""), {
        once: true,
      })
      target.addEventListener("change", () => target.setCustomValidity(""), {
        once: true,
      })
    }

    const feedback = document.createElement("div")
    feedback.className = "invalid-feedback d-block"
    feedback.dataset.formFieldError = "true"
    feedback.textContent = message

    const container = target.closest(".col, [class*='col-'], .mb-3") || target.parentElement
    container?.appendChild(feedback)
  }

  const renderFieldErrors = async (err: any) => {
    const fieldErrors = getFieldErrors(err)
    if (!fieldErrors || typeof document === "undefined") return

    await nextTick()
    clearRenderedFieldErrors()

    Object.entries(fieldErrors).forEach(([field, messages]) => {
      const target = findFieldElement(field)
      if (!target) return

      renderFieldError(target, Array.isArray(messages) ? messages[0] : undefined)
    })
  }

  const focusField = async (field: string) => {
    if (typeof document === "undefined") return

    await nextTick()

    const target = findFieldElement(field)

    target?.scrollIntoView({ behavior: "smooth", block: "center" })
    target?.focus({ preventScroll: true })
  }

  const focusFirstFieldError = async (err: any) => {
    const fieldErrors = getFieldErrors(err)
    const field = fieldErrors
      ? Object.entries(fieldErrors).find(
          ([, value]) => Array.isArray(value) && value.length > 0,
        )?.[0]
      : null

    if (field) await focusField(field)
  }

  const isValidationError = (err: any) => {
    const statusCode = Number(err?.data?.statusCode ?? err?.statusCode ?? 0)
    return Boolean(getFieldErrors(err)) || statusCode === 400
  }

  const handle = async (
    action: () => Promise<unknown>,
    successMessage = "Success"
  ) => {
    if (loading.value) return

    try {
      loading.value = true
      clearRenderedFieldErrors()
      const result = await action()
      notify.success(readApiSuccessMessage(result) || successMessage)
      return result
    } catch (err: any) {
      notify.error(extractErrorMessage(err))
      void renderFieldErrors(err)
      void focusFirstFieldError(err)
      if (!isValidationError(err)) {
        throw err
      }
    } finally {
      loading.value = false
    }
  }

  return { loading, handle }
}
