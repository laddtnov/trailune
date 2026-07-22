<div class="ambient-background" aria-hidden="true">
  <div class="blob accent"></div>
  <div class="blob teal"></div>
</div>

<style>
  .ambient-background {
    position: fixed;
    inset: 0;
    overflow: hidden;
    z-index: -1;
    pointer-events: none;
  }

  .blob {
    position: absolute;
    width: 420px;
    height: 420px;
    border-radius: 50%;
    filter: blur(70px);
    opacity: 0.22;
    animation: ambient-drift 18s ease-in-out infinite alternate;
  }

  .blob.accent {
    background: var(--color-accent);
    top: -140px;
    left: -100px;
  }

  .blob.teal {
    background: var(--color-teal);
    bottom: -160px;
    right: -120px;
    animation-duration: 22s;
    animation-delay: -6s;
  }

  @keyframes ambient-drift {
    0% {
      transform: translate(0, 0) scale(1);
    }
    50% {
      transform: translate(40px, 30px) scale(1.08);
    }
    100% {
      transform: translate(-30px, 20px) scale(0.96);
    }
  }
</style>
