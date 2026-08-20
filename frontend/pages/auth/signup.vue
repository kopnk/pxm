<script setup lang="ts">
/**
 * URL simetris dengan /auth/signin — halaman form ada di /users/signup.
 */
definePageMeta({
  layout: false,
});

await navigateTo("/users/signup", { replace: true });
</script>

<template>
  <div />
</template>
