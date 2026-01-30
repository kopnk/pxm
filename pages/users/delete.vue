<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "~/stores/auth";

const route = useRoute();
const router = useRouter();
const store = useAuthStore();

onMounted(async () => {
  const id = route.query.id;

  if (!id) {
    return router.push("/users/list");
  }

  const confirmDelete = confirm("Confirm user deletion?");
  if (!confirmDelete) {
    return router.push("/users/list");
  }

  try {
    const res = await store.deleteUser(Number(id));
  } catch (err) {
    console.error("User deletion failed:", err);
  }

  router.push("/users/list");
});
</script>
