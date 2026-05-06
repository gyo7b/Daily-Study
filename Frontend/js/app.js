/*
  app.js
  ------
  Ponto de entrada da aplicação.
  Inicializa os módulos e registra todos os event listeners.

  Regra importante: este arquivo não contém lógica de negócio.
  Ele apenas conecta eventos da UI com os módulos corretos.

  Ordem de carregamento dos scripts no HTML:
    storage.js → profile.js → posts.js → ui.js → search.js → app.js
*/

document.addEventListener('DOMContentLoaded', () => {

  // ── Inicialização ────────────────────────────────────────────
  // Carrega os dados salvos e renderiza o estado inicial da página.

  Profile.syncUI();      // exibe nome, avatar e banner do perfil
  Posts.renderFeed();    // exibe os posts salvos no feed
  Posts.updateStats();   // exibe o total de posts e dias ativos


  // ── Navegação entre abas ─────────────────────────────────────
  // Qualquer elemento com data-tab ativa a aba correspondente.
  // Cobre: .rail-btn (desktop) e .bottom-btn (mobile).

  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => UI.activateTab(btn.dataset.tab));
  });

  // O avatar do compose também navega para o perfil ao ser clicado
  document.getElementById('composeAva').addEventListener('click', () => {
    UI.activateTab('profile');
  });


  // ── Criar post ───────────────────────────────────────────────

  const postInput = document.getElementById('postInput');
  const btnPost   = document.getElementById('btnPost');

  // Habilita o botão "Publicar" só quando há texto
  postInput.addEventListener('input', () => {
    Posts.updateCharCounter('charCount', postInput, 500);
    btnPost.disabled = postInput.value.trim().length === 0;
  });

  // Atalho de teclado: Ctrl+Enter ou Cmd+Enter publica o post
  postInput.addEventListener('keydown', event => {
    const isSaveShortcut = (event.ctrlKey || event.metaKey) && event.key === 'Enter';
    if (isSaveShortcut && !btnPost.disabled) {
      event.preventDefault();
      Posts.handlePublish();
    }
  });

  btnPost.addEventListener('click', () => Posts.handlePublish());


  // ── Imagem no compose ────────────────────────────────────────

  document.getElementById('imgInput').addEventListener('change', event => {
    const file = event.target.files[0];
    if (file) Posts.handleImageSelect(file);
  });

  document.getElementById('removeImgBtn').addEventListener('click', () => {
    Posts.clearPendingImage();
  });


  // ── Modal de edição ──────────────────────────────────────────

  const editTextarea = document.getElementById('editTa');

  editTextarea.addEventListener('input', () => {
    Posts.updateCharCounter('editCount', editTextarea, 500);
  });

  // Salva com o botão ou com Ctrl+Enter
  document.getElementById('modalSaveBtn').addEventListener('click', () => Posts.handleSaveEdit());

  editTextarea.addEventListener('keydown', event => {
    const isSaveShortcut = (event.ctrlKey || event.metaKey) && event.key === 'Enter';
    if (isSaveShortcut) {
      event.preventDefault();
      Posts.handleSaveEdit();
    }
  });

  document.getElementById('modalCancelBtn').addEventListener('click', () => UI.closeModal());
  document.getElementById('modalCloseBtn').addEventListener('click',  () => UI.closeModal());

  // Clique no fundo escuro fecha o modal
  document.getElementById('modalBackdrop').addEventListener('click', event => {
    if (event.target === document.getElementById('modalBackdrop')) {
      UI.closeModal();
    }
  });

  // ESC fecha o modal e o lightbox
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      UI.closeModal();
      UI.closeLightbox();
    }
  });


  // ── Lightbox ─────────────────────────────────────────────────

  document.getElementById('lightboxClose').addEventListener('click', () => UI.closeLightbox());

  document.getElementById('lightbox').addEventListener('click', event => {
    if (event.target === document.getElementById('lightbox')) {
      UI.closeLightbox();
    }
  });


  // ── Editar perfil ────────────────────────────────────────────

  document.getElementById('btnEditP').addEventListener('click',     () => Profile.openEditForm());
  document.getElementById('btnCancelEdit').addEventListener('click', () => Profile.closeEditForm());
  document.getElementById('btnSaveEdit').addEventListener('click',   () => Profile.saveEditForm());

  // Enter no campo de nome salva o formulário
  document.getElementById('eName').addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      Profile.saveEditForm();
    }
  });


  // ── Upload de avatar ─────────────────────────────────────────

  // Clique no avatar grande abre o seletor de arquivo
  document.getElementById('profileAvaBig').addEventListener('click', () => {
    document.getElementById('avatarInput').click();
  });

  document.getElementById('avatarInput').addEventListener('change', event => {
    const file = event.target.files[0];
    if (file) Profile.handleImageUpload(file, 'avatar');
    event.target.value = '';  // permite selecionar o mesmo arquivo novamente
  });


  // ── Upload de banner ─────────────────────────────────────────

  // Clique na zona do banner abre o seletor de arquivo
  document.getElementById('bannerZone').addEventListener('click', event => {
    // Evita abrir o seletor se o clique foi direto no input (não deve acontecer, mas por segurança)
    if (event.target.tagName !== 'INPUT') {
      document.getElementById('bannerInput').click();
    }
  });

  document.getElementById('bannerInput').addEventListener('change', event => {
    const file = event.target.files[0];
    if (file) Profile.handleImageUpload(file, 'banner');
    event.target.value = '';
  });

  // Drag & drop no banner: arraste uma imagem direto para a área
  const bannerZone = document.getElementById('bannerZone');

  bannerZone.addEventListener('dragover', event => {
    event.preventDefault();  // necessário para permitir o drop
    bannerZone.classList.add('drag-over');
  });

  bannerZone.addEventListener('dragleave', () => {
    bannerZone.classList.remove('drag-over');
  });

  bannerZone.addEventListener('drop', event => {
    event.preventDefault();
    bannerZone.classList.remove('drag-over');

    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      Profile.handleImageUpload(file, 'banner');
    } else if (file) {
      UI.showToast('Por favor, solte apenas imagens.', 'err');
    }
  });


  // ── Busca inline no feed ─────────────────────────────────────

  const feedSearchInput = document.getElementById('feedSearchInput');
  const feedSearchBox   = document.getElementById('feedSearchBox');
  const feedSearchClear = document.getElementById('feedSearchClear');

  feedSearchInput.addEventListener('input', () => {
    const query = feedSearchInput.value;

    // Mostra/esconde o botão ✕ conforme há texto ou não
    feedSearchBox.classList.toggle('has-value', query.length > 0);

    if (query.trim()) {
      // Busca ativa: esconde o compose e filtra os posts
      document.getElementById('compose').classList.add('hidden');
      filterFeedPosts(query);
    } else {
      // Busca vazia: restaura o estado normal do feed
      document.getElementById('compose').classList.remove('hidden');
      document.getElementById('feedSearchCount').classList.add('hidden');
      Posts.renderFeed();
    }
  });

  // Botão ✕ limpa a busca do feed
  feedSearchClear.addEventListener('click', () => {
    feedSearchInput.value = '';
    feedSearchBox.classList.remove('has-value');
    document.getElementById('compose').classList.remove('hidden');
    document.getElementById('feedSearchCount').classList.add('hidden');
    Posts.renderFeed();
    feedSearchInput.focus();
  });

  // Filtra os posts do feed com base na query e atualiza o contador.
  // Estratégia: renderiza todos os posts e remove os que não batem.
  function filterFeedPosts(query) {
    // Aguarda 320ms (ligeiramente acima do debounce de 300ms do Search)
    // para garantir que a busca já terminou antes de renderizar
    setTimeout(() => {
      const results   = Search.searchPosts(query);
      const feedEl    = document.getElementById('feedList');
      const emptyEl   = document.getElementById('feedEmpty');
      const countEl   = document.getElementById('feedSearchCount');

      // Atualiza o contador
      const count = results.length;
      countEl.textContent = count === 0
        ? 'Nenhum post encontrado'
        : `${count} post${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''}`;
      countEl.classList.remove('hidden');

      if (count === 0) {
        feedEl.innerHTML = '';
        emptyEl.classList.remove('hidden');
        emptyEl.querySelector('h3').textContent = 'Nenhum resultado';
        emptyEl.querySelector('p').textContent  = `Nenhum post contém "${query}".`;
        return;
      }

      emptyEl.classList.add('hidden');

      // Renderiza todos os posts e remove os que não estão nos resultados
      Posts.renderFeed();
      const matchingIds = new Set(results.map(r => r.post.id));
      document.querySelectorAll('#feedList [data-id]').forEach(postEl => {
        if (!matchingIds.has(postEl.dataset.id)) {
          postEl.remove();
        }
      });

    }, 320);
  }


  // ── Aba de busca ─────────────────────────────────────────────

  const searchMainInput = document.getElementById('searchMainInput');
  const searchMainBox   = document.getElementById('searchMainBox');
  const searchMainClear = document.getElementById('searchMainClear');

  searchMainInput.addEventListener('input', () => {
    const query = searchMainInput.value;
    searchMainBox.classList.toggle('has-value', query.length > 0);
    Search.handleSearchInput(query);
  });

  // Botão ✕ limpa a busca principal
  searchMainClear.addEventListener('click', () => {
    searchMainInput.value = '';
    searchMainBox.classList.remove('has-value');
    Search.clearSearch();
    searchMainInput.focus();
  });

  // Ao abrir a aba de busca, foca no campo automaticamente
  document.querySelectorAll('[data-tab="search"]').forEach(btn => {
    btn.addEventListener('click', () => {
      setTimeout(() => searchMainInput.focus(), 100);
    });
  });

  // Chips de sugestão: ao clicar, preenchem o campo e disparam a busca
  document.querySelectorAll('.search-suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.dataset.query;

      searchMainInput.value = query;
      searchMainBox.classList.add('has-value');
      Search.handleSearchInput(query);
      searchMainInput.focus();
    });
  });

}); // fim do DOMContentLoaded
