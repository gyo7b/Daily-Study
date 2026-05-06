/*
  ui.js
  -----
  Controla os estados globais de interface que não pertencem
  a um módulo específico:
  - Sistema de abas (Feed, Buscar, Perfil)
  - Modal de edição de post
  - Toast de notificação temporária
  - Lightbox de imagem em tela cheia

  Não depende de outros módulos, mas Posts e Profile dependem dele.
*/

const UI = (() => {

  // ── Abas ─────────────────────────────────────────────────────

  // Ativa uma aba pelo nome ('feed', 'search' ou 'profile').
  // Atualiza: painéis, botões da rail e botões da bottom-bar.
  function activateTab(tabName) {
    // Mostra o painel correto, esconde os outros
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });

    // Marca o botão correto como ativo na navegação
    document.querySelectorAll('[data-tab]').forEach(btn => {
      const isActive = btn.dataset.tab === tabName;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    // Ao abrir o perfil, re-renderiza os posts e atualiza estatísticas
    if (tabName === 'profile') {
      Posts.renderProfilePosts();
      Posts.updateStats();
    }
  }


  // ── Modal ─────────────────────────────────────────────────────

  // Abre o modal de edição e bloqueia o scroll da página.
  function openModal() {
    document.getElementById('modalBackdrop').classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Foca no textarea após a animação de entrada (250ms)
    setTimeout(() => {
      document.getElementById('editTa').focus();
    }, 260);
  }

  // Fecha o modal e restaura o scroll da página.
  function closeModal() {
    document.getElementById('modalBackdrop').classList.add('hidden');
    document.body.style.overflow = '';
  }


  // ── Toast ─────────────────────────────────────────────────────

  // Timer para remover o toast automaticamente
  let toastTimer = null;

  // Exibe uma notificação temporária na parte inferior da tela.
  // type: '' (neutro/escuro) | 'ok' (verde) | 'err' (vermelho)
  function showToast(message, type = '', duration = 2800) {
    const toast = document.getElementById('toast');

    // Cancela o timer anterior se o toast ainda estiver visível
    if (toastTimer) clearTimeout(toastTimer);

    toast.textContent = message;
    toast.className   = `toast show ${type}`.trim();

    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      toastTimer = null;
    }, duration);
  }


  // ── Lightbox ──────────────────────────────────────────────────

  // Exibe uma imagem em tela cheia.
  function openLightbox(imageSrc) {
    document.getElementById('lightboxImg').src = imageSrc;
    document.getElementById('lightbox').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('lightboxClose').focus();
  }

  // Fecha o lightbox.
  function closeLightbox() {
    document.getElementById('lightbox').classList.add('hidden');
    document.getElementById('lightboxImg').src = '';
    document.body.style.overflow = '';
  }


  // ── API pública ──────────────────────────────────────────────

  return {
    activateTab,
    openModal,
    closeModal,
    showToast,
    openLightbox,
    closeLightbox,
  };

})();
