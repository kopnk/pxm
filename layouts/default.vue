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

/* FOOTER STICKY */
footer {
  position: sticky;
  bottom: 0;
  z-index: 1100;
}

/* CONTENT SCROLL AREA — z-index di bawah navbar agar dropdown tidak ketimpa */
.main-scroll {
  flex: 1;
  position: relative;
  z-index: 0;
  overflow: auto;
  padding: 1rem 1.25rem;
  background: #fafafa;
}
</style>
