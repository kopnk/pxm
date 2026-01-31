<template>
  <div class="app-wrapper">
    <Header />

    <main class="main-scroll">
      <slot />
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.app-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden; /* ⛔ body tidak scroll */
}

/* HEADER STICKY */
.navbar {
  position: sticky;
  top: 0;
  z-index: 1100;
}

/* FOOTER STICKY */
footer {
  position: sticky;
  bottom: 0;
  z-index: 1100;
}

/* CONTENT SCROLL AREA */
.main-scroll {
  flex: 1;
  overflow: auto; /* ✅ scroll vertikal & horizontal */
  padding: 1rem 1.25rem;
  background: #fafafa;
}
</style>
